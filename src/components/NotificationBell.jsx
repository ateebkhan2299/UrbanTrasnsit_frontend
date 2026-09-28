import React, { useEffect, useState, useRef } from 'react';
import { Bell, AlertTriangle, AlertOctagon, Info, CheckCircle } from 'lucide-react';
import { getNotifications } from '../api/client';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    getNotifications(false)
      .then((res) => setNotifications(res.data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'Critical':
        return 'bg-rose-950 text-rose-400 border-rose-800';
      case 'High':
        return 'bg-amber-950 text-amber-400 border-amber-800';
      case 'Medium':
        return 'bg-cyan-950 text-cyan-400 border-cyan-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-500 text-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 glass-card bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl p-3 z-50">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="font-bold text-sm text-white">Pipeline System Alerts</span>
            <span className="text-xs text-cyan-400">{unreadCount} Unread</span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {notifications.map((item) => (
              <div
                key={item.id}
                className={`p-2.5 rounded-lg border transition ${
                  item.is_read ? 'bg-slate-800/40 border-slate-800/60 opacity-75' : 'bg-slate-800/90 border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(item.severity)}`}>
                    {item.severity}
                  </span>
                  <span className="text-[10px] text-slate-400">{item.created_at}</span>
                </div>
                <p className="text-xs text-slate-200 mb-1">{item.message}</p>
                {item.route_name && (
                  <span className="text-[10px] font-semibold text-cyan-400">Route: {item.route_name}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
