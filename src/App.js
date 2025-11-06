// App.jsx
import React, { useState, useEffect } from 'react';
import Navbar from './components/dashboard/Sidebar';
import MainView from './components/dashboard/MainView';
import Console from './components/dashboard/Console';
import mqttService from './mqtt/mqttservice'; // Import the service

export default function App() {
  const [activePage, setActivePage] = useState('home'); 
  const [logs, setLogs] = useState([]);
  const [mqttConnected, setMqttConnected] = useState(false);

  const addLog = (log) => setLogs((prev) => [...prev, log]);

  // Initialize MQTT connection once at app level
  useEffect(() => {
    const initializeMQTT = async () => {
      try {
        await mqttService.connect(); //lets wait until i get promise
        addLog('MQTT connection established');
      } catch (error) {
        addLog(`MQTT connection failed: ${error.message}`);
      }
    };

    initializeMQTT();

    // Check connection status periodically
    const checkConnection = () => {
      setMqttConnected(mqttService.isConnected);
    };
    
    const interval = setInterval(checkConnection, 1000);
    
    return () => {
      clearInterval(interval);
      // Don't disconnect here - let it persist
    };
  }, []);

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
              mqttConnected={mqttConnected}
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