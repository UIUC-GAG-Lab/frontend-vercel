import React from 'react';
import HomePage from '../sections/Home';
import CreatePage from '../sections/CreateTest';
import SettingsPage from '../sections/Settings';

export default function MainView({ activePage, setActivePage, addLog }) {
  return (
    <div className="flex-grow overflow-y-auto p-6">
      {activePage === 'home' && <HomePage addLog={addLog} />}
      {activePage === 'create' && <CreatePage addLog={addLog} setActivePage={setActivePage} />}
      {activePage === 'settings' && <SettingsPage />}
    </div>
  );
}
