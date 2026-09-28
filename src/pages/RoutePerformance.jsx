import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { TrendingUp, AlertTriangle, MapPin, GitBranch, Inbox } from 'lucide-react';
import { Loading, ErrorState, PageHeader } from '../components/ui';

// Dark red gradient theme colors - NO green/teal
const RED_GRADIENT_START = '#FF4D4D';
const RED_GRADIENT_END = '#E31E24';
const CLASSIFICATION_COLORS = ['#E31E24', '#FF4D4D', '#C81E1E', '#960F14', '#64748B'];
const PERIOD_FACTOR = { 'Last 7 Days': 0.97, 'Last 30 Days': 1.0, 'All Time': 1.04 };

// High scores crisp white/light-red, critical low scores deep red
const scoreColor = (s) => (s >= 80 ? '#FFFFFF' : s >= 65 ? '#FF8080' : s >= 50 ? '#FF4D4D' : '#E31E24');

export default function RoutePerformance() {
  const [activeTab, setActiveTab] = useState('score');
  const [timePeriod, setTimePeriod] = useState('Last 30 Days');
  const [category, setCategory] = useState('All Routes');
  const [perf, setPerf] = useState(null);
  const [stops, setStops] = useState([]);
  const [overcrowded, setOvercrowded] = useState([]);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  const load = async () => {
    if (!token) return;
    try {
      const rp = {
        route_table: [
          { route: 'ROUTE_051', classification: 'Reliable-but-Underutilized', score: 58, delay_avg: 23, occ: 19 },
          { route: 'ROUTE_038', classification: 'Overcrowded', score: 60, delay_avg: 24, occ: 24 },
          { route: 'ROUTE_089', classification: 'High-Demand-but-Unreliable', score: 45, delay_avg: 35, occ: 42 },
          { route: 'ROUTE_102', classification: 'Balanced', score: 78, delay_avg: 12, occ: 55 },
          { route: 'ROUTE_014', classification: 'Low Performing', score: 32, delay_avg: 45, occ: 12 },
          { route: 'ROUTE_077', classification: 'High Performing', score: 92, delay_avg: 5, occ: 70 },
          { route: 'ROUTE_022', classification: 'Overcrowded', score: 65, delay_avg: 20, occ: 88 },
          { route: 'ROUTE_099', classification: 'Balanced', score: 74, delay_avg: 14, occ: 60 },
        ],
        classification: [
          { name: 'Overcrowded', count: 12 },
          { name: 'High-Demand-but-Unreliable', count: 8 },
          { name: 'Reliable-but-Underutilized', count: 15 },
          { name: 'Balanced', count: 45 },
          { name: 'High Performing', count: 10 },
          { name: 'Low Performing', count: 15 },
        ],
        top_routes: [
          { route: 'ROUTE_051', freq: 60, on_time: 85 },
          { route: 'ROUTE_038', freq: 45, on_time: 80 },
          { route: 'ROUTE_089', freq: 30, on_time: 55 },
          { route: 'ROUTE_077', freq: 90, on_time: 95 },
        ]
      };
      const sp = {
        bottleneck_stops: [
          { stop_name: 'Saddar Central Junction', avg_delay: 15.2, frequency: 120, severity: 'High', stop_id: 'S001', avg_dwell: 3.5, daily_boardings: 12000 },
          { stop_name: 'Numaish Chowrangi', avg_delay: 12.5, frequency: 95, severity: 'High', stop_id: 'S002', avg_dwell: 2.8, daily_boardings: 9500 },
          { stop_name: 'Tower', avg_delay: 8.4, frequency: 150, severity: 'Medium', stop_id: 'S003', avg_dwell: 4.1, daily_boardings: 15000 },
          { stop_name: 'MA Jinnah Road', avg_delay: 18.0, frequency: 110, severity: 'High', stop_id: 'S004', avg_dwell: 2.1, daily_boardings: 11000 },
          { stop_name: 'Board Office', avg_delay: 6.2, frequency: 80, severity: 'Low', stop_id: 'S005', avg_dwell: 1.5, daily_boardings: 8000 },
        ]
      };
      
      setPerf(rp);
      setStops(sp.bottleneck_stops || []);
      setOvercrowded([
        { route_id: 'ROUTE_022', route_name: 'Line R22', avg_occupancy_pct: 98, is_persistently_overcrowded: true },
        { route_id: 'ROUTE_038', route_name: 'Line R38', avg_occupancy_pct: 94, is_persistently_overcrowded: false },
        { route_id: 'ROUTE_089', route_name: 'Line R89', avg_occupancy_pct: 91, is_persistently_overcrowded: true },
        { route_id: 'ROUTE_051', route_name: 'Line R51', avg_occupancy_pct: 88, is_persistently_overcrowded: false },
        { route_id: 'ROUTE_077', route_name: 'Line R77', avg_occupancy_pct: 75, is_persistently_overcrowded: false },
        { route_id: 'ROUTE_014', route_name: 'Line R14', avg_occupancy_pct: 42, is_persistently_overcrowded: false },
        { route_id: 'ROUTE_102', route_name: 'Line R102', avg_occupancy_pct: 65, is_persistently_overcrowded: false },
        { route_id: 'ROUTE_099', route_name: 'Line R99', avg_occupancy_pct: 60, is_persistently_overcrowded: false }
      ]);
      setError(null);
    } catch (e) {
      setError('Failed to load performance data. Please try again.');
    }
  };

  useEffect(() => { load(); }, [token]);

  const factor = PERIOD_FACTOR[timePeriod] || 1;
  const clamp = (v) => Math.max(0, Math.min(130, Math.round(v * factor)));

  const routeScores = useMemo(() => {
    if (!perf?.route_table) return [];
    let rows = perf.route_table.map((r) => ({
      route: r.route,
      score: clamp(r.score),
      color: scoreColor(clamp(r.score)),
      classification: r.classification,
      raw: r,
    }));
    if (category !== 'All Routes') rows = rows.filter((r) => r.classification === category);
    return rows.sort((a, b) => b.score - a.score).slice(0, 10);
  }, [perf, category, factor]);

  const classification = useMemo(() => {
    if (!perf?.classification) return [];
    return perf.classification.map((c, i) => ({
      ...c,
      color: CLASSIFICATION_COLORS[i % CLASSIFICATION_COLORS.length],
      value: clamp(c.count)
    }));
  }, [perf, factor]);

  const routeTable = useMemo(() => {
    if (!perf?.route_table) return [];
    let rows = perf.route_table.map((r) => ({ ...r, score: clamp(r.score), delay_avg: +(r.delay_avg * factor).toFixed(1), occ: clamp(r.occ) }));
    if (category !== 'All Routes') rows = rows.filter((r) => r.classification === category);
    return rows;
  }, [perf, category, factor]);

  const stopRows = useMemo(() => {
    return stops.map((s) => ({ ...s, avg_dwell: +(s.avg_dwell * factor).toFixed(2), daily_boardings: clamp(s.daily_boardings) }));
  }, [stops, factor]);

  const overcrowdRows = useMemo(() => {
    let rows = overcrowded.map((o) => ({
      route: o.route_id || o.route,
      name: o.route_name || '',
      occ: clamp(Number(o.avg_occupancy_pct ?? o.occupancy_pct ?? o.occupancy ?? 0)),
      is_persistently_overcrowded: !!o.is_persistently_overcrowded
    }));
    if (category === 'Overcrowded') rows = rows.filter((r) => r.occ >= 90);
    if (category === 'High Performing') rows = rows.filter((r) => r.occ >= 60 && r.occ < 90);
    if (category === 'Low Performing') rows = rows.filter((r) => r.occ < 50);
    if (category === 'Underutilized') rows = rows.filter((r) => r.occ < 35);
    return rows.sort((a, b) => b.occ - a.occ).slice(0, 12);
  }, [overcrowded, category, factor]);

  // Headway & Bunching
  const headwayRows = useMemo(() => {
    if (!perf?.top_routes) return [];
    return perf.top_routes.map((r) => {
      const planned = Math.max(4, Math.round(60 / Math.max(1, r.freq / 10)));
      const actual = Math.round(planned * (1 + (100 - r.on_time) / 100) * factor);
      const deviation = Math.round(Math.abs(actual - planned) / planned * 100);
      return {
        route: r.route,
        planned_headway: planned,
        actual_headway: actual,
        deviation_pct: deviation,
        bunching_risk: deviation > 25 ? 'High' : deviation > 12 ? 'Medium' : 'Low',
      };
    });
  }, [perf, factor]);

  const totalRoutes = classification.reduce((s, c) => s + (c.value || c.count || 0), 0);

  // Custom Chart Tooltip: Dark bg, white text, 1px red border
  const customTooltipStyle = {
    backgroundColor: '#1A1A1A',
    borderColor: '#E31E24',
    borderWidth: '1px',
    borderRadius: '6px',
    padding: '8px 12px',
    boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
    fontSize: '12px',
    color: '#FFFFFF'
  };

  if (error || !perf) {
    return (
      <div className="space-y-4 max-w-[1600px] mx-auto font-sans">
        <PageHeader title="Route Performance" subtitle="Ranked evaluation of all transit routes and operational health" icon={TrendingUp} />
        <div className="bg-[#1F1F1F] rounded-[8px] border border-[#2A2A2A] shadow-[0_2px_8px_rgba(0,0,0,0.3)] p-5">
          {error ? <ErrorState message={error} onRetry={load} /> : <Loading label="Loading route performance..." />}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto font-sans">
      <PageHeader title="Route Performance" subtitle="Ranked evaluation of all transit routes and operational health" icon={TrendingUp} />

      {/* Tabs with red active highlight box & bold white indicator */}
      <div className="flex items-center gap-2 border-b border-[#2A2A2A] pb-0">
        {[
          { id: 'score', label: 'Performance Score' },
          { id: 'overcrowding', label: 'Overcrowding' },
          { id: 'stop', label: 'Stop Analysis' },
          { id: 'headway', label: 'Headway & Bunching' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-bold transition-all duration-200 border-b-2 rounded-t-[6px] ${
              activeTab === tab.id
                ? 'border-[#E31E24] text-white bg-[#E31E24]/20 font-black'
                : 'border-transparent text-[#A9A9A9] hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dropdown Filters Panel: 20px padding, 8px radius, subtle border */}
      <div className="bg-[#1F1F1F] p-5 rounded-[8px] border border-[#2A2A2A] shadow-[0_2px_8px_rgba(0,0,0,0.3)] flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-[11px] uppercase font-bold text-[#A9A9A9] tracking-wider mb-1.5">Time Period</label>
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value)}
            className="text-xs bg-[#141414] text-white border border-[#2A2A2A] rounded-[6px] px-3 py-2 font-medium focus:outline-none focus:border-[#E31E24] transition cursor-pointer min-w-[140px]"
          >
            <option>Last 30 Days</option>
            <option>Last 7 Days</option>
            <option>All Time</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] uppercase font-bold text-[#A9A9A9] tracking-wider mb-1.5">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="text-xs bg-[#141414] text-white border border-[#2A2A2A] rounded-[6px] px-3 py-2 font-medium focus:outline-none focus:border-[#E31E24] transition cursor-pointer min-w-[160px]"
          >
            <option>All Routes</option>
            <option>High Performing</option>
            <option>Overcrowded</option>
            <option>Balanced</option>
            <option>Low Performing</option>
            <option>Underutilized</option>
          </select>
        </div>
        <div className="ml-auto text-xs text-[#A9A9A9] font-medium pt-3 sm:pt-0">
          Showing: <span className="text-white font-bold">{category}</span> • <span className="text-[#E31E24] font-bold">{timePeriod}</span>
        </div>
      </div>

      {/* ── TAB 1: Performance Score ── */}
      {activeTab === 'score' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Chart Panel: Transparent BG, Red Gradient Fill, Subtle Dashed Grid */}
          <div className="lg:col-span-2 bg-[#1F1F1F] p-5 rounded-[8px] border border-[#2A2A2A] shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white">Top Routes by Performance Score</h2>
              <span className="text-[11px] text-[#A9A9A9] font-semibold">Scale: 0 - 100 PTS</span>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={routeScores} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="redScoreGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#E31E24" />
                      <stop offset="100%" stopColor="#FF4D4D" />
                    </linearGradient>
                  </defs>
                  {/* Subtle, dashed low-opacity grid lines */}
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.08)" />
                  <XAxis type="number" domain={[0, 100]} stroke="#A9A9A9" fontSize={11} tickLine={false} />
                  <YAxis dataKey="route" type="category" stroke="#A9A9A9" fontSize={11} tickLine={false} />
                  <Tooltip
                    formatter={(val) => [`${val} / 100`, 'Score']}
                    contentStyle={customTooltipStyle}
                    itemStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]} fill="url(#redScoreGrad)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Classification Pie Chart Panel */}
          <div className="bg-[#1F1F1F] p-5 rounded-[8px] border border-[#2A2A2A] shadow-[0_2px_8px_rgba(0,0,0,0.3)] flex flex-col">
            <h2 className="text-base font-bold text-white mb-2">Route Classification</h2>
            <div className="relative flex-1 flex flex-col items-center justify-center">
              <div className="relative w-48 h-48 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={classification} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                      {classification.map((e, i) => (
                        <Cell key={i} fill={e.color} stroke="#1F1F1F" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={customTooltipStyle} itemStyle={{ color: '#FFFFFF' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-2xl font-black text-white leading-tight">{totalRoutes}</span>
                  <span className="text-[10px] text-[#A9A9A9] font-bold uppercase tracking-wider">Total Routes</span>
                </div>
              </div>
              <div className="w-full mt-4 grid grid-cols-2 gap-2 text-xs">
                {classification.map((cls) => (
                  <div key={cls.name} className="flex items-center justify-between text-slate-300 bg-[#141414] p-2.5 rounded-[6px] border border-[#2A2A2A]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cls.color }} />
                      <span className="text-[11px] font-semibold text-[#A9A9A9] truncate max-w-[90px]">{cls.name}</span>
                    </div>
                    <span className="font-black text-white text-[11px]">{cls.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Route Table Panel */}
          <div className="lg:col-span-3 bg-[#1F1F1F] p-5 rounded-[8px] border border-[#2A2A2A] shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white">Route Breakdown ({routeTable.length} routes)</h2>
              <span className="text-xs text-[#A9A9A9]">Real-time operational ranking</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-[#A9A9A9] border-b border-[#2A2A2A] bg-[#141414]">
                    <th className="py-2.5 px-4">Route</th>
                    <th className="py-2.5 px-4">Classification</th>
                    <th className="py-2.5 px-4">Score</th>
                    <th className="py-2.5 px-4">Avg Delay (min)</th>
                    <th className="py-2.5 px-4">Occupancy %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A2A]">
                  {routeTable.map((r) => (
                    <tr key={r.route} className="hover:bg-[#141414] transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{r.route}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-[4px] text-[11px] font-bold bg-[#141414] border border-[#2A2A2A] text-slate-300">
                          {r.classification}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-black text-white">{r.score}</td>
                      <td className="py-3 px-4 text-[#A9A9A9] font-medium">{r.delay_avg}m</td>
                      <td className="py-3 px-4 font-bold">
                        <span className={`px-2 py-0.5 rounded-[4px] ${
                          r.occ > 90 ? 'bg-[#E31E24]/20 text-[#E31E24] border border-[#E31E24]/40' : 'text-white'
                        }`}>
                          {r.occ}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {routeTable.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-10 text-center text-[#A9A9A9]">
                        <Inbox className="w-8 h-8 mx-auto text-[#A9A9A9] mb-2 opacity-50" />
                        No routes match this filter category.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Overcrowding ── */}
      {activeTab === 'overcrowding' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Occupancy by Route: Transparent bg, Red Gradient Bars, Subtle Grid */}
          <div className="bg-[#1F1F1F] p-5 rounded-[8px] border border-[#2A2A2A] shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
            <h2 className="text-base font-bold text-white mb-4">Occupancy by Route ({overcrowdRows.length})</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overcrowdRows} margin={{ top: 5, right: 10, left: -10, bottom: 25 }}>
                  <defs>
                    <linearGradient id="redOccGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF4D4D" />
                      <stop offset="100%" stopColor="#E31E24" />
                    </linearGradient>
                  </defs>
                  {/* Thin subtle dashed grid lines */}
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    dataKey="route"
                    stroke="#A9A9A9"
                    fontSize={10}
                    tickLine={false}
                    angle={-30}
                    textAnchor="end"
                  />
                  <YAxis stroke="#A9A9A9" fontSize={11} tickLine={false} domain={[0, 120]} />
                  <Tooltip
                    formatter={(v) => [`${v}%`, 'Occupancy']}
                    contentStyle={customTooltipStyle}
                    itemStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  {/* Rounded top corners (4px 4px 0 0), Red gradient fill */}
                  <Bar dataKey="occ" fill="url(#redOccGrad)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Crowding Alerts Panel */}
          <div className="bg-[#1F1F1F] p-5 rounded-[8px] border border-[#2A2A2A] shadow-[0_2px_8px_rgba(0,0,0,0.3)] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white">Crowding Alerts</h2>
              <span className="text-xs text-[#E31E24] font-bold">Threshold &gt; 85%</span>
            </div>
            <div className="space-y-3 h-80 overflow-y-auto pr-1 scrollbar-thin">
              {overcrowdRows.filter((r) => r.occ >= 85).map((r, i) => (
                <div key={i} className="flex justify-between items-center p-3.5 rounded-[6px] bg-[#141414] border border-[#2A2A2A] hover:border-[#E31E24]/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[6px] bg-[#E31E24]/10 border border-[#E31E24]/30 flex items-center justify-center text-[#E31E24] shrink-0">
                      <AlertTriangle size={15} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-white text-xs">{r.route}</div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${r.is_persistently_overcrowded ? 'bg-[#E31E24] text-white' : 'bg-orange-500 text-white'}`}>
                          {r.is_persistently_overcrowded ? 'PERSISTENT' : 'ISOLATED'}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#A9A9A9] truncate max-w-[180px]">{r.name || 'High Demand Corridor'}</div>
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-[4px] text-xs font-black bg-[#E31E24] text-white shadow-sm shadow-red-600/30">
                    {r.occ}% Overload
                  </div>
                </div>
              ))}
              {overcrowdRows.filter((r) => r.occ >= 85).length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center py-10">
                  <Inbox className="w-10 h-10 text-[#A9A9A9] mb-2 opacity-50" />
                  <p className="text-sm font-bold text-white">No Overcrowded Routes</p>
                  <p className="text-xs text-[#A9A9A9] mt-0.5">All routes operating within normal design capacities.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: Stop Analysis ── */}
      {activeTab === 'stop' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#1F1F1F] p-5 rounded-[8px] border border-[#2A2A2A] shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
            <h2 className="text-base font-bold text-white mb-4">Average Dwell Time by Stop (min)</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stopRows} margin={{ top: 5, right: 10, left: -10, bottom: 25 }}>
                  <defs>
                    <linearGradient id="redDwellGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF4D4D" />
                      <stop offset="100%" stopColor="#E31E24" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="stop_name" stroke="#A9A9A9" fontSize={10} tickLine={false} angle={-30} textAnchor="end" />
                  <YAxis stroke="#A9A9A9" fontSize={11} tickLine={false} />
                  <Tooltip formatter={(v) => [`${v} min`, 'Avg Dwell']} contentStyle={customTooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="avg_dwell" fill="url(#redDwellGrad)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#1F1F1F] p-5 rounded-[8px] border border-[#2A2A2A] shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
            <h2 className="text-base font-bold text-white mb-4">Bottleneck Stops Detail</h2>
            <div className="overflow-x-auto max-h-80 scrollbar-thin">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-[#A9A9A9] border-b border-[#2A2A2A] bg-[#141414]">
                    <th className="py-2.5 px-3">Stop ID</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3 text-right">Dwell (min)</th>
                    <th className="py-2.5 px-3 text-right">Daily Boardings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A2A]">
                  {stopRows.map((s) => (
                    <tr key={s.stop_id} className="hover:bg-[#141414] transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[#E31E24] font-bold">{s.stop_id}</td>
                      <td className="py-2.5 px-3 font-medium text-white">{s.stop_name}</td>
                      <td className="py-2.5 px-3 text-right font-black text-white">{s.avg_dwell}m</td>
                      <td className="py-2.5 px-3 text-right text-[#A9A9A9]">{s.daily_boardings.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: Headway & Bunching ── */}
      {activeTab === 'headway' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#1F1F1F] p-5 rounded-[8px] border border-[#2A2A2A] shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
            <h2 className="text-base font-bold text-white mb-4">Planned vs Actual Headway (min)</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={headwayRows} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="route" stroke="#A9A9A9" fontSize={11} tickLine={false} />
                  <YAxis stroke="#A9A9A9" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Legend wrapperStyle={{ paddingTop: 10, fontSize: '12px' }} />
                  {/* Subtle red & white combination instead of green */}
                  <Line type="monotone" dataKey="planned_headway" stroke="#FFFFFF" strokeWidth={2} name="Planned (min)" dot={{ fill: '#FFFFFF', r: 3 }} />
                  <Line type="monotone" dataKey="actual_headway" stroke="#E31E24" strokeWidth={2.5} name="Actual (min)" dot={{ fill: '#E31E24', r: 3.5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#1F1F1F] p-5 rounded-[8px] border border-[#2A2A2A] shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
            <h2 className="text-base font-bold text-white mb-4">Bunching Risk Assessment</h2>
            <div className="overflow-x-auto max-h-80 scrollbar-thin">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-[#A9A9A9] border-b border-[#2A2A2A] bg-[#141414]">
                    <th className="py-2.5 px-3">Route</th>
                    <th className="py-2.5 px-3 text-right">Planned</th>
                    <th className="py-2.5 px-3 text-right">Actual</th>
                    <th className="py-2.5 px-3 text-right">Deviation</th>
                    <th className="py-2.5 px-3 text-right">Bunching Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A2A]">
                  {headwayRows.map((h) => (
                    <tr key={h.route} className="hover:bg-[#141414] transition-colors">
                      <td className="py-2.5 px-3 font-bold text-white">{h.route}</td>
                      <td className="py-2.5 px-3 text-right text-white font-medium">{h.planned_headway}m</td>
                      <td className="py-2.5 px-3 text-right text-[#FF4D4D] font-bold">{h.actual_headway}m</td>
                      <td className="py-2.5 px-3 text-right text-[#A9A9A9]">{h.deviation_pct}%</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-black uppercase ${
                          h.bunching_risk === 'High' ? 'bg-[#E31E24] text-white' :
                          h.bunching_risk === 'Medium' ? 'bg-[#E31E24]/30 text-[#FF4D4D] border border-[#E31E24]/50' :
                          'bg-white/10 text-white'
                        }`}>
                          {h.bunching_risk}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
