import React, { useState, useEffect } from 'react';
import TopFilter from '../ui/TopFilter';
import { Activity, Eye, Copy, Trash2 } from 'lucide-react';

function ResultsTable({ runs = [], handleStatus, handleView, handleRerun, handleDelete }) {
    // Helper function for colored status badges
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

    // Helper function to format the timestamp
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
                            <th className="px-6 py-4">Date & Time &darr;</th>
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
                            runs.map((run) => {
                                const { date, time } = formatDateTime(run.created_at || new Date());
                                const shortId = run.trial_id ? `#${String(run.trial_id).padStart(5, '0')}` : 'N/A';
                                
                                return (
                                    <tr key={run.trial_id} className="hover:bg-gray-50 transition-colors group">
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
                                                <button onClick={() => handleRerun && handleRerun(run)} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-md transition-colors" title="Rerun Test">
                                                    <Copy className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => handleDelete && handleDelete(run)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-md transition-colors" title="Delete Test">
                                                    <Trash2 className="w-3.5 h-3.5" />
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
        </div>
    );
}

export default function HomeV2({ addLog, mqttConnected }) {
    // 1. Give the component memory to store the database data
    const [runs, setRuns] = useState([]);
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

    // 2. Fetch the real data from PostgreSQL when the page loads
    useEffect(() => {
        const fetchRuns = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/runs`);
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                setRuns(data);
            } catch (error) {
                console.error('Error fetching runs:', error);
                addLog && addLog(`Error fetching runs: ${error.message}`);
            }
        };
        fetchRuns();
    }, [addLog]);

    // 3. Define the action handlers so the buttons don't crash the app
    const handleStatus = (run) => {
        console.log('Status clicked for:', run.trial_name);
        addLog && addLog(`Viewing status for: ${run.trial_name}`);
    };
    const handleView = (run) => {
        console.log('View clicked for:', run.trial_name);
        addLog && addLog(`Viewing details for: ${run.trial_name}`);
    };
    const handleRerun = (run) => {
        console.log('Rerun clicked for:', run.trial_name);
        addLog && addLog(`Rerunning test: ${run.trial_name}`);
    };
    const handleDelete = (run) => {
        console.log('Delete clicked for:', run.trial_name);
        addLog && addLog(`Deleting test: ${run.trial_name}`);
    };

    const handleFilterChange = () => {};

    const handleExport = () => {
        addLog && addLog('Export CSV requested');
    };

    return (
        <div className="p-2">
            <TopFilter 
                onFilterChange={handleFilterChange} 
                onExport={handleExport} 
            />

            <ResultsTable 
                runs={runs} 
                handleStatus={handleStatus} 
                handleView={handleView} 
                handleRerun={handleRerun} 
                handleDelete={handleDelete} 
            />
        </div>
    );
}