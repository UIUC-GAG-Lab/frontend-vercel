import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import useModalClose from '../../hooks/useModalClose';

export default function TestNotesModal({ isOpen, onClose, run, onSave }) {
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { handleBackdropClick } = useModalClose({ isOpen, onClose });

  useEffect(() => {
    if (isOpen && run) {
      setNotes(run.notes || '');
    }
  }, [isOpen, run]);

  if (!isOpen || !run) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(run.trial_id, notes);
      onClose();
    } catch (error) {
      console.error('Failed to save notes', error);
      alert('Failed to save notes. Please try again.');
    } finally {
      setIsSaving(false);
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
            Notes for {run.trial_name}
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
          <textarea
            className="w-full h-48 p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
            placeholder="Add your notes here..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
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
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
      </div>
    </div>
  );
}
