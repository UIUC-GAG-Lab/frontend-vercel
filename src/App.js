// App.jsx
import React, { useState, useEffect } from 'react';
import Navbar from './components/dashboard/Sidebar';
import MainView from './components/dashboard/MainView';
import Console from './components/dashboard/Console';
import Login from './components/auth/Login';
import mqttService from './mqtt/mqttservice'; // Import the service

export default function App() {
  const [activePage, setActivePage] = useState('home'); 
  const [logs, setLogs] = useState([]);
  const [mqttConnected, setMqttConnected] = useState(false);
  const [user, setUser] = useState(() => {
    // Check localStorage for existing session
    const savedUser = localStorage.getItem('ur2_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const addLog = (log) => setLogs((prev) => [...prev, log]);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('ur2_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('ur2_user');
    setActivePage('home');
  };

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

  // Show login page if not authenticated
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      
      <div className="flex-1 flex overflow-hidden">
        <Navbar 
          activePage={activePage}
          setActivePage={setActivePage}
          user={user}
          onLogout={handleLogout}
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