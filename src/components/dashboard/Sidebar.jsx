import React from 'react';
import { Home, PlusCircle, Settings, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Navbar({ activePage, setActivePage }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const navItems = [
    { name: 'home', icon: <Home />, label: 'Home' },
    { name: 'create', icon: <PlusCircle />, label: 'Create' },
    { name: 'settings', icon: <Settings />, label: 'Settings' },
    { name: 'help', icon: <HelpCircle />, label: 'Help' }
  ];

  return (
    <div className={`bg-gray-900 text-white h-full transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'} flex flex-col`}>
      <button onClick={() => setCollapsed(!collapsed)} className="p-3 text-left">
        {collapsed ? <ChevronRight /> : <ChevronLeft />}
      </button>
      {navItems.map((item) => (
        <button
          key={item.name}
          onClick={() => setActivePage(item.name)}
          className={`flex items-center gap-2 p-3 text-sm hover:bg-gray-700 ${activePage === item.name ? 'bg-gray-800' : ''}`}
        >
          {item.icon}
          {!collapsed && item.label}
        </button>
      ))}
    </div>
  );
}