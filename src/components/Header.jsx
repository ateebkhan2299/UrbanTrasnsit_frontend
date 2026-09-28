import React from 'react';
import LiveSyncIndicator from './LiveSyncIndicator';
import NotificationBell from './NotificationBell';
import GlobalRouteSelector from './GlobalRouteSelector';
import ThemeToggle from './ui/ThemeToggle';
import { useTheme } from '../context/ThemeContext';

const Header = ({ title, subtitle, selectedRouteId, onSelectRoute, actions }) => {
  const { isLightMode } = useTheme();

  return (
    <header className={`flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b transition-colors gap-4 ${
      isLightMode ? 'border-slate-200' : 'border-[#2A2A2A]'
    }`}>
      <div>
        <h2 className={`text-2xl font-black tracking-tight ${
          isLightMode ? 'text-slate-900' : 'text-white'
        }`}>{title}</h2>
        {subtitle && <p className={`text-xs mt-1 ${
          isLightMode ? 'text-slate-500' : 'text-slate-400'
        }`}>{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        {actions}
        <GlobalRouteSelector
          selectedRouteId={selectedRouteId}
          onSelectRoute={onSelectRoute}
        />
        <LiveSyncIndicator />
        <ThemeToggle />
        <NotificationBell />
      </div>
    </header>
  );
};

export default Header;
