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
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
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
          
          <div className="space-y-3">
            {PROCESS_STAGES.map((stage) => (
              <label 
                key={stage.id} 
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${selectedStage === stage.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <input
                  type="radio"
                  name="rerunStage"
                  value={stage.id}
                  checked={selectedStage === stage.id}
                  onChange={() => setSelectedStage(stage.id)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-3 text-sm font-medium text-gray-900">
                  {stage.name}
                </span>
              </label>
            ))}
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
