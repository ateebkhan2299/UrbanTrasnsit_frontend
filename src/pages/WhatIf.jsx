import React, { useState, useEffect, useMemo } from 'react';
import {
  Sliders, Play, TrendingDown, TrendingUp, Info, RefreshCw,
  Users, Clock, Timer, AlertTriangle, History, Minus, Plus
} from 'lucide-react';
import { simulateWhatIf, getWhatIfScenarios, getRoutesList, getRouteById } from '../api/client';
import { PageHeader } from '../components/ui';

const CHANGE_TYPES = [
  { id: 'frequency', label: 'Increase Frequency (more trips)', unit: '%', min: 0, max: 100, step: 5, icon: Timer },
  { id: 'capacity', label: 'Increase Capacity (bigger vehicles)', unit: '%', min: 0, max: 100, step: 5, icon: Users },
  { id: 'add_trip', label: 'Add Peak Trips', unit: 'trips', min: 1, max: 10, step: 1, icon: Plus },
  { id: 'remove_trip', label: 'Remove Off-Peak Trips', unit: 'trips', min: 1, max: 10, step: 1, icon: Minus },
];

const fmt1 = (v) => (v == null ? '—' : Number(v).toFixed(1));

const Delta = ({ before, after, suffix = '' }) => {
  const b = Number(before), a = Number(after);
  if (!isFinite(b) || !isFinite(a)) return <span className="text-slate-400">—</span>;
  const diff = a - b;
  if (Math.abs(diff) < 0.05) return <span className="text-slate-400 font-bold flex items-center gap-0.5"><Minus size={11} /> no change</span>;
  const pct = Math.abs((diff / (b || 1)) * 100);
  const improved = diff < 0; // lower is better for all four metrics
  return (
    <span className={`font-bold flex items-center gap-0.5 ${improved ? 'text-emerald-600' : 'text-rose-600'}`}>
      {improved ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
      {diff > 0 ? '+' : ''}{fmt1(diff)}{suffix} ({diff > 0 ? '+' : '-'}{pct.toFixed(0)}%)
    </span>
  );
};

export default function WhatIf() {
  const [routeOptions, setRouteOptions] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [baseline, setBaseline] = useState(null);
  const [changeType, setChangeType] = useState('frequency');
  const [changeValue, setChangeValue] = useState(25);
  const [loading, setLoading] = useState(false);
  const [baselineLoading, setBaselineLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);

  const activeCfg = CHANGE_TYPES.find((c) => c.id === changeType);

  const loadRoutes = () => {
    getRoutesList()
      .then((res) => {
        const rows = res.data || [];
        setRouteOptions(rows);
        if (!selectedRoute && rows.length) setSelectedRoute(rows[0].route_id);
      })
      .catch(() => setError('Failed to load routes.'));
  };

  const loadHistory = () => {
    setHistoryLoading(true);
    getWhatIfScenarios()
      .then((res) => setHistory(res.data || []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  };

  useEffect(() => { loadRoutes(); loadHistory(); }, []);

  useEffect(() => {
    if (!selectedRoute) return;
    setBaselineLoading(true);
    setResult(null);
    getRouteById(selectedRoute)
      .then((res) => setBaseline(res.data))
      .catch(() => setBaseline(null))
      .finally(() => setBaselineLoading(false));
  }, [selectedRoute]);

  const handleTypeChange = (id) => {
    const cfg = CHANGE_TYPES.find((c) => c.id === id);
    setChangeType(id);
    setChangeValue(id === 'frequency' || id === 'capacity' ? 25 : 2);
  };

  const handleSimulate = (e) => {
    e.preventDefault();
    if (!selectedRoute) return;
    setLoading(true);
    setError(null);
    simulateWhatIf({
      route_id: selectedRoute,
      change_type: changeType,
      change_value: Number(changeValue),
    })
      .then((res) => {
        const b = res.data?.before;
        const a = res.data?.after;
        if (b && a) setResult({ before: b, after: a, is_estimate: res.data.is_estimate !== false });
        else setError('Simulation returned an unexpected payload.');
        loadHistory();
      })
      .catch((err) => {
        console.error(err);
        setError('Simulation failed — check API connection.');
      })
      .finally(() => setLoading(false));
  };

  const metricRows = useMemo(() => {
    if (!result) return [];
    return [
      { key: 'occupancy', label: 'Crowding (Occupancy)', icon: Users, before: result.before.occupancy_pct, after: result.after.occupancy_pct, suffix: '%' },
      { key: 'wait', label: 'Waiting Time', icon: Clock, before: result.before.avg_wait_min, after: result.after.avg_wait_min, suffix: 'm' },
      { key: 'delay', label: 'Avg Delay', icon: Timer, before: result.before.avg_delay_min, after: result.after.avg_delay_min, suffix: 'm' },
      { key: 'risk', label: 'Overcrowd Risk', icon: AlertTriangle, before: result.before.overcrowd_risk_pct, after: result.after.overcrowd_risk_pct, suffix: '%' },
    ];
  }, [result]);

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto font-sans">
      {/* Header */}
      <PageHeader
        title="What-If Simulator"
        subtitle="Simulate frequency, capacity, and trip changes — see projected occupancy, wait, and delay impact"
        icon={Sliders}
        actions={
          <button onClick={loadHistory} title="Refresh history" aria-label="Refresh scenario history" className="p-2 rounded-lg border border-[#2A2A2A] text-slate-500 hover:bg-[#141414]">
            <RefreshCw size={15} />
          </button>
        }
      />

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Inputs */}
        <div className="bg-[#1F1F1F] p-6 rounded border border-[#2A2A2A] shadow-xs">
          <h2 className="text-sm font-bold text-white mb-4">Simulation Setup</h2>
          <form onSubmit={handleSimulate} className="space-y-5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">Select Route ({routeOptions.length})</label>
              <select
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-blue-500"
              >
                {routeOptions.map((r) => (
                  <option key={r.route_id} value={r.route_id}>{r.route_name || r.route_id}</option>
                ))}
              </select>
            </div>

            {/* Baseline snapshot */}
            <div className="p-3.5 rounded bg-[#141414] border border-[#2A2A2A]">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-2">Current Route State</div>
              {baselineLoading ? (
                <div className="text-xs text-slate-400">Loading route metrics...</div>
              ) : baseline ? (
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-[10px] text-slate-400">Occupancy</div>
                    <div className="text-sm font-bold text-white">{fmt1(baseline.occupancy_pct)}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Delay</div>
                    <div className="text-sm font-bold text-white">{fmt1(baseline.avg_delay_minutes)}m</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">On-Time</div>
                    <div className="text-sm font-bold text-white">{fmt1(baseline.on_time_pct)}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Category</div>
                    <div className="text-[11px] font-bold text-[#E31E24]">{baseline.performance_category || '—'}</div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400">Route metrics unavailable.</div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">Change Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CHANGE_TYPES.map((c) => {
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleTypeChange(c.id)}
                      className={`flex items-center gap-2 p-2.5 rounded border text-left text-[11px] font-semibold transition ${
                        changeType === c.id
                          ? 'border-blue-400 bg-blue-50 text-blue-700'
                          : 'border-[#2A2A2A] bg-[#1F1F1F] text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <Icon size={14} className="shrink-0" />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-200 mb-2">
                <span>
                  {activeCfg.unit === '%' ? 'Improvement Input' : (changeType === 'add_trip' ? 'Trips to Add' : 'Trips to Remove')}
                </span>
                <span className={`font-bold px-2 py-0.5 rounded-lg border ${changeType === 'remove_trip' ? 'text-rose-600 bg-rose-50 border-rose-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200'}`}>
                  {changeValue}{activeCfg.unit === '%' ? '%' : ` ${activeCfg.unit}`}
                </span>
              </div>
              <input
                type="range"
                min={activeCfg.min}
                max={activeCfg.max}
                step={activeCfg.step}
                value={changeValue}
                onChange={(e) => setChangeValue(parseInt(e.target.value, 10))}
                className={`w-full cursor-pointer ${changeType === 'remove_trip' ? 'accent-rose-600' : 'accent-blue-600'}`}
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>{activeCfg.min}{activeCfg.unit === '%' ? '%' : ''}</span>
                <span>{activeCfg.max}{activeCfg.unit === '%' ? '%' : ''}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !selectedRoute}
              className="w-full py-2.5 bg-[#E31E24] hover:bg-[#b81419] active:scale-[0.99] disabled:opacity-60 text-white font-bold rounded text-xs transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              <Play size={14} />
              {loading ? 'Running Simulation...' : 'Run Simulation'}
            </button>

            {error && <div role="alert" className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-lg">{error}</div>}
          </form>
        </div>

        {/* Right: Results */}
        <div className="bg-[#1F1F1F] p-6 rounded border border-[#2A2A2A] shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white">Estimated Impact</h2>
            {result?.is_estimate && (
              <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase">
                <Info size={11} /> Model Estimate
              </span>
            )}
          </div>

          {!result ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
              <Sliders size={36} className="text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-500">No simulation run yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[260px]">
                Choose a route and change type on the left, then hit <span className="font-semibold">Run Simulation</span> to project the impact.
              </p>
              {baseline && (
                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  <div className="p-2.5 bg-[#141414] rounded border border-[#2A2A2A]">
                    <div className="text-[10px] text-slate-400">Occupancy</div>
                    <div className="text-lg font-bold text-white">{fmt1(baseline.occupancy_pct)}%</div>
                  </div>
                  <div className="p-2.5 bg-[#141414] rounded border border-[#2A2A2A]">
                    <div className="text-[10px] text-slate-400">Delay</div>
                    <div className="text-lg font-bold text-white">{fmt1(baseline.avg_delay_minutes)}m</div>
                  </div>
                  <div className="p-2.5 bg-[#141414] rounded border border-[#2A2A2A]">
                    <div className="text-[10px] text-slate-400">On-Time</div>
                    <div className="text-lg font-bold text-white">{fmt1(baseline.on_time_pct)}%</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded bg-blue-50 border border-blue-100 text-[11px] text-blue-800 font-medium">
                Scenario: <span className="font-bold">{routeOptions.find((r) => r.route_id === selectedRoute)?.route_name || selectedRoute}</span>
                {' · '}{activeCfg.label}{' · '}
                <span className="font-bold">{changeValue}{activeCfg.unit === '%' ? '%' : ` ${activeCfg.unit}`}</span>
              </div>

              {metricRows.map((m) => {
                const Icon = m.icon;
                return (
                  <div key={m.key} className="p-3.5 rounded bg-[#141414] border border-[#2A2A2A]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                        <span className="p-1.5 bg-[#1F1F1F] rounded-lg border border-[#2A2A2A]"><Icon size={13} /></span>
                        {m.label}
                      </span>
                      <Delta before={m.before} after={m.after} suffix={m.suffix} />
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold text-white pl-7">
                      <span className="text-slate-400">{fmt1(m.before)}{m.suffix}</span>
                      <span className="text-slate-300">→</span>
                      <span>{fmt1(m.after)}{m.suffix}</span>
                    </div>
                  </div>
                );
              })}

              <p className="text-[11px] text-slate-400 text-center pt-2">
                Values are model-estimated projections (heuristic simulation) — not guarantees.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Scenario history */}
      <div className="bg-[#1F1F1F] rounded border border-[#2A2A2A] shadow-xs overflow-hidden">
        <div className="p-5 pb-3 flex items-center gap-2">
          <History size={15} className="text-[#E31E24]" />
          <h2 className="text-sm font-bold text-white">Simulation History</h2>
          <span className="text-[10px] font-bold bg-[#1B1B1B] text-slate-500 px-2 py-0.5 rounded-full">{history.length} saved</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[10px] uppercase bg-[#141414] text-slate-400">
              <tr>
                <th className="px-4 py-2.5">When</th>
                <th className="px-4 py-2.5">Route</th>
                <th className="px-4 py-2.5">Change</th>
                <th className="px-4 py-2.5">Occupancy</th>
                <th className="px-4 py-2.5">Wait</th>
                <th className="px-4 py-2.5">Delay</th>
                <th className="px-4 py-2.5">Risk</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => {
                const b = h.results?.before || {};
                const a = h.results?.after || {};
                const inp = h.inputs || {};
                return (
                  <tr key={h.id} className="border-t border-[#2A2A2A] hover:bg-[#141414]">
                    <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{(h.created_at || '').slice(0, 16)}</td>
                    <td className="px-4 py-2.5 font-bold text-[#E31E24]">{inp.route_id}</td>
                    <td className="px-4 py-2.5">{inp.change_type} {inp.change_value}</td>
                    <td className="px-4 py-2.5">{fmt1(b.occupancy_pct)}% → <span className="font-bold">{fmt1(a.occupancy_pct)}%</span></td>
                    <td className="px-4 py-2.5">{fmt1(b.avg_wait_min)}m → <span className="font-bold">{fmt1(a.avg_wait_min)}m</span></td>
                    <td className="px-4 py-2.5">{fmt1(b.avg_delay_min)}m → <span className="font-bold">{fmt1(a.avg_delay_min)}m</span></td>
                    <td className="px-4 py-2.5">{fmt1(b.overcrowd_risk_pct)}% → <span className="font-bold">{fmt1(a.overcrowd_risk_pct)}%</span></td>
                  </tr>
                );
              })}
              {!history.length && !historyLoading && (
                <tr><td colSpan="7" className="px-4 py-6 text-center text-slate-400">No simulations yet — run one above.</td></tr>
              )}
              {historyLoading && <tr><td colSpan="7" className="px-4 py-6 text-center text-slate-400">Loading history...</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
