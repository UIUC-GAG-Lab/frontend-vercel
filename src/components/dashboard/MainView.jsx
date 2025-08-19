import React from 'react';
import HomePage from '../sections/Home';
import CreatePage from '../sections/CreateTest';
import SettingsPage from '../sections/Settings';

export default function MainView({ activePage, setActivePage, addLog, mqttConnected }) {
  return (
    <div className="flex-grow overflow-y-auto p-6">
      {activePage === 'home' && <HomePage addLog={addLog} mqttConnected={mqttConnected} />}
      {activePage === 'create' && <CreatePage addLog={addLog} setActivePage={setActivePage} mqttConnected={mqttConnected} />}
      {activePage === 'settings' && <SettingsPage />}
    </div>
  );
}
