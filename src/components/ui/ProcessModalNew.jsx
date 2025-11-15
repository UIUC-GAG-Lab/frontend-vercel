import React, { useEffect, useState, useRef } from 'react';
import mqttService from '../../mqtt/mqttservice';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import UR2Stepper from './UR2Stepper';

const IMAGE_TOPIC = 'ur2/test/image';
const IMAGE_RAW_TOPIC = 'ur2/test/image/raw';

// Add isInterrupted prop to control UI when process is stopped by user
const ProcessModal = ({
  isOpen,
  onClose,
  currentStage,
  stages,
  currentCycle = 1,
  title = "Process Running",
  isInterrupted = false,
  onStageChange
}) => {
  const [aluminumImageUrl, setAluminumImageUrl] = useState(null);
  const [siliconImageUrl, setSiliconImageUrl] = useState(null);
  const [latestImageMeta, setLatestImageMeta] = useState(null);
  const [aluminumResults, setAluminumResults] = useState([]);
  const [siliconResults, setSiliconResults] = useState([]);
  const [viewingStage, setViewingStage] = useState(currentStage); // For navigation
  const [heatConfirmed, setHeatConfirmed] = useState(false);
  const [stirringConfirmed, setStirringConfirmed] = useState(false);
  const [waitStartTime, setWaitStartTime] = useState(null);
  const [remainingTime, setRemainingTime] = useState(600); // 10 minutes in seconds

  // Handle heating confirmation
  const handleHeatConfirmed = () => {
    setHeatConfirmed(true);
    // Send MQTT message to backend/fake RPI
    if (mqttService?.client?.connected) {
      mqttService.client.publish('ur2/manual/heat_confirmed', JSON.stringify({
        timestamp: new Date().toISOString(),
        temperature: 90
      }));
    }
  };

  // Handle stirring confirmation
  const handleStirringConfirmed = () => {
    setStirringConfirmed(true);
    setWaitStartTime(Date.now());
    // Send MQTT message to backend/fake RPI
    if (mqttService?.client?.connected) {
      mqttService.client.publish('ur2/manual/stirring_confirmed', JSON.stringify({
        timestamp: new Date().toISOString(),
        rpm: 0.56,
        wait_minutes: 10
      }));
    }
  };

  // Countdown timer for 10-minute wait
  useEffect(() => {
    if (!waitStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - waitStartTime) / 1000);
      const remaining = Math.max(0, 600 - elapsed);
      setRemainingTime(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        // Optionally notify backend that wait is complete
        if (mqttService?.client?.connected) {
          mqttService.client.publish('ur2/manual/wait_complete', JSON.stringify({
            timestamp: new Date().toISOString()
          }));
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [waitStartTime]);

  // Update viewing stage when current stage changes
  useEffect(() => {
    setViewingStage(currentStage);
  }, [currentStage]);

  // keep a ref so we don't re-subscribe on every meta change
  const latestImageMetaRef = useRef(null);
  useEffect(() => {
    latestImageMetaRef.current = latestImageMeta;
  }, [latestImageMeta]);

  useEffect(() => { 
    if (!isOpen || !mqttService?.isConnected || !mqttService?.client) return;

    const handleMessage = (topic, message) => {
      try {
        if (topic === IMAGE_TOPIC) {
          const meta = JSON.parse(message.toString());
          setLatestImageMeta(meta);
          
          // Append data to appropriate result array based on solution_type
          if (meta.solution_type === 'al') {
            setAluminumResults(prevResults => [...prevResults, meta]);
          } else if (meta.solution_type === 'si') {
            setSiliconResults(prevResults => [...prevResults, meta]);
          }
        } else if (topic === IMAGE_RAW_TOPIC && latestImageMetaRef.current) {
          const blob = new Blob([message], { type: 'image/png' });
          const url = URL.createObjectURL(blob);
          
          // Determine which image box to update based on solution_type
          const solution_type = latestImageMetaRef.current.solution_type;
          if (solution_type === 'al') {
            setAluminumImageUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return url;
            });
          } else if (solution_type === 'si') {
            setSiliconImageUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return url;
            });
          } else {
            // If solution_type is not specified or unknown, clean up the URL
            URL.revokeObjectURL(url);
          }
        }
      } catch {
        // ignore parsing errors
      }
    };

    mqttService.client.subscribe(IMAGE_TOPIC);
    mqttService.client.subscribe(IMAGE_RAW_TOPIC);
    mqttService.client.on('message', handleMessage);

    return () => {
      try {
        mqttService.client.removeListener('message', handleMessage);
      } catch {}
      setLatestImageMeta(null);
      if (aluminumImageUrl) URL.revokeObjectURL(aluminumImageUrl);
      if (siliconImageUrl) URL.revokeObjectURL(siliconImageUrl);
    };
    // only resub when modal opens/closes or connection changes
  }, [isOpen, aluminumImageUrl, siliconImageUrl]);

  if (!isOpen) return null;

  // Progress (clamped)
  const total = Math.max(1, stages?.length ?? 1);
  const rawPct = (currentStage / total) * 100;
  const isComplete = currentStage >= total;
  const pct = Math.max(0, Math.min(100, Math.round(isComplete ? 100 : rawPct)));

  // Get current stage name for manual instructions
  const currentStageName = stages?.[viewingStage] || '';
  const isHeatStage = currentStageName === 'Heat & Stirring';
  
  // Navigation handlers
  const canGoBack = viewingStage > 0;
  const canGoForward = viewingStage < currentStage;
  
  const handlePrevStage = () => {
    if (canGoBack) {
      setViewingStage(prev => prev - 1);
    }
  };
  
  const handleNextStage = () => {
    if (canGoForward) {
      setViewingStage(prev => prev + 1);
    }
  };
  
  const handleGoToCurrentStage = () => {
    setViewingStage(currentStage);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              {currentCycle > 0 && (
                <p className="text-sm text-gray-600 mt-1">Sample {currentCycle} of 5</p>
              )}
            </div>
            {viewingStage !== currentStage && (
              <button
                onClick={handleGoToCurrentStage}
                className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200 transition-colors"
              >
                Go to Current Stage
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Stage Navigation */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <button
            onClick={handlePrevStage}
            disabled={!canGoBack}
            className={`flex items-center gap-1 px-3 py-1 rounded-md transition-colors ${
              canGoBack 
                ? 'text-blue-600 hover:bg-blue-50' 
                : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Previous</span>
          </button>
          
          <div className="text-sm text-gray-600">
            Viewing: <span className="font-semibold">{stages?.[viewingStage] || 'N/A'}</span>
            {viewingStage !== currentStage && (
              <span className="ml-2 text-xs text-blue-600">(History)</span>
            )}
          </div>
          
          <button
            onClick={handleNextStage}
            disabled={!canGoForward}
            className={`flex items-center gap-1 px-3 py-1 rounded-md transition-colors ${
              canGoForward 
                ? 'text-blue-600 hover:bg-blue-50' 
                : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            <span className="text-sm">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 min-h-0">
          
          {/* Manual Instructions for Heat & Stirring Stage */}
          {isHeatStage && viewingStage === currentStage && !isComplete && (
            <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Manual Instructions Required</h3>
              
              {!heatConfirmed && (
                <div className="mb-4">
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>Step 1:</strong> Heat the NaOH solution to 90°C
                  </p>
                  <button
                    onClick={handleHeatConfirmed}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    ✓ Heating Complete (90°C Reached)
                  </button>
                </div>
              )}
              
              {heatConfirmed && !stirringConfirmed && (
                <div className="mb-4">
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>Step 2:</strong> Add 0.02g of cement into the heated NaOH solution
                  </p>
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>Step 3:</strong> Start stirring until reaching 0.56 rpm
                  </p>
                  <p className="text-xs text-blue-700 mb-3">
                    ⏱️ System will wait 10 minutes after stirring starts
                  </p>
                  <button
                    onClick={handleStirringConfirmed}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    ✓ Stirring Started (0.56 rpm)
                  </button>
                </div>
              )}
              
              {heatConfirmed && stirringConfirmed && (
                <div className="mb-4 text-center">
                  <div className="inline-flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-green-700">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-700"></div>
                      <span className="text-sm font-medium">Waiting for dissolution...</span>
                    </div>
                    <div className="text-2xl font-bold text-green-800">
                      {Math.floor(remainingTime / 60)}:{String(remainingTime % 60).padStart(2, '0')}
                    </div>
                    <p className="text-xs text-green-600">minutes remaining</p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Results and Images Container */}
          <div className="grid grid-cols-2 gap-8 h-full min-h-0">
            
            {/* Concentration Results - Left Side */}
            <div className="flex flex-col min-h-0">
              <h3 className="text-lg font-medium text-gray-700 mb-4">Concentration Results</h3>
              <div className="flex-1 min-h-0 overflow-hidden">
                {Math.max(aluminumResults.length, siliconResults.length) === 0 ? (
                  <div className="text-gray-400 text-sm py-8 text-center">
                    No results yet...
                  </div>
                ) : (
                  <div className="overflow-y-auto h-full">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white">
                        <tr className="border-b-2 border-gray-200">
                          <th className="text-left py-3 font-semibold text-gray-700">Sample</th>
                          <th className="text-left py-3 font-semibold text-gray-700">Aluminum (μM)</th>
                          <th className="text-left py-3 font-semibold text-gray-700">Silicon (μM)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: Math.max(aluminumResults.length, siliconResults.length) }, (_, index) => {
                          const alData = aluminumResults[index];
                          const siData = siliconResults[index];
                          const sampleNumber = index + 1;
                          
                          const formatConcentration = (value) => {
                            return value != null ? parseFloat(value).toFixed(3) : 'N/A';
                          };
                          
                          return (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 text-gray-700 font-medium">{sampleNumber}</td>
                              <td className="py-3 text-gray-600">{formatConcentration(alData?.concentration)}</td>
                              <td className="py-3 text-gray-600">{formatConcentration(siData?.concentration)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            
            {/* Images - Right Side */}
            <div className="flex flex-col min-h-0">
              <h3 className="text-lg font-medium text-gray-700 mb-4 text-center">Images from RPI</h3>
              <div className="flex-1 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                  
                  {/* Aluminum Image */}
                  <div className="flex flex-col items-center">
                    <div className="text-xs text-gray-500 mb-2">Aluminum</div>
                    {aluminumImageUrl ? (
                      <img
                        src={aluminumImageUrl}
                        alt="Aluminum Analysis"
                        className="w-full max-w-32 object-contain"
                        style={{ height: 'auto', maxHeight: '200px' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="w-32 h-40 bg-gray-50 border border-dashed border-gray-300 flex flex-col items-center justify-center text-xs text-gray-400 rounded"
                      style={{ display: aluminumImageUrl ? 'none' : 'flex' }}
                    >
                      
                      <div className="text-center">
                        {aluminumImageUrl ? 'Image N/A' : 'Waiting for Image...'}
                      </div>
                    </div>
                  </div>

                  {/* Silicon Image */}
                  <div className="flex flex-col items-center">
                    <div className="text-xs text-gray-500 mb-2">Silicon</div>
                    {siliconImageUrl ? (
                      <img
                        src={siliconImageUrl}
                        alt="Silicon Analysis"
                        className="w-full max-w-32 object-contain"
                        style={{ height: 'auto', maxHeight: '200px' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="w-32 h-40 bg-gray-50 border border-dashed border-gray-300 flex flex-col items-center justify-center text-xs text-gray-400 rounded"
                      style={{ display: siliconImageUrl ? 'none' : 'flex' }}
                    >
                      <div className="text-center">
                        {siliconImageUrl ? 'Image N/A' : 'Waiting for Image...'}
                      </div>
                    </div>
                  </div>
                  
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Content */}
        <div className="p-6 flex-shrink-0">

          {/* Stepper */}
          <div className="mb-6 flex justify-center">
            <div className="w-full max-w-4xl">
              <UR2Stepper
                stages={stages}
                currentStage={currentStage}
                isInterrupted={isInterrupted}
              />
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProcessModal;
