import React, { useState } from 'react';

export default function Console({ logs, onClose }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  if (isCollapsed) {
    return (
      <div className="bg-gray-100 border-t border-gray-300">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-medium text-gray-700">Console</span>
          <button
            onClick={toggleCollapse}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            ▲ Expand
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border-t border-gray-300 h-48">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-300">
        <span className="text-sm font-medium text-gray-700">Console</span>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleCollapse}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            ▼ Collapse
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-red-600 text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>
      </div>
      
      {/* Console content */}
      <div className="text-gray-800 text-sm p-3 overflow-y-auto h-40 font-mono">
        {logs && logs.length > 0 ? (
          logs.map((log, index) => (
            <div key={index}>
              {log}
            </div>
          ))
        ) : (
          <div className="text-gray-500 italic">No logs to display</div>
        )}
      </div>
    </div>
  );
}