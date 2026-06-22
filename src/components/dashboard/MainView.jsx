import React from 'react';
// import HomePage from '../sections/Home';
import HomeV2 from '../sections/HomeV2';
import SettingsPage from '../sections/Settings';
import ImageAnalysisPage from '../sections/ImageAnalysis';

export default function MainView({ activePage, setActivePage, addLog, mqttConnected, refreshTrigger }) {
  return (
    <div className="flex-grow overflow-y-auto p-6">
      {/* {activePage === 'home' && <HomePage addLog={addLog} mqttConnected={mqttConnected} />} */}
      {activePage === 'home' && <HomeV2 addLog={addLog} mqttConnected={mqttConnected} refreshTrigger={refreshTrigger} />}
      {activePage === 'image-analysis' && <ImageAnalysisPage />}
      {activePage === 'settings' && <SettingsPage />}
    </div>
  );
}
