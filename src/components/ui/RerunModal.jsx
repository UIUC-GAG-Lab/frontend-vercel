import React, { useState } from 'react';
import { X, Play } from 'lucide-react';
import useModalClose from '../../hooks/useModalClose';

const PROCESS_STAGES = [
  { id: 1, name: 'Stage 1: NaOH Transfer (Automated)' },
  { id: 2, name: 'Stage 2: Preparation (Manual)' },
  { id: 3, name: 'Stage 3: Transfer (Automated/Manual)' },
  { id: 4, name: 'Stage 4: Aluminum Analysis' },
  { id: 5, name: 'Stage 5: Silicon Analysis' },
];

export default function RerunModal({ isOpen, onClose, run, onConfirmRerun }) {
  const [selectedStage, setSelectedStage] = useState(1);
  const [isStarting, setIsStarting] = useState(false);
  const { handleBackdropClick } = useModalClose({ isOpen, onClose });

  if (!isOpen || !run) return null;

  const handleConfirm = async () => {
    setIsStarting(true);
    try {
      await onConfirmRerun(run, selectedStage);
      onClose();
    } catch (error) {
      console.error('Failed to start test rerun:', error);
      alert('Failed to start test rerun. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Rerun Test: {run.trial_name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Select the stage from which you would like to resume the test. Make sure the physical environment (samples, containers) is prepared for the selected stage.
          </p>
          
          <div className="flex items-center justify-center my-8 overflow-x-auto p-4">
            <div className="flex items-center space-x-4">
              {PROCESS_STAGES.map((stage, index) => {
                const isSelected = selectedStage === stage.id;
                const isBeforeSelected = stage.id < selectedStage;
                const isLast = index === PROCESS_STAGES.length - 1;

                // Extract short name
                const shortName = stage.name.split(':')[1]?.trim() || stage.name;

                return (
                  <div key={stage.id} className="flex items-center">
                    {/* Stage Item */}
                    <div 
                      className="flex flex-col items-center text-center cursor-pointer group"
                      onClick={() => setSelectedStage(stage.id)}
                    >
                      {/* Icon Container */}
                      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                        isSelected ? 'bg-blue-100 border-blue-500 ring-4 ring-blue-50' :
                        isBeforeSelected ? 'bg-gray-100 border-gray-300 opacity-60' :
                        'bg-white border-gray-300 hover:border-blue-300'
                      }`}>
                        <div className={`w-3 h-3 rounded-full transition-colors ${
                          isSelected ? 'bg-blue-600' : 
                          isBeforeSelected ? 'bg-gray-400' : 
                          'bg-gray-300 group-hover:bg-blue-400'
                        }`}></div>
                      </div>
                      
                      {/* Stage Info */}
                      <div className="mt-2 w-24">
                        <div className={`text-xs font-medium transition-colors ${
                          isSelected ? 'text-blue-600' :
                          isBeforeSelected ? 'text-gray-400' :
                          'text-gray-500 group-hover:text-blue-500'
                        }`}>
                          Stage {stage.id}
                        </div>
                        <div className={`text-xs capitalize mt-1 leading-tight transition-colors ${
                          isSelected ? 'text-blue-800 font-medium' :
                          isBeforeSelected ? 'text-gray-400' :
                          'text-gray-600 group-hover:text-gray-900'
                        }`}>
                          {shortName}
                        </div>
                        <div className="text-xs text-gray-400 mt-1 h-4">
                          {isSelected && 'Resume Here'}
                          {isBeforeSelected && 'Skip'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Connector Line */}
                    {!isLast && (
                      <div className="w-12 h-0.5 mx-3">
                        <div className={`w-full h-full transition-all duration-300 ${isBeforeSelected ? 'bg-gray-200' : 'bg-blue-200'}`}></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isStarting}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <Play className="w-4 h-4 mr-2" />
            {isStarting ? 'Starting...' : 'Confirm Rerun'}
          </button>
        </div>
      </div>
    </div>
  );
}
