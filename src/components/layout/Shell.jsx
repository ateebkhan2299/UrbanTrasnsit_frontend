import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ThemeToggle from '../ui/ThemeToggle';
import { useToast } from '../ui';
import {
  LayoutDashboard,
  Activity,
  MapPin,
  Bus,
  Calendar,
  Users2,
  GitFork,
  Clock,
  Sparkles,
  Map,
  Lightbulb,
  Sliders,
  Database,
  Shield,
  Search,
  Bell,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  LogOut,
  Radio,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart3,
  CheckCheck,
  AlertTriangle,
  Info,
  ShieldAlert,
  ExternalLink,
  UserCheck,
  Wrench,
  Sparkle,
  Ticket
} from 'lucide-react';

export default function Shell() {
  const { user, logout } = useAuth();
  const { isDarkMode, isLightMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ── Search State ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);

  // ── Time Window State ──
  const [selectedTimeWindow, setSelectedTimeWindow] = useState(() => {
    return localStorage.getItem('transit_time_window') || 'Last 7 Days';
  });

  // ── Real-Time Clock State ──
  const [liveTime, setLiveTime] = useState(new Date());
  const [showSimulatedDate, setShowSimulatedDate] = useState(false);

  // ── Notifications State ──
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifRef = useRef(null);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'critical',
      icon: ShieldAlert,
      title: 'High Delay on Corridor 1',
      desc: 'Route R-101 delay exceeded 18.4 min on MA Jinnah Rd.',
      time: '2 min ago',
      path: '/delays',
      read: false
    },
    {
      id: 2,
      type: 'warning',
      icon: AlertTriangle,
      title: 'Severe Overcrowding Alert',
      desc: 'Bus BUS-204 at 124% capacity on University Link.',
      time: '8 min ago',
      path: '/passenger-flow',
      read: false
    },
    {
      id: 3,
      type: 'maintenance',
      icon: Wrench,
      title: 'Fleet Maintenance Due',
      desc: 'Bus BUS-112 odometer exceeded 250,000 km (Brakes).',
      time: '25 min ago',
      path: '/vehicle-management',
      read: false
    },
    {
      id: 4,
      type: 'info',
      icon: Sparkles,
      title: 'Dynamic Dispatch Applied',
      desc: 'Route R-208 headway tightened to 6 min for evening rush.',
      time: '40 min ago',
      path: '/recommendations',
      read: false
    }
  ]);

  // ── User Profile Menu State ──
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Tick clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close popovers on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ── Searchable catalog ──
  const searchIndex = [
    // Routes
    { category: 'Route', label: 'Route R-101 (Downtown Express)', path: '/route-performance', meta: 'High Volume Corridor' },
    { category: 'Route', label: 'Route R-104 (East Arterial Link)', path: '/route-performance', meta: 'Bus Rapid Transit' },
    { category: 'Route', label: 'Route R-202 (Tech Park Super Feeder)', path: '/route-performance', meta: 'Overcrowding Risk' },
    { category: 'Route', label: 'Route R-305 (University Transitway)', path: '/route-performance', meta: 'Student Corridor' },
    { category: 'Route', label: 'Route R-408 (Airport Direct)', path: '/route-performance', meta: 'Luggage Feeder' },
    // Stops
    { category: 'Stop', label: 'Stop S-101 (Central Terminal)', path: '/stop-management', meta: 'Zone A · 8 Routes' },
    { category: 'Stop', label: 'Stop S-104 (MA Jinnah Junction)', path: '/stop-management', meta: 'Zone B · High Dwell Time' },
    { category: 'Stop', label: 'Stop S-205 (Civic Centre Station)', path: '/stop-management', meta: 'Zone C · Turnstile Active' },
    { category: 'Stop', label: 'Stop S-302 (University Campus Gate)', path: '/stop-management', meta: 'Zone D · Peak Demand' },
    // Vehicles
    { category: 'Vehicle', label: 'Bus BUS-102 (Electric Eco-Fleet)', path: '/vehicle-management', meta: 'Battery: 88% · Route R-101' },
    { category: 'Vehicle', label: 'Bus BUS-215 (Hybrid Euro-6)', path: '/vehicle-management', meta: 'In-Service · Route R-202' },
    { category: 'Vehicle', label: 'Bus BUS-308 (Articulated Diesel)', path: '/vehicle-management', meta: 'Capacity: 120 · Route R-104' },
    // Core Modules
    { category: 'Module', label: 'Executive Overview Dashboard', path: '/overview', meta: 'Real-time KPIs & Fleet' },
    { category: 'Module', label: 'Live Network Map', path: '/map', meta: 'Interactive Leaflet 500 Stops' },
    { category: 'Module', label: 'Delay Intelligence & Heatmaps', path: '/delays', meta: 'PySpark MLlib Delay Engine' },
    { category: 'Module', label: 'Passenger Flow & Density', path: '/passenger-flow', meta: 'Crowding Risk Classification' },
    { category: 'Module', label: 'What-If Scenario Simulator', path: '/whatif', meta: 'Dynamic Elasticity & Surges' },
    { category: 'Module', label: 'Model Lab & Comparison', path: '/model-comparison', meta: 'Spark MLlib vs Scikit-Learn (87%)' },
    { category: 'Module', label: 'Data Engineering & Spark Jobs', path: '/spark-jobs', meta: '20 Distributed PySpark Jobs' },
    { category: 'Module', label: 'Official Reports & Data Dictionary', path: '/reports', meta: 'Audit & Submission Deliverables' },
  ];

  const filteredSearchResults = searchQuery.trim() === ''
    ? []
    : searchIndex.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.meta.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 6);

  const handleSelectSearchResult = (path, name) => {
    setSearchQuery('');
    setSearchFocused(false);
    navigate(path);
    toast.info(`Navigating to: ${name}`);
  };

  const handleTimeWindowChange = (newVal) => {
    setSelectedTimeWindow(newVal);
    localStorage.setItem('transit_time_window', newVal);
    window.dispatchEvent(new CustomEvent('transit-timewindow-changed', { detail: newVal }));
    toast.success(`Filter Applied: ${newVal}`);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  };

  const clearNotifications = () => {
    setNotifications([]);
    toast.info('Notification inbox cleared');
  };

  const handleNotificationClick = (item) => {
    setNotifications(prev =>
      prev.map(n => (n.id === item.id ? { ...n, read: true } : n))
    );
    setNotificationsOpen(false);
    navigate(item.path);
  };

  // Sidebar navigation items
  const sidebarItems = [
    { name: 'Overview', path: '/overview', icon: LayoutDashboard },
    { name: 'Live Operations', path: '/route-management', icon: Radio },
    { name: 'Routes', path: '/route-performance', icon: GitFork },
    { name: 'Stops', path: '/stop-management', icon: MapPin },
    { name: 'Vehicles', path: '/vehicle-management', icon: Bus },
    { name: 'Trips', path: '/trip-management', icon: Calendar },
    { name: 'Tickets', path: '/ticket-management', icon: Ticket },
    { divider: true },
    { name: 'Passenger Analytics', path: '/passenger-flow', icon: Users2 },
    { name: 'Route Intelligence', path: '/route-performance-detail', icon: GitFork },
    { name: 'Delay Intelligence', path: '/delays', icon: Clock },
    { name: 'AI & Forecasting', path: '/forecast', icon: Sparkles },
    { name: 'Route Map', path: '/map', icon: Map },
    { name: 'Recommendations', path: '/recommendations', icon: Lightbulb },
    { name: 'What-If Simulator', path: '/whatif', icon: Sliders },
    { name: 'Model Lab', path: '/model-comparison', icon: Sparkles },
    { name: 'Reports & Export', path: '/reports', icon: Database },
    { name: 'Data Engineering', path: '/spark-jobs', icon: Database },
    { name: 'Administration', path: '/admin', icon: Shield },
  ];

  return (
    <div
      className={`flex h-screen overflow-hidden font-sans transition-colors duration-300 antialiased ${
        isLightMode ? 'bg-[#F4F6F9] text-slate-800' : 'bg-[#141414] text-white'
      }`}
    >
      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── 1. Sidebar: Collapsible on Desktop, Drawer on Mobile ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 md:relative md:translate-x-0 ${
          sidebarCollapsed ? 'md:w-20' : 'md:w-64'
        } ${mobileOpen ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0'} ${
          isLightMode
            ? 'bg-white border-r border-slate-200 shadow-sm'
            : 'bg-[#1A1A1A] border-r border-[#2A2A2A]'
        }`}
      >
        {/* Brand header */}
        <div
          className={`h-16 px-4 border-b flex items-center justify-between transition-colors ${
            isLightMode ? 'border-slate-200 bg-white' : 'border-[#2A2A2A] bg-[#1A1A1A]'
          }`}
        >
          <Link
            to="/overview"
            className={`flex items-center gap-2.5 group overflow-hidden ${
              sidebarCollapsed ? 'md:justify-center md:w-full' : ''
            }`}
          >
            <div className="w-8 h-8 rounded-[8px] bg-[#E31E24] flex items-center justify-center text-white shadow-md shadow-red-600/30 shrink-0">
              <Bus className="w-4 h-4" />
            </div>
            {!sidebarCollapsed && (
              <span
                className={`font-black text-base tracking-tight flex items-center gap-1.5 whitespace-nowrap transition-opacity duration-200 ${
                  isLightMode ? 'text-slate-900' : 'text-white'
                }`}
              >
                UrbanTransit{' '}
                <span className="px-1.5 py-0.5 rounded-[4px] bg-[#E31E24]/20 text-[#E31E24] text-[10px] font-black border border-[#E31E24]/40">
                  IQ
                </span>
              </span>
            )}
          </Link>
          <button
            className={`md:hidden p-1.5 rounded-lg transition-colors ${
              isLightMode ? 'text-slate-500 hover:text-slate-900' : 'text-[#A9A9A9] hover:text-white'
            }`}
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1.5 scrollbar-thin">
          {sidebarItems.map((item, index) => {
            if (item.divider) {
              return (
                <div
                  key={`div-${index}`}
                  className={`my-2 border-t ${
                    isLightMode ? 'border-slate-200' : 'border-[#2A2A2A]'
                  }`}
                />
              );
            }
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.name}
                to={item.path}
                title={sidebarCollapsed ? item.name : undefined}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center ${
                  sidebarCollapsed ? 'md:justify-center md:px-0' : 'justify-between px-4'
                } py-2.5 rounded-[8px] text-xs font-semibold transition-all duration-200 group ${
                  isActive
                    ? 'bg-[#E31E24] text-white shadow-md shadow-red-600/30 font-bold border-l-4 border-white'
                    : isLightMode
                    ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    : 'text-[#A9A9A9] hover:bg-[#252525] hover:text-white'
                }`}
              >
                <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'md:justify-center' : ''}`}>
                  <Icon
                    size={16}
                    className={`transition-colors shrink-0 ${
                      isActive
                        ? 'text-white'
                        : isLightMode
                        ? 'text-slate-500 group-hover:text-[#E31E24]'
                        : 'text-[#A9A9A9] group-hover:text-[#E31E24]'
                    }`}
                  />
                  {!sidebarCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                </div>
                {!sidebarCollapsed && isActive && (
                  <ChevronRight size={14} className="text-white shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom admin profile section */}
        <div
          className={`p-3.5 border-t flex items-center ${
            sidebarCollapsed ? 'md:justify-center' : 'justify-between'
          } transition-colors ${
            isLightMode ? 'border-slate-200 bg-slate-50' : 'border-[#2A2A2A] bg-[#161616]'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              title={sidebarCollapsed ? `${user.username || 'User'} (${user.role || 'Role'})` : undefined}
              className="w-8 h-8 rounded-full bg-[#E31E24] text-white font-black flex items-center justify-center text-xs shrink-0 shadow-sm shadow-red-600/30"
            >
              {user.username ? user.username.charAt(0).toUpperCase() : 'A'}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p
                  className={`text-xs font-bold truncate leading-tight ${
                    isLightMode ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  {user.username || 'Administrator'}
                </p>
                <p
                  className={`text-[10px] truncate leading-tight mt-0.5 ${
                    isLightMode ? 'text-slate-500' : 'text-[#A9A9A9]'
                  }`}
                >
                  {user.role || 'System Controller'}
                </p>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button
              onClick={() => {
                logout();
                toast.info('Signed out successfully');
              }}
              title="Sign Out"
              className={`p-1.5 rounded-[6px] transition-colors cursor-pointer ${
                isLightMode
                  ? 'text-slate-500 hover:text-[#E31E24] hover:bg-slate-200'
                  : 'text-[#A9A9A9] hover:text-[#E31E24] hover:bg-[#252525]'
              }`}
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* ── 2. Main Content Area with Dynamic Topbar & Controls ── */}
      <main className="flex-1 flex flex-col h-full w-full overflow-hidden">
        {/* Top Navbar Header */}
        <header
          className={`h-16 border-b-2 border-b-[#E31E24] px-4 md:px-6 flex items-center justify-between shrink-0 z-30 transition-colors duration-200 ${
            isLightMode ? 'bg-white shadow-xs' : 'bg-[#1A1A1A]'
          }`}
        >
          {/* Left section: Collapse Toggle & Global Search */}
          <div className="flex items-center gap-3 flex-1 max-w-lg">
            {/* Desktop Sidebar Toggle Button */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label="Toggle Sidebar Collapse"
              className={`hidden md:flex items-center justify-center p-2 rounded-[8px] border transition-colors cursor-pointer ${
                isLightMode
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
                  : 'text-[#A9A9A9] hover:text-white hover:bg-[#252525] border-[#2A2A2A]'
              }`}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>

            {/* Mobile Sidebar Toggle Button */}
            <button
              onClick={() => setMobileOpen(true)}
              title="Open Navigation"
              aria-label="Toggle Mobile Navigation"
              className={`md:hidden flex items-center justify-center p-2 rounded-[8px] border transition-colors cursor-pointer ${
                isLightMode
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
                  : 'text-[#A9A9A9] hover:text-white hover:bg-[#252525] border-[#2A2A2A]'
              }`}
            >
              <Menu size={18} />
            </button>

            {/* Global Search Bar with Live Results Dropdown */}
            <div className="relative w-full max-w-sm" ref={searchRef}>
              <Search
                className={`absolute left-3 w-4 h-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
                  searchFocused ? 'text-[#E31E24]' : isLightMode ? 'text-slate-400' : 'text-[#A9A9A9]'
                }`}
              />
              <input
                type="text"
                placeholder="Search routes, vehicles, stops..."
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchFocused(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSearchFocused(false);
                  if (e.key === 'Enter' && filteredSearchResults.length > 0) {
                    handleSelectSearchResult(filteredSearchResults[0].path, filteredSearchResults[0].label);
                  }
                }}
                className={`w-full pl-9 pr-8 py-1.5 text-xs rounded-[8px] border focus:outline-none focus:border-[#E31E24] transition ${
                  isLightMode
                    ? 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white'
                    : 'bg-[#1F1F1F] border-[#2A2A2A] text-white placeholder-[#A9A9A9]'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                >
                  <X size={13} />
                </button>
              )}

              {/* Interactive Search Results Dropdown */}
              {searchFocused && searchQuery.trim() !== '' && (
                <div
                  className={`absolute left-0 right-0 mt-2 rounded-[10px] shadow-2xl border overflow-hidden z-50 animate-in fade-in-50 duration-150 ${
                    isLightMode
                      ? 'bg-white border-slate-200 text-slate-900'
                      : 'bg-[#1E1E1E] border-[#333333] text-white'
                  }`}
                >
                  <div className="p-2 border-b border-inherit flex items-center justify-between text-[11px] text-[#A9A9A9] font-medium">
                    <span>Quick Navigation</span>
                    <span>Press Enter to select</span>
                  </div>

                  {filteredSearchResults.length > 0 ? (
                    <div className="max-h-72 overflow-y-auto py-1">
                      {filteredSearchResults.map((res, i) => (
                        <button
                          key={i}
                          onClick={() => handleSelectSearchResult(res.path, res.label)}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                            isLightMode
                              ? 'hover:bg-slate-100 text-slate-800'
                              : 'hover:bg-[#2A2A2A] text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${
                                res.category === 'Route'
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  : res.category === 'Stop'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : res.category === 'Vehicle'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-[#E31E24]/20 text-[#E31E24] border border-[#E31E24]/30'
                              }`}
                            >
                              {res.category}
                            </span>
                            <span className="font-semibold truncate">{res.label}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 ml-2 shrink-0">{res.meta}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No results found for "{searchQuery}".
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2.5 md:gap-3">
            {/* Real-time Clock / Date Badge */}
            <button
              onClick={() => {
                setShowSimulatedDate(!showSimulatedDate);
                toast.info(showSimulatedDate ? 'Showing live computer clock' : 'Showing dataset simulation timestamp');
              }}
              title="Click to toggle live computer clock vs dataset timestamp"
              className={`hidden lg:flex items-center gap-2 text-xs px-3 py-1.5 rounded-[8px] border transition-colors cursor-pointer ${
                isLightMode
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                  : 'bg-[#1F1F1F] hover:bg-[#252525] border-[#2A2A2A] text-slate-300'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <Calendar className="w-3.5 h-3.5 text-[#E31E24] shrink-0" />
              <span className="font-medium whitespace-nowrap">
                {showSimulatedDate
                  ? '26 Sep 2026, 04:00 PM'
                  : liveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
                    ' · ' +
                    liveTime.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </button>

            {/* Time Window Dropdown with Live Trigger */}
            <select
              value={selectedTimeWindow}
              onChange={(e) => handleTimeWindowChange(e.target.value)}
              title="Filter operational analytics time window"
              className={`text-xs rounded-[8px] px-2.5 py-1.5 font-medium border focus:outline-none focus:border-[#E31E24] cursor-pointer transition ${
                isLightMode
                  ? 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
                  : 'bg-[#1F1F1F] border-[#2A2A2A] text-white hover:bg-[#252525]'
              }`}
            >
              <option value="Last 24 Hours">Last 24 Hours</option>
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="Today (Peak Operations)">Today (Peak Operations)</option>
            </select>

            {/* ── THEME TOGGLE BUTTON (Dark / Light Mode) ── */}
            <ThemeToggle />

            {/* ── NOTIFICATIONS BELL BUTTON & POPUP ── */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                title="System Notifications"
                aria-label="View notifications"
                className={`relative p-2 rounded-[8px] border transition-colors cursor-pointer ${
                  notificationsOpen
                    ? 'border-[#E31E24] text-[#E31E24]'
                    : isLightMode
                    ? 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    : 'bg-[#1F1F1F] border-[#2A2A2A] text-[#A9A9A9] hover:text-white hover:border-[#E31E24]/60'
                }`}
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#E31E24] text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-sm animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Popover Dropdown */}
              {notificationsOpen && (
                <div
                  className={`absolute right-0 mt-2 w-80 md:w-96 rounded-[12px] shadow-2xl border overflow-hidden z-50 animate-in fade-in-50 duration-150 ${
                    isLightMode
                      ? 'bg-white border-slate-200 text-slate-900'
                      : 'bg-[#1B1B1B] border-[#303030] text-white'
                  }`}
                >
                  <div className="p-3 border-b border-inherit flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">Transit Alerts</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.2 bg-[#E31E24]/20 text-[#E31E24] text-[10px] font-bold rounded-full border border-[#E31E24]/30">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-[11px] text-slate-400 hover:text-[#E31E24] transition flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCheck size={12} />
                          <span>Mark read</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-inherit">
                    {notifications.length > 0 ? (
                      notifications.map((item) => {
                        const Icon = item.icon;
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleNotificationClick(item)}
                            className={`p-3 flex items-start gap-3 transition-colors cursor-pointer ${
                              !item.read
                                ? isLightMode
                                  ? 'bg-red-50/60 hover:bg-red-100/50'
                                  : 'bg-[#241c1c]/40 hover:bg-[#2b2222]'
                                : isLightMode
                                ? 'hover:bg-slate-50'
                                : 'hover:bg-[#252525]'
                            }`}
                          >
                            <div
                              className={`p-2 rounded-[6px] shrink-0 mt-0.5 ${
                                item.type === 'critical'
                                  ? 'bg-red-500/20 text-red-500'
                                  : item.type === 'warning'
                                  ? 'bg-amber-500/20 text-amber-500'
                                  : item.type === 'maintenance'
                                  ? 'bg-orange-500/20 text-orange-400'
                                  : 'bg-emerald-500/20 text-emerald-400'
                              }`}
                            >
                              <Icon size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold truncate">{item.title}</p>
                                <span className="text-[10px] text-slate-400 shrink-0 ml-1">{item.time}</span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                                {item.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No notifications currently active.
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 border-t border-inherit bg-slate-50/50 dark:bg-[#161616] flex items-center justify-between text-xs">
                    <button
                      onClick={clearNotifications}
                      className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      Clear all
                    </button>
                    <Link
                      to="/delays"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-[11px] text-[#E31E24] hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>Delay Dashboard</span>
                      <ExternalLink size={10} />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* ── USER PROFILE BUTTON & DROPDOWN MENU ── */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                title="Account Settings & Profile"
                aria-label="User Profile Menu"
                className={`flex items-center gap-2 pl-2 md:pl-2.5 py-1 pr-2 rounded-[8px] border transition-colors cursor-pointer ${
                  userMenuOpen
                    ? 'border-[#E31E24]'
                    : isLightMode
                    ? 'border-slate-200 hover:bg-slate-100'
                    : 'border-[#2A2A2A] hover:bg-[#252525]'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-[#E31E24] text-white font-black flex items-center justify-center text-xs shadow-md shadow-red-600/30 shrink-0">
                  {user.username ? user.username.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="hidden sm:block text-left">
                  <p
                    className={`text-xs font-bold leading-tight ${
                      isLightMode ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    {user.username || 'Admin'}
                  </p>
                  <p
                    className={`text-[10px] leading-tight ${
                      isLightMode ? 'text-slate-500' : 'text-[#A9A9A9]'
                    }`}
                  >
                    {user.role || 'Fleet Operator'}
                  </p>
                </div>
                <ChevronDown size={14} className="text-slate-400 shrink-0 ml-0.5" />
              </button>

              {/* User Dropdown Menu */}
              {userMenuOpen && (
                <div
                  className={`absolute right-0 mt-2 w-64 rounded-[12px] shadow-2xl border overflow-hidden z-50 animate-in fade-in-50 duration-150 ${
                    isLightMode
                      ? 'bg-white border-slate-200 text-slate-900'
                      : 'bg-[#1B1B1B] border-[#303030] text-white'
                  }`}
                >
                  <div className="p-3.5 border-b border-inherit">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-[#E31E24] text-white font-bold flex items-center justify-center text-sm shadow-md">
                        {user.username ? user.username.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{user.username || 'Administrator'}</p>
                        <p className="text-[10px] text-slate-400 truncate">admin@urbantransit.iq</p>
                        <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {user.role || 'System Controller'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-1 text-xs">
                    <Link
                      to="/admin"
                      onClick={() => setUserMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-[6px] transition-colors ${
                        isLightMode ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-[#252525] text-slate-200'
                      }`}
                    >
                      <Shield size={14} className="text-blue-400" />
                      <span>Administration Panel</span>
                    </Link>

                    <Link
                      to="/reports"
                      onClick={() => setUserMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-[6px] transition-colors ${
                        isLightMode ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-[#252525] text-slate-200'
                      }`}
                    >
                      <Database size={14} className="text-emerald-400" />
                      <span>SRS Reports & Schemas</span>
                    </Link>
                  </div>

                  <div className="p-1 border-t border-inherit">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                        toast.info('Signed out successfully');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs font-semibold text-[#E31E24] hover:bg-red-500/10 transition-colors cursor-pointer text-left"
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Outlet Body */}
        <div
          className={`flex-1 overflow-y-auto p-4 md:p-6 w-full transition-colors duration-200 ${
            isLightMode ? 'bg-[#F4F6F9]' : 'bg-[#141414]'
          }`}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
