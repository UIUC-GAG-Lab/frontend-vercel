import React, { useState, useEffect, useCallback, useMemo } from 'react';
import TopFilter from '../ui/TopFilter';
import { Activity, Eye, FileText, Trash2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import TestNotesModal from '../ui/TestNotesModal';
import RerunModal from '../ui/RerunModal';
import TestDetailsModal from '../ui/TestDetailsModal';
import ProcessModalNew from '../ui/ProcessModalNew';
import mqttService from '../../mqtt/mqttservice';

// ── Inline toast for user feedback ──────────────────────────────────────────
function Toast({ message, type, onDismiss }) {
    if (!message) return null;
    const bg = type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-green-600' : 'bg-blue-600';
    return (
        <div className={`${bg} text-white text-sm px-4 py-2 rounded-md shadow-lg flex items-center justify-between gap-4 animate-slide-in`}>
            <span>{message}</span>
            <button onClick={onDismiss} className="text-white/80 hover:text-white font-bold text-lg leading-none">&times;</button>
        </div>
    );
}

// ── Results Table ───────────────────────────────────────────────────────────
function ResultsTable({ runs = [], handleStatus, handleView, handleNotes, handleDelete, deletingId }) {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 7;
    
    useEffect(() => {
        setCurrentPage(1);
    }, [runs.length]);

    const renderStatusBadge = (status) => {
        const s = (status || 'pending').toLowerCase();
        let colors = 'bg-gray-100 text-gray-700';
        let dot = 'bg-gray-500';
        let label = 'Pending';

        if (s === 'completed') { colors = 'bg-green-100 text-green-700'; dot = 'bg-green-500'; label = 'Completed'; }
        else if (s === 'stopped' || s === 'error') { colors = 'bg-orange-100 text-orange-700'; dot = 'bg-orange-500'; label = 'Stopped'; }
        else if (s === 'failed') { colors = 'bg-red-100 text-red-700'; dot = 'bg-red-500'; label = 'Failed'; }
        else if (s === 'running' || s === 'started') { colors = 'bg-blue-100 text-blue-700'; dot = 'bg-blue-500'; label = 'Running'; }

        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border border-gray-200 ${colors}`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dot}`}></span>
                {label}
            </span>
        );
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return { date: 'N/A', time: '' };
        const d = new Date(dateString);
        return {
            date: d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
            time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        };
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 mt-3 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white border-b border-gray-200 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                            <th className="px-6 py-4">Test Name</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Test ID &darr;</th>
                            <th className="px-6 py-4">Date &amp; Time &darr;</th>
                            <th className="px-6 py-4">Operator</th>
                            <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {runs.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                    No test runs found. Create your first test run to get started.
                                </td>
                            </tr>
                        ) : (
                            runs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((run) => {
                                const { date, time } = formatDateTime(run.created_at || run.timestamp || new Date());
                                const shortId = run.trial_id ? `#${String(run.trial_id).padStart(5, '0')}` : 'N/A';
                                const isDeleting = deletingId === run.trial_id;

                                return (
                                    <tr key={run.trial_id} className={`hover:bg-gray-50 transition-colors group ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <td className="px-6 py-4 font-medium text-gray-900">{run.trial_name}</td>
                                        <td className="px-6 py-4">{renderStatusBadge(run.run_status)}</td>
                                        <td className="px-6 py-4 text-gray-500">{shortId}</td>
                                        <td className="px-6 py-4 text-gray-500">
                                            <div className="flex flex-col">
                                                <span>{date}</span>
                                                <span className="text-xs text-gray-400 mt-0.5">{time}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 uppercase">{run.trial_operator || 'KV'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleStatus && handleStatus(run)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-md transition-colors">
                                                    <Activity className="w-3.5 h-3.5" />
                                                    Status
                                                </button>
                                                <button onClick={() => handleView && handleView(run)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-md transition-colors">
                                                    <Eye className="w-3.5 h-3.5" />
                                                    View
                                                </button>
                                                <button 
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleNotes(run);
                                                  }}
                                                  className="p-2 text-yellow-600 bg-yellow-50/50 hover:bg-yellow-100/50 border border-transparent hover:border-yellow-200 rounded-lg transition-all" 
                                                  title="Test Notes"
                                                >
                                                  <FileText className="w-4 h-4" />
                                                </button>
                                                <button 
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete && handleDelete(run);
                                                  }}
                                                  disabled={isDeleting}
                                                  className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-md transition-colors disabled:opacity-50" 
                                                  title="Delete Test"
                                                >
                                                    {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            {runs.length > itemsPerPage && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
                    <div className="text-sm text-gray-500">
                        Showing {Math.min((currentPage - 1) * itemsPerPage + 1, runs.length)} to {Math.min(currentPage * itemsPerPage, runs.length)} of {runs.length} results
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="p-1 rounded-md border border-gray-300 disabled:opacity-50 hover:bg-gray-50 text-gray-600 flex items-center justify-center"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-sm font-medium text-gray-700 min-w-[5rem] text-center">
                            Page {currentPage} of {Math.ceil(runs.length / itemsPerPage)}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(runs.length / itemsPerPage)))}
                            disabled={currentPage === Math.ceil(runs.length / itemsPerPage)}
                            className="p-1 rounded-md border border-gray-300 disabled:opacity-50 hover:bg-gray-50 text-gray-600 flex items-center justify-center"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main HomeV2 Component ───────────────────────────────────────────────────
export default function HomeV2({ addLog, mqttConnected, refreshTrigger }) {
    const [runs, setRuns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);

    const [showNotesModal, setShowNotesModal] = useState(false);
    const [selectedNoteRun, setSelectedNoteRun] = useState(null);
    const [showRerunModal, setShowRerunModal] = useState(false);
    const [selectedRerun, setSelectedRerun] = useState(null);
    
    // States for View and Status modals
    const [selectedRun, setSelectedRun] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [currentProcessStage, setCurrentProcessStage] = useState(0);
    const [processStages] = useState([
        'NaOH Transfer',
        'Preparation',
        'Transfer',
        'Aluminum',
        'Silicon',
    ]);
    const [testResults, setTestResults] = useState({ aluminum: [], silicon: [], dissolution: [] });

    // Toast notification
    const [toast, setToast] = useState({ message: '', type: '' });
    const showToast = useCallback((message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast({ message: '', type: '' }), 4000);
    }, []);

    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

    // ── Fetch runs (reusable) ───────────────────────────────────────────
    const fetchRuns = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_BASE_URL}/runs`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            setRuns(data);
        } catch (error) {
            console.error('Error fetching runs:', error);
            addLog && addLog(`Error fetching runs: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [API_BASE_URL, addLog]);

    // Fetch on mount
    useEffect(() => {
        fetchRuns();
    }, [fetchRuns]);

    // Re-fetch whenever refreshTrigger changes (e.g. after creating a test)
    useEffect(() => {
        if (refreshTrigger > 0) {
            fetchRuns();
        }
    }, [refreshTrigger, fetchRuns]);

    // Check for newly created test that should show process modal
    // Runs on an interval so it picks up window.activeTestInfo set by CreateTestModal
    useEffect(() => {
        const check = () => {
            if (window.activeTestInfo && window.activeTestInfo.showProcessModal) {
                // Set selectedRun so handleStatus logic runs
                setSelectedRun({
                    trial_id: window.activeTestInfo.testId,
                    trial_name: window.activeTestInfo.trialName
                });
                setCurrentProcessStage(0);
                setShowProcessModal(true);
                addLog && addLog(`Showing process modal for newly created test: ${window.activeTestInfo.testId}`);
                window.activeTestInfo = null;
            }
        };
        check(); // run immediately on mount
        const interval = setInterval(check, 200);
        return () => clearInterval(interval);
    }, [addLog]);

    // ── Handlers ────────────────────────────────────────────────────────
    const handleStatus = (run) => {
        addLog && addLog(`Viewing status for: ${run.trial_name}`);
        setSelectedRun(run);
        
        switch (run.run_status?.toLowerCase()) {
            case 'completed':
                setCurrentProcessStage(processStages.length);
                break;
            case 'running':
                setCurrentProcessStage(2);
                break;
            case 'failed':
            case 'error':
            case 'stopped':
                setCurrentProcessStage(1);
                break;
            default:
                setCurrentProcessStage(0);
        }
        setShowProcessModal(true);
    };
    
    const handleView = (run) => {
        addLog && addLog(`Viewing details for: ${run.trial_name}`);
        setSelectedRun(run);
        setShowDetailsModal(true);
    };
    
    const handleCloseProcessModal = () => {
        setShowProcessModal(false);
        setSelectedRun(null);
        setCurrentProcessStage(0);
    };

    const handleCloseDetailsModal = () => {
        setShowDetailsModal(false);
        setSelectedRun(null);
    };

    const handleRerun = (run) => {
        setSelectedRerun(run);
        setShowRerunModal(true);
    };

    const handleConfirmRerun = async (run, startStage) => {
        addLog && addLog(`Rerunning test: ${run.trial_name} from stage ${startStage}`);
        if (mqttConnected) {
            const success = mqttService.sendStartCommand(run.trial_id, startStage);
            if (success) {
                addLog && addLog(`Sent start command to RPI for test: ${run.trial_id} from stage ${startStage}`);
                setShowProcessModal(false);
            } else {
                addLog && addLog(`Failed to send start command`);
            }
        } else {
            addLog && addLog(`Cannot start test - MQTT not connected`);
        }
    };
    
    const handleDelete = async (run) => {
        if (!window.confirm(`Are you sure you want to delete "${run.trial_name}"? This cannot be undone.`)) {
            return;
        }
        
        setDeletingId(run.trial_id);
        addLog && addLog(`Deleting test: ${run.trial_name}...`);
        
        try {
            const response = await fetch(`${API_BASE_URL}/runs/${run.trial_id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Server returned ${response.status}: ${errorBody}`);
            }
            
            // Remove from local state immediately
            setRuns(prevRuns => prevRuns.filter(r => r.trial_id !== run.trial_id));
            addLog && addLog(`Successfully deleted test: ${run.trial_name}`);
            showToast(`"${run.trial_name}" deleted successfully`, 'success');
        } catch (error) {
            console.error('Error deleting run:', error);
            addLog && addLog(`Error deleting test: ${error.message}`);
            showToast(`Failed to delete: ${error.message}`, 'error');
            // Re-fetch to make sure we're in sync with the server
            fetchRuns();
        } finally {
            setDeletingId(null);
        }
    };

    const handleNotes = (run) => {
        setSelectedNoteRun(run);
        setShowNotesModal(true);
    };

    const handleCloseNotesModal = () => {
        setShowNotesModal(false);
        setSelectedNoteRun(null);
    };

    const handleSaveNotes = async (testId, notes) => {
        setRuns(prevRuns => prevRuns.map(r => 
            r.trial_id === testId ? { ...r, notes } : r
        ));
        addLog && addLog(`Notes saved for test ${testId}`);
    };

    const [filters, setFilters] = useState({ query: '', status: 'all', startDate: '', endDate: '', operator: '' });

    const handleFilterChange = useCallback((newFilters) => {
        setFilters(newFilters);
    }, []);

    const filteredRuns = useMemo(() => {
        return runs.filter((run) => {
            let match = true;
            if (filters.query) {
                const queryLower = filters.query.toLowerCase();
                match = match && (run.trial_name?.toLowerCase().includes(queryLower) || String(run.trial_id).includes(queryLower));
            }
            if (filters.status && filters.status !== 'all') {
                match = match && run.run_status?.toLowerCase() === filters.status.toLowerCase();
            }
            if (filters.operator) {
                match = match && run.trial_operator?.toLowerCase().includes(filters.operator.toLowerCase());
            }
            if (filters.startDate) {
                const runDate = new Date(run.created_at || run.timestamp).toISOString().slice(0, 10);
                match = match && runDate >= filters.startDate;
            }
            if (filters.endDate) {
                const runDate = new Date(run.created_at || run.timestamp).toISOString().slice(0, 10);
                match = match && runDate <= filters.endDate;
            }
            return match;
        });
    }, [runs, filters]);

    const handleExport = () => {
        addLog && addLog('Export CSV requested');
    };

    return (
        <div className="p-2 relative">
            {/* Toast notification */}
            <div className="fixed top-4 right-4 z-[100]">
                <Toast message={toast.message} type={toast.type} onDismiss={() => setToast({ message: '', type: '' })} />
            </div>

            <TopFilter 
                onFilterChange={handleFilterChange} 
                onExport={handleExport} 
            />

            {isLoading && runs.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
                    <span className="text-gray-500">Loading tests...</span>
                </div>
            ) : (
                <ResultsTable 
                    runs={filteredRuns} 
                    handleStatus={handleStatus} 
                    handleView={handleView} 
                    handleRerun={handleRerun} 
                    handleNotes={handleNotes}
                    handleDelete={handleDelete}
                    deletingId={deletingId}
                />
            )}

            <TestNotesModal
                isOpen={showNotesModal}
                onClose={handleCloseNotesModal}
                run={selectedNoteRun}
                onSave={handleSaveNotes}
            />

            <RerunModal
                isOpen={showRerunModal}
                onClose={() => setShowRerunModal(false)}
                run={selectedRerun}
                onConfirmRerun={handleConfirmRerun}
            />

            <TestDetailsModal
                isOpen={showDetailsModal}
                onClose={handleCloseDetailsModal}
                run={selectedRun ? { ...selectedRun, results: selectedRun.results || testResults } : null}
            />

            <ProcessModalNew
                isOpen={showProcessModal}
                onClose={handleCloseProcessModal}
                currentStage={currentProcessStage}
                currentCycle={1}
                stages={processStages}
                title={selectedRun ? `Test Status - ${selectedRun.trial_name}` : "Test Status"}
                isInterrupted={selectedRun && ["failed", "error", "stopped"].includes((selectedRun.run_status || '').toLowerCase())}
                waitingCameraPreview={false}
                waitingCleaning={false}
                activeTestId={selectedRun?.trial_id}
                onResultsUpdate={(results) => setTestResults(results)}
                onConfirmRerun={(stage) => handleConfirmRerun(selectedRun, stage)}
            />
        </div>
    );
}