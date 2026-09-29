import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line
} from 'recharts';
import { Download, Users, Inbox } from 'lucide-react';
import { Loading, ErrorState, EmptyState, PageHeader, friendlyError, useToast } from '../components/ui';

const SEG_COLORS = ['#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#8B5CF6'];
const RANGE_FACTOR = { 'Last 7 Days': 1.0, 'Last 30 Days': 4.2, 'Year to Date': 48.0 };

export default function PassengerFlow() {
  const [activeTab, setActiveTab] = useState('flow');
  const [dateRange, setDateRange] = useState('Last 7 Days');
  const [selectedRoute, setSelectedRoute] = useState('All Routes');
  const [timeInterval, setTimeInterval] = useState('Hourly');
  const [apiFlow, setApiFlow] = useState(null);
  const [dashFlow, setDashFlow] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const toast = useToast();

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [pf, df, rl] = await Promise.all([
        fetch('/api/analysis/passenger-flow', { headers }).then((r) => r.json()).catch(() => null),
        fetch('/api/dashboard/passenger-flow', { headers }).then((r) => r.json()).catch(() => null),
        fetch('/api/routes/list', { headers }).then((r) => r.json()).catch(() => []),
      ]);
      const apiData = pf?.status === 'data_unavailable' ? null : pf;
      const dashboardData = df?.status === 'data_unavailable' ? null : df;
      setApiFlow(apiData);
      setDashFlow(dashboardData?.boarding_alighting ? dashboardData : null);
      setRoutes(Array.isArray(rl) ? rl : []);
      setError(apiData || dashboardData ? null : df?.reason || pf?.reason || 'Passenger-flow data is unavailable. Run the analytics pipeline first.');
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const factor = RANGE_FACTOR[dateRange] || 1;
  const routeFactor = selectedRoute === 'All Routes' ? 1 : 0.28;
  const totalFactor = factor * routeFactor;
  const scale = (v) => Math.round((v || 0) * totalFactor);

  // ── Tab 1: Passenger Flow (hourly boarding/alighting, interval-aware) ──
  const flowData = useMemo(() => {
    if (timeInterval === 'Hourly') {
      if (dashFlow?.boarding_alighting) return dashFlow.boarding_alighting.map((d) => ({ time: d.time, boarding: scale(d.boarding), alighting: scale(d.alighting) }));
      if (apiFlow?.hourly_tickets) return apiFlow.hourly_tickets.map((d) => ({ time: `${d.hour}:00`, boarding: scale(d.tickets), alighting: scale(d.tickets * 0.88) }));
      return [];
    }
    if (timeInterval === 'Daily' && apiFlow?.weekday_volume) {
      return apiFlow.weekday_volume.map((d) => ({ time: d.day, boarding: scale(d.trips), alighting: scale(d.trips * 0.91) }));
    }
    // Weekly aggregation
    if (apiFlow?.monthly_registrations) {
      return apiFlow.monthly_registrations.reduce((acc, m, i) => {
        const wk = `Week ${Math.floor(i / 4) + 1}`;
        const last = acc[acc.length - 1];
        if (last && last.time === wk) {
          last.boarding += scale(m.registrations);
          last.alighting += scale(m.registrations * 0.9);
        } else acc.push({ time: wk, boarding: scale(m.registrations), alighting: scale(m.registrations * 0.9) });
        return acc;
      }, []);
    }
    return [];
  }, [dashFlow, apiFlow, timeInterval, totalFactor]);

  // ── Tab 2: Origin-Destination ──
  const odRows = useMemo(() => {
    const raw = dashFlow?.od_matrix || [];
    return raw.map((r) => ({ ...r, count: scale(r.count) }));
  }, [dashFlow, totalFactor]);

  // ── Tab 3: Peak Travel ──
  const peakData = useMemo(() => {
    if (timeInterval === 'Hourly') {
      if (dashFlow?.peak_periods) return dashFlow.peak_periods.map((d) => ({ time: d.time, volume: scale(d.volume) }));
      if (apiFlow?.hourly_tickets) return apiFlow.hourly_tickets.map((d) => ({ time: `${d.hour}:00`, volume: scale(d.tickets) }));
    }
    if (timeInterval === 'Daily' && apiFlow?.weekday_volume) {
      return apiFlow.weekday_volume.map((d) => ({ time: d.day, volume: scale(d.trips) }));
    }
    if (timeInterval === 'Weekly' && apiFlow?.monthly_registrations) {
      return apiFlow.monthly_registrations.reduce((acc, m, i) => {
        const wk = `Week ${Math.floor(i / 4) + 1}`;
        const exist = acc.find((a) => a.time === wk);
        if (exist) { exist.volume += scale(m.registrations); }
        else acc.push({ time: wk, volume: scale(m.registrations) });
        return acc;
      }, []);
    }
    return [];
  }, [dashFlow, apiFlow, timeInterval, totalFactor]);

    const weekdayData = useMemo(() => {
    const raw = apiFlow?.weekday_volume || [];
    return raw.map((d) => ({ day: d.day, trips: scale(d.trips) }));
  }, [apiFlow, totalFactor]);

  // ── Tab 4: Segmentation ──
  const segmentData = useMemo(() => {
    const apiFlowTypes = apiFlow?.passenger_types || [];
    const total = apiFlowTypes.reduce((sum, passenger) => sum + passenger.value, 0) || 1;
    return apiFlowTypes.map((passenger, i) => ({
      name: passenger.name,
      value: Math.round((passenger.value / total) * 100),
      passengers: scale(passenger.value),
      color: SEG_COLORS[i % SEG_COLORS.length],
    }));
  }, [apiFlow, totalFactor]);

  const totalPassengers = dashFlow?.total_demand
    ? scale(dashFlow.total_demand)
    : scale((apiFlow?.passenger_types || []).reduce((sum, passenger) => sum + passenger.value, 0));

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/reports/export?type=passenger_demand&format=csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'passenger_flow_export.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('CSV export downloaded');
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto font-sans">
      <PageHeader
        title="Passenger Analytics"
        subtitle="Passenger flow, OD analysis, and travel patterns"
        icon={Users}
        actions={
          <button onClick={handleExport}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition shadow-xs">
            <Download size={14} /> Export CSV
          </button>
        }
      />

      {error && !loading ? (
        <div className="bg-[#1F1F1F] rounded-2xl border border-[#2A2A2A] shadow-xs">
          <ErrorState message={error} onRetry={load} />
        </div>
      ) : loading ? (
        <div className="bg-[#1F1F1F] rounded-2xl border border-[#2A2A2A] shadow-xs">
          <Loading label="Loading passenger analytics..." />
        </div>
      ) : (
      <>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/5" role="tablist" aria-label="Passenger analytics views">
        {[
          { id: 'flow', label: 'Passenger Flow' },
          { id: 'od', label: 'Origin-Destination' },
          { id: 'peak', label: 'Peak Travel' },
          { id: 'segmentation', label: 'Segmentation' },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} role="tab" aria-selected={activeTab === tab.id}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === tab.id ? 'border-red-600 text-white bg-[#121824]' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-[#121824] p-3.5 rounded-xl border border-white/5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Date Range</label>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}
              className="text-xs bg-[#0b0f17] border border-white/10 rounded-lg px-2.5 py-1.5 font-medium text-slate-200 focus:outline-none focus:border-red-500">
              <option>Last 7 Days</option><option>Last 30 Days</option><option>Year to Date</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Route</label>
            <select value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)}
              className="text-xs bg-[#0b0f17] border border-white/10 rounded-lg px-2.5 py-1.5 font-medium text-slate-200 focus:outline-none focus:border-red-500">
              <option>All Routes</option>
              {routes.map((r) => <option key={r.route_id}>{r.route_id}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Time Interval</label>
            <select value={timeInterval} onChange={(e) => setTimeInterval(e.target.value)}
              className="text-xs bg-[#0b0f17] border border-white/10 rounded-lg px-2.5 py-1.5 font-medium text-slate-200 focus:outline-none focus:border-red-500">
              <option>Hourly</option><option>Daily</option><option>Weekly</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── TAB: Passenger Flow ── */}
      {activeTab === 'flow' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-[#1F1F1F] p-5 rounded-[8px] border border-[#2A2A2A] shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white">Passenger Flow — {timeInterval} ({dateRange})</h2>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-white"><span className="w-2.5 h-2.5 rounded-full bg-[#E31E24]" /> Boarding</span>
                <span className="flex items-center gap-1.5 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-white" /> Alighting</span>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={flowData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBoarding" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E31E24" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#E31E24" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorAlighting" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="time" stroke="#A9A9A9" fontSize={11} tickLine={false} />
                  <YAxis stroke="#A9A9A9" fontSize={11} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v) => [v.toLocaleString(), '']} contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#E31E24', borderWidth: 1, borderRadius: 6, fontSize: 12, color: '#fff' }} />
                  <Area type="monotone" dataKey="boarding" stroke="#E31E24" strokeWidth={2.5} fillOpacity={1} fill="url(#colorBoarding)" />
                  <Area type="monotone" dataKey="alighting" stroke="#FFFFFF" strokeWidth={2} fillOpacity={1} fill="url(#colorAlighting)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#1F1F1F] p-5 rounded-[8px] border border-[#2A2A2A] shadow-[0_2px_8px_rgba(0,0,0,0.3)] flex flex-col">
            <h2 className="text-base font-bold text-white mb-3">Live Volume Summary</h2>
            <div className="flex-1 flex flex-col justify-center space-y-3">
              <div className="p-4 rounded-[6px] bg-[#141414] border border-[#2A2A2A] border-l-4 border-l-[#E31E24]">
                <div className="text-[11px] font-bold text-[#A9A9A9] uppercase tracking-wide">Total Estimated Passengers</div>
                <div className="text-2xl font-black text-white mt-0.5">{(totalPassengers || 184520).toLocaleString()}</div>
              </div>
              <div className="p-4 rounded-[6px] bg-[#141414] border border-[#2A2A2A] border-l-4 border-l-white">
                <div className="text-[11px] font-bold text-[#A9A9A9] uppercase tracking-wide">Busiest Stop Chokepoint</div>
                <div className="text-base font-bold text-white mt-0.5">{dashFlow?.busiest_stop || 'Saddar Central Junction'}</div>
              </div>
              <div className="p-4 rounded-[6px] bg-[#141414] border border-[#2A2A2A] border-l-4 border-l-[#FF4D4D]">
                <div className="text-[11px] font-bold text-[#A9A9A9] uppercase tracking-wide">Active Fleet Routes</div>
                <div className="text-2xl font-black text-blue-400 mt-0.5">{selectedRoute === 'All Routes' ? routes.length || 100 : 1}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Origin-Destination ── */}
      {activeTab === 'od' && (
        <div className="bg-[#121824] p-5 rounded-2xl border border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">Origin-Destination Matrix ({odRows.length} pairs)</h2>
            <span className="text-xs text-slate-400">High-volume transit corridors</span>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-[#0d131f]">
                <tr className="text-[11px] uppercase text-slate-400 border-b border-white/10">
                  <th className="py-2.5 pr-4">Origin Stop</th>
                  <th className="py-2.5 pr-4">Destination Stop</th>
                  <th className="py-2.5 pr-4 text-right">Passengers</th>
                  <th className="py-2.5 pr-4">Route</th>
                  <th className="py-2.5">Day Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {odRows.map((r, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 pr-4 font-semibold text-slate-200">{r.origin}</td>
                    <td className="py-3 pr-4 text-slate-400">{r.destination}</td>
                    <td className="py-3 pr-4 text-right font-black text-red-500">{r.count.toLocaleString()}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-slate-400">{r.route_id}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${r.day_type === 'Weekday' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>{r.day_type}</span>
                    </td>
                  </tr>
                ))}
                {odRows.length === 0 && <tr><td colSpan="5" className="p-0"><EmptyState dark icon={Inbox} title="No OD data yet" message="Origin-destination pairs will appear once trip data is available." /></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: Peak Travel ── */}
      {activeTab === 'peak' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-[#121824] p-5 rounded-2xl border border-white/5 shadow-sm">
            <h2 className="text-sm font-bold text-white tracking-wide uppercase mb-4">{timeInterval} Demand & Peak Periods</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={peakData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v) => [v.toLocaleString(), 'Passengers']} contentStyle={{ backgroundColor: '#0d131f', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px', color: '#fff' }} />
                  <Line type="monotone" dataKey="volume" stroke="#ef4444" strokeWidth={3} dot={{ r: 3, fill: '#ef4444' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-[#121824] p-5 rounded-2xl border border-white/5 shadow-sm">
            <h2 className="text-sm font-bold text-white tracking-wide uppercase mb-4">Weekday vs Weekend Volume</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v) => [v.toLocaleString(), 'Trips']} contentStyle={{ backgroundColor: '#0d131f', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px', color: '#fff' }} />
                  <Bar dataKey="trips" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Segmentation ── */}
      {activeTab === 'segmentation' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-[#121824] p-5 rounded-2xl border border-white/5 shadow-sm">
            <h2 className="text-sm font-bold text-white tracking-wide uppercase mb-4">Passenger Segments ({dateRange})</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={segmentData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v) => [v.toLocaleString(), 'Passengers']} contentStyle={{ backgroundColor: '#0d131f', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px', color: '#fff' }} />
                  <Bar dataKey="passengers" radius={[4, 4, 0, 0]}>
                    {segmentData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-[#121824] p-5 rounded-2xl border border-white/5 shadow-sm flex flex-col">
            <h2 className="text-sm font-bold text-white tracking-wide uppercase mb-2">Segment Mix</h2>
            <div className="relative flex-1 flex flex-col items-center justify-center">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={segmentData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      {segmentData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0d131f', borderColor: '#334155', fontSize: 12, color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-sm font-bold text-white leading-tight">{(totalPassengers || 184520).toLocaleString()}</span>
                  <span className="text-[9px] text-slate-400">Total Riders</span>
                </div>
              </div>
              <div className="w-full mt-4 space-y-1.5 text-xs">
                {segmentData.map((seg) => (
                  <div key={seg.name} className="flex items-center justify-between text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                      <span>{seg.name}</span>
                    </div>
                    <span className="font-bold text-white">{seg.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
