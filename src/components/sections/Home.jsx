import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, FileText, RefreshCw } from 'lucide-react';
import TestRunCard from '../ui/TestRunCard';
import TestDetailsModal from '../ui/TestDetailsModal';
import ProcessModal from '../ui/ProcessModal';

import mqttService from '../../mqtt/mqttservice';

export default function HomePage({ addLog }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [currentProcessStage, setCurrentProcessStage] = useState(0);  
  const [mqttConnected, setMqttConnected] = useState(false); // Add MQTT connection state
  const [activeTests, setActiveTests] = useState(new Map()); // Track active tests and their current stages
  const hasFetchedRuns = useRef(false); // Track if runs have been fetched
  
  const [processStages] = useState([
    'Sample Preparation',
    'Dissolution', 
    'Filtration',
    'Dilution',
    'Sampling',
    'Color Agent Addition',
    'Data Analysis',
  ]);

  // Function to update run status in database
  const updateRunStatus = async (testId, run_status, run_stage) => {
    try {
      const response = await fetch(`http://localhost:5000/runs/${testId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trial_id: testId, run_status: run_status, run_stage: parseInt(run_stage)}),
      });


      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      addLog && addLog(`Successfully updated run status for test ${testId} to: ${run_status}`);
      return true;
    } catch (error) {
      console.error('Error updating run status:', error);
      addLog && addLog(`Error updating run status for test ${testId}: ${error.message}`);
      return false;
    }
  };

  ////////////////////////////////////////////////////////////////////////////////
  // Setup MQTT connection on component mount
  useEffect(() => {
    console.log('Setting up MQTT connection to HiveMQ Cloud...');
    mqttService.connect(); 
    const checkConnection = () => {
      setMqttConnected(mqttService.isConnected);
    };
    const interval = setInterval(checkConnection, 1000);
    
    return () => {
      clearInterval(interval);
      mqttService.disconnect();
    };
  }, []); // Empty dependency array - run only once on mount !imp
////////////////////////////////////////////////////////////////////////////////
  // Separate useEffect for setting up stage update callback
  useEffect(() => {
    // Set up stage update callback
    mqttService.setStageUpdateCallback(async (data) => {
  
      const testId = data.testId;
      const run_status = data.run_status;
      const run_stage = data.run_stage;

      addLog && addLog(`Stage update received: Test ${testId}, Status ${run_status}, Stage ${run_stage}`);

      // status can be "started", "stage_completed", "completed", "already_running", "stopped"
      
      if (run_status === 'completed') { //when test is fully completed
        setActiveTests(prev => {
          const newMap = new Map(prev);
          newMap.delete(testId);
          return newMap;
        });
        
        // Update run status in database
        await updateRunStatus(testId, run_status, run_stage);
        
        // Update runs status
        setRuns(prevRuns => 
          prevRuns.map(run => 
            run.trial_id === testId 
              ? { ...run, run_status: run_status }
              : run
          )
        );
        
        // If this test is currently being viewed, update modal
        if (selectedRun && selectedRun.trial_id === testId && showProcessModal) {
          setCurrentProcessStage(processStages.length);
        }
      } 
      else if (run_status === 'failed' || run_status === 'error') { //when test fails
        setActiveTests(prev => {
          const newMap = new Map(prev);
          newMap.delete(testId);
          return newMap;
        });
        
        // Update run status in database
        await updateRunStatus(testId, run_status, run_stage);

        // Update runs status
        setRuns(prevRuns => 
          prevRuns.map(run => 
            run.trial_id === testId 
              ? { ...run, run_status: run_status }
              : run
          )
        );
        
        // If this test is currently being viewed, update modal
        if (selectedRun && selectedRun.trial_id === testId && showProcessModal) {
          setCurrentProcessStage(parseInt(run_stage)); // Indicate error state
        }
      }
      else { // When a stage from current test is completed
        const stageNumber = parseInt(run_stage);
        setActiveTests(prev => {
          const newMap = new Map(prev);
          newMap.set(testId, {
            currentStage: stageNumber,
            timestamp: new Date().toISOString()
          });
          return newMap;
        });

        console.log(`updating stage to ${run_stage} for test id =${testId}`)
        await updateRunStatus(testId, run_status, run_stage);

        // Update runs status to running
        setRuns(prevRuns => 
          prevRuns.map(run => 
            run.trial_id === testId 
              ? { ...run, run_status: run_status }
              : run
          )
        );
        
        // If this test is currently being viewed, update modal
        if (selectedRun && selectedRun.trial_id === testId && showProcessModal) {
          setCurrentProcessStage(stageNumber);
        }
      }
    });
  }, [selectedRun, showProcessModal, processStages.length, addLog, updateRunStatus]);


  const fetchRuns = useCallback(async () => {
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5000/runs');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setRuns(data);
      
    } catch (error) {
      console.error('Error fetching runs:', error);
      setError(error.message);
      // Use a ref or move addLog call outside the callback to avoid dependency
      if (addLog) {
        addLog(`Error fetching test runs: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remove addLog dependency to prevent re-creation

  useEffect(() => {
    // Only fetch runs if not already fetched
    if (!hasFetchedRuns.current) {
      fetchRuns();
      hasFetchedRuns.current = true;
    }
  }, [fetchRuns]);

  const handleView = (run) => {
    addLog && addLog(`Viewing run: ${run.trial_name} (${run.trial_id})`);
    console.log('Selected run:', run);
    setSelectedRun(run);
    setShowDetailsModal(true);
  };

  // Updated handleRerun to send MQTT command
  const handleRerun = async (run) => {
    addLog && addLog(`Rerunning test: ${run.trial_name} (${run.trial_id})`);

    // // Immediately update UI state to show "started" status
    // setRuns(prevRuns => 
    //   prevRuns.map(prevRun => 
    //     prevRun.trial_id === run.trial_id 
    //       ? { ...prevRun, run_status: 'started' }
    //       : prevRun
    //   )
    // );s

    // // Update run status to 'started' in database (stage 0 = starting)
    // await updateRunStatus(run.trial_id, 'started', 0);
   
    if (mqttConnected) {
      const success = mqttService.sendStartCommand(run.trial_id);  // Send start command to RPI via MQTT
      if (success) {
        addLog && addLog(`Sent start command to RPI for test: ${run.trial_id}`);
      } else {
        addLog && addLog(`Failed to send start command`);
        
      }
    } else {
      addLog && addLog(`Cannot start test - MQTT not connected`);
      
    }
  };


  const handleStatus = (run) => {
    addLog && addLog(`Viewing status for: ${run.trial_name} (${run.trial_id})`);
    setSelectedRun(run);
    
    // Check if we have real-time data for this test
    const activeTestData = activeTests.get(run.trial_id);
    
    if (activeTestData) {
      // Use real-time stage data
      setCurrentProcessStage(activeTestData.currentStage);
    } else {
      // Simulate process stage based on run status
      switch (run.run_status?.toLowerCase()) {
        case 'completed':
          setCurrentProcessStage(processStages.length); // All stages completed
          break;
        case 'running':
          setCurrentProcessStage(3); // Currently in dissolution process
          break;
        case 'failed':
          setCurrentProcessStage(2); // Failed during solution addition
          break;
        default:
          setCurrentProcessStage(0); // First stage is active
      }
    }
    
    setShowProcessModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedRun(null);
  };

  const handleCloseProcessModal = () => {
    setShowProcessModal(false);
    setSelectedRun(null);
  };

  const handleRefresh = () => {
    addLog && addLog('Refreshing test runs...');
    fetchRuns();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading test runs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 mb-4">
          <FileText className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Test Runs</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-200 flex items-center mx-auto"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* <div className="mb-6">
        <h1 className="text-gray-600 mb-2">View and manage your previous test runs</h1>
      </div> */}
      <div className="mb-4 p-3 rounded-lg flex items-center bg-gray-50">
        <div className={`w-3 h-3 rounded-full mr-2 ${mqttConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-sm text-gray-600">
          MQTT: {mqttConnected ? 'Connected' : 'Disconnected'}
        </span>
        {mqttConnected && (
          <span className="ml-4 text-xs text-green-600">
            Device ready
          </span>
        )}
        {activeTests.size > 0 && (
          <span className="ml-4 text-xs text-blue-600">
            {activeTests.size} active test{activeTests.size > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {runs.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Play className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No test runs yet</h3>
          <p className="text-gray-500">Create your first test run to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {runs.map((run) => (
            <TestRunCard
              key={run.trial_id}
              run={run}
              onView={handleView}
              onRerun={handleRerun}
              onStatus={handleStatus}
              isActive={activeTests.has(run.trial_id)}
              currentStage={activeTests.get(run.trial_id)?.currentStage}
            />
          ))}
        </div>
      )}

      {/* Test Details Modal */}
      <TestDetailsModal
        isOpen={showDetailsModal}
        onClose={handleCloseModal}
        run={selectedRun}
      />

      {/* Process Status Modal */}
      <ProcessModal
        isOpen={showProcessModal}
        onClose={handleCloseProcessModal}
        currentStage={currentProcessStage}
        stages={processStages}
        title={selectedRun ? `Test Status - ${selectedRun.trial_name}` : "Test Status"}
      />
    </div>
  );
}
