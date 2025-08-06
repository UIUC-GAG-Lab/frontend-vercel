// App.jsx
import React, { useState } from 'react';
import Navbar from './components/dashboard/Sidebar';

import MainView from './components/dashboard/MainView';
import Console from './components/dashboard/Console';

export default function App() {
  const [activePage, setActivePage] = useState('home'); 
  const [logs, setLogs] = useState([]);

  const addLog = (log) => setLogs((prev) => [...prev, log]);

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      
      <div className="flex-1 flex overflow-hidden">
        <Navbar 
          activePage={activePage}
          setActivePage={setActivePage}
        />
        
        <div className="flex-1 flex flex-col min-w-0">
          
          <header className="px-6 py-4">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-2xl font-bold text-gray-900">
                UR2 Device Interface
              </h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto bg-gray-50">
            <MainView 
              activePage={activePage}
              setActivePage={setActivePage}
              addLog={addLog}
            />
          </div>
          
          <Console 
            logs={logs}
            addLog={addLog}
          />
        </div>
      </div>
    </div>
  );
}