import React, { useState } from 'react';
import { User, FileText, Hash, RotateCcw, Send } from 'lucide-react';
import ProcessModal from '../ui/ProcessModal';

export default function CreatePage({ addLog, setActivePage }) {
  const [formData, setFormData] = useState({
    trialName: '',
    userName: '',
    sampleSize: '',
    cementAdded: false,
    syringeFiltersSwapped: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [currentProcessStage, setCurrentProcessStage] = useState(0);

  const processStages = [
    'initializing',
    'dissolving',
    'filtrating',
    'diluting',
    'dyeing',
    'analyzing',
    'preparing results'
  ];

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.trialName.trim()) {
      newErrors.trialName = 'Trial name is required';
    }
    
    if (!formData.userName.trim()) {
      newErrors.userName = 'Your name is required';
    }
    
    if (!formData.sampleSize.trim()) {
      newErrors.sampleSize = 'Sample size is required';
    } else if (isNaN(formData.sampleSize) || parseFloat(formData.sampleSize) <= 0) {
      newErrors.sampleSize = 'Sample size must be a positive number';
    }
    
    if (!formData.cementAdded) {
      newErrors.cementAdded = 'Please confirm if cement was added';
    }
    
    if (!formData.syringeFiltersSwapped) {
      newErrors.syringeFiltersSwapped = 'Please confirm if syringe filters were swapped';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };
  
  const simulateProcessStages = async () => {
    addLog && addLog('Starting process simulation...');

    // Simulate each stage with delays
    for (let i = 0; i < processStages.length; i++) {
      setCurrentProcessStage(i); // Set current running stage
      addLog && addLog(`Stage ${i + 1} started: ${processStages[i]}`);
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay for each stage
      
      setCurrentProcessStage(i + 1); // Mark stage as completed
      addLog && addLog(`Stage ${i + 1} completed: ${processStages[i]}`);
    }
    
    addLog && addLog('All stages completed successfully!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      addLog && addLog('Form validation failed. Please check the required fields.');
      return;
    }

    setIsSubmitting(true);
    
    // Show the process modal immediately when Create Test is clicked
    setShowProcessModal(true);
    setCurrentProcessStage(0);
    
    try {
      // Start the process simulation
      await simulateProcessStages();

      const response = await fetch('http://localhost:5000/runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trial_name: formData.trialName.trim(),
          trial_operator: formData.userName.trim(),
          sample_size: parseFloat(formData.sampleSize),
          cement_added: formData.cementAdded,
          syringe_filters_swapped: formData.syringeFiltersSwapped,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        addLog && addLog(`Test created successfully: ${formData.trialName} (ID: ${result.id || 'N/A'})`);
        
        // Navigate to Home page after process completes
        setActivePage && setActivePage('home');
        addLog && addLog('Redirected to Home page.');
        
        handleReset();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create test');
      }
    } catch (error) {
      console.error('Error submitting test:', error);
      addLog && addLog(`Error creating test: ${error.message}`);
      setShowProcessModal(false); // Close modal on error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      trialName: '',
      userName: '',
      sampleSize: '',
      cementAdded: false,
      syringeFiltersSwapped: false
    });
    setErrors({});
    setShowProcessModal(false);
    setCurrentProcessStage(0);
    addLog && addLog('Form reset successfully');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Test</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="space-y-6">
          {/* Trial Name */}
          <div>
            <label htmlFor="trialName" className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Trial Name
            </label>
            <input
              id="trialName"
              type="text"
              placeholder="Enter trial name"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.trialName ? 'border-red-300' : 'border-gray-300'
              }`}
              value={formData.trialName}
              onChange={(e) => handleInputChange('trialName', e.target.value)}
              disabled={isSubmitting}
            />
            {errors.trialName && (
              <p className="mt-1 text-sm text-red-600">{errors.trialName}</p>
            )}
          </div>

          {/* User Name */}
          <div>
            <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Your Name
            </label>
            <input
              id="userName"
              type="text"
              placeholder="Enter your name or email"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.userName ? 'border-red-300' : 'border-gray-300'
              }`}
              value={formData.userName}
              onChange={(e) => handleInputChange('userName', e.target.value)}
              disabled={isSubmitting}
            />
            {errors.userName && (
              <p className="mt-1 text-sm text-red-600">{errors.userName}</p>
            )}
          </div>

          {/* Sample Size */}
          <div>
            <label htmlFor="sampleSize" className="block text-sm font-medium text-gray-700 mb-2">
              <Hash className="w-4 h-4 inline mr-1" />
              Cement Sample Size (grams)
            </label>
            <input
              id="sampleSize"
              type="number"
              step="0.001"
              placeholder="Enter sample size (e.g., 0.025)"
              min="0.001"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.sampleSize ? 'border-red-300' : 'border-gray-300'
              }`}
              value={formData.sampleSize}
              onChange={(e) => handleInputChange('sampleSize', e.target.value)}
              disabled={isSubmitting}
            />
            {errors.sampleSize && (
              <p className="mt-1 text-sm text-red-600">{errors.sampleSize}</p>
            )}
          </div>

          {/* Cement Added Checkbox */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.cementAdded}
                onChange={(e) => handleInputChange('cementAdded', e.target.checked)}
                disabled={isSubmitting}
                className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                  errors.cementAdded ? 'border-red-300' : ''
                }`}
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Cement added? *</span>
            </label>
            {errors.cementAdded && (
              <p className="mt-1 text-sm text-red-600">{errors.cementAdded}</p>
            )}
          </div>

          {/* Syringe Filters Swapped Checkbox */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.syringeFiltersSwapped}
                onChange={(e) => handleInputChange('syringeFiltersSwapped', e.target.checked)}
                disabled={isSubmitting}
                className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                  errors.syringeFiltersSwapped ? 'border-red-300' : ''
                }`}
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Syringe filters swapped *</span>
            </label>
            {errors.syringeFiltersSwapped && (
              <p className="mt-1 text-sm text-red-600">{errors.syringeFiltersSwapped}</p>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Create Test
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={handleReset}
            disabled={isSubmitting}
            className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </button>
        </div>
      </form>

      {/* Process Modal */}
      <ProcessModal
        isOpen={showProcessModal}
        onClose={() => {
          setShowProcessModal(false);
          setCurrentProcessStage(0);
        }}
        currentStage={currentProcessStage}
        stages={processStages}
        title="Creating Test"
      />
    </div>
  );
}