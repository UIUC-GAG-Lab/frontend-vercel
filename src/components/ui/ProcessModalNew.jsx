import React, { useEffect, useState, useRef } from 'react';
import mqttService from '../../mqtt/mqttservice';
import { X, Check } from 'lucide-react';
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
  isInterrupted = false
}) => {
  const [aluminumImageUrl, setAluminumImageUrl] = useState(null);
  const [siliconImageUrl, setSiliconImageUrl] = useState(null);
  const [latestImageMeta, setLatestImageMeta] = useState(null);

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
        } else if (topic === IMAGE_RAW_TOPIC && latestImageMetaRef.current) {
          const blob = new Blob([message], { type: 'image/png' });
          const url = URL.createObjectURL(blob);
          
          // Determine which image box to update based on material
          const material = latestImageMetaRef.current.material;
          if (material === 'aluminum') {
            setAluminumImageUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return url;
            });
          } else if (material === 'silicon') {
            setSiliconImageUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return url;
            });
          } else {
            // If material is not specified or unknown, clean up the URL
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
  }, [isOpen, mqttService?.isConnected]);

  if (!isOpen) return null;

  // Progress (clamped)
  const total = Math.max(1, stages?.length ?? 1);
  const rawPct = (currentStage / total) * 100;
  const isComplete = currentStage >= total;
  const pct = Math.max(0, Math.min(100, Math.round(isComplete ? 100 : rawPct)));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-screen overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            {currentCycle > 0 && (
              <p className="text-sm text-gray-600 mt-1">Sample {currentCycle} of 5</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
            
          {/* Two Image Boxes Side by Side */}
          <div className="mb-6">
            <div className="mb-2 text-sm text-gray-600 text-center">Images from RPI</div>
            <div className="flex justify-center gap-6">
              {/* Aluminum Image Box */}
              <div className="flex flex-col items-center">
                {aluminumImageUrl ? (
                  <img
                    src={aluminumImageUrl}
                    alt="Aluminum Analysis"
                    className="w-36 h-64 object-contain bg-gray-50 rounded shadow border"
                    style={{ aspectRatio: '9/16' }}
                    onError={e => {
                      e.target.onerror = null;
                      e.target.src = "data:image/svg+xml,%3Csvg width='144' height='256' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E";
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center w-36 h-64 bg-gray-100 border rounded" style={{ aspectRatio: '9/16' }}>
                    <span className="text-gray-400 text-sm text-center">No Aluminum Image</span>
                  </div>
                )}
              </div>

              {/* Silicon Image Box */}
              <div className="flex flex-col items-center">
                {siliconImageUrl ? (
                  <img
                    src={siliconImageUrl}
                    alt="Silicon Analysis"
                    className="w-36 h-64 object-contain bg-gray-50 rounded shadow border"
                    style={{ aspectRatio: '9/16' }}
                    onError={e => {
                      e.target.onerror = null;
                      e.target.src = "data:image/svg+xml,%3Csvg width='144' height='256' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E";
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center w-36 h-64 bg-gray-100 border rounded" style={{ aspectRatio: '9/16' }}>
                    <span className="text-gray-400 text-sm text-center">No Silicon Image</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Completion Message */}
          {isComplete && !isInterrupted && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-green-800 font-medium">Process completed successfully!</span>
              </div>
            </div>
          )}

          {/* --- NEW: MUI Stepper (replaces custom UI) --- */}
          <div className="mb-8">
            <UR2Stepper
              stages={stages}
              currentStage={currentStage}
              isInterrupted={isInterrupted}
            />
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
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
