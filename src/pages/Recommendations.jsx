import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw, Download, Search, Lightbulb, Zap, Users, Timer,
  CalendarClock, Sparkles, Sliders, ChevronRight, Filter, AlertTriangle, Layers
} from 'lucide-react';
import { getRecommendations, getRoutesList } from '../api/client';
import { Loading, ErrorState, PageHeader, StatCard, EmptyState } from '../components/ui';

const PRIORITY_META = {
  CRITICAL: { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500', ring: 'border-rose-300' },
  HIGH: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500', ring: 'border-orange-300' },
  MEDIUM: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', ring: 'border-amber-300' },
  LOW: { bg: 'bg-sky-100', text: 'text-sky-700', dot: 'bg-sky-500', ring: 'border-sky-300' },
};
const CATEGORY_ICON = {
  Capacity: Users, 'Signal Priority': Zap, Headway: Timer,
  Scheduling: CalendarClock, General: Sparkles,
};
const PRIORITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const PAGE = 12;

export default function Recommendations() {
  const [recs, setRecs] = useState([]);
  const [routeOptions, setRouteOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [priorityFilter, setPriorityFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState(PAGE);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.allSettled([getRecommendations(), getRoutesList()])
      .then(([r, rl]) => {
        if (r.status === 'fulfilled') setRecs(r.value.data || []);
        else setError('Failed to load recommendations from API.');
        if (rl.status === 'fulfilled') setRouteOptions(rl.value.data || []);
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const priorityCounts = useMemo(() => {
    const c = {};
    recs.forEach((r) => { c[r.priority] = (c[r.priority] || 0) + 1; });
    return c;
  }, [recs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return recs
      .filter((r) => {
        if (priorityFilter && r.priority !== priorityFilter) return false;
        if (routeFilter && r.route_id !== routeFilter) return false;
        if (q && !(`${r.title} ${r.description} ${r.route_id || ''}`.toLowerCase().includes(q))) return false;
        return true;
      })
      .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));
  }, [recs, priorityFilter, routeFilter, search]);

  const stats = useMemo(() => {
    const routesCovered = new Set(recs.map((r) => r.route_id).filter(Boolean)).size;
    const categories = {};
    recs.forEach((r) => { categories[r.category || 'General'] = (categories[r.category || 'General'] || 0) + 1; });
    return {
      total: recs.length,
      actionable: recs.filter((r) => r.priority === 'CRITICAL' || r.priority === 'HIGH').length,
      routesCovered,
      categories,
    };
  }, [recs]);

  const shown = filtered.slice(0, visible);

  const reset = () => { setPriorityFilter(''); setRouteFilter(''); setSearch(''); setVisible(PAGE); };

  const exportCsv = () => {
    const header = ['id', 'priority', 'category', 'route_id', 'title', 'description', 'expected_impact'];
    const lines = [header.join(',')].concat(
      filtered.map((r) =>
        [r.id, r.priority, r.category || '', r.route_id || '', `"${(r.title || '').replace(/"/g, '""')}"`,
         `"${(r.description || '').replace(/"/g, '""')}"`, `"${(r.expected_impact || '').replace(/"/g, '""')}"`].join(',')
      )
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'recommendations.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-5 max-w-[1600px] mx-auto">
        <PageHeader title="Recommendations" subtitle="Rule-based actionable insights generated from live route performance analytics" icon={Lightbulb} />
        <div className="bg-[#1F1F1F] rounded border border-[#2A2A2A] shadow-xs">
          <Loading label="Generating rule-based recommendations from route analytics..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-5 max-w-[1600px] mx-auto">
        <PageHeader title="Recommendations" subtitle="Rule-based actionable insights generated from live route performance analytics" icon={Lightbulb} />
        <div className="bg-[#1F1F1F] rounded border border-[#2A2A2A] shadow-xs">
          <ErrorState message={error} onRetry={load} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto font-sans">
      {/* Header */}
      <PageHeader
        title="Operational Recommendations & Action Engine"
        subtitle="AI-driven actionable adjustments for fleet frequency, route capacity, and choke-point prevention"
        icon={Lightbulb}
        actions={
          <div className="flex gap-2">
            <button onClick={load} title="Refresh" aria-label="Refresh recommendations" className="p-2 rounded border border-[#2A2A2A] text-slate-400 hover:text-white hover:bg-white/5 transition">
              <RefreshCw size={15} />
            </button>
            <button onClick={exportCsv} className="inline-flex items-center gap-2 bg-[#E31E24] hover:bg-white hover:text-[#E31E24] hover:border hover:border-[#E31E24] text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-[4px] transition shadow-md shadow-red-600/30 group">
              <Download size={14} className="transition-transform group-hover:translate-y-0.5" />
              <span>Export CSV</span>
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard dark label="Total Recommendations" value={stats.total} sub={`across ${stats.routesCovered} routes`} icon={Lightbulb} tone="blue" />
        <StatCard dark label="Critical + High" value={stats.actionable} sub="need attention now" icon={AlertTriangle} tone="rose" />
        <StatCard dark label="Showing" value={filtered.length} sub="after filters" icon={Filter} tone="slate" />
        <StatCard
          label="Top Category"
          value={Object.entries(stats.categories).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'}
          sub={`${Object.values(stats.categories).sort((a, b) => b - a)[0] || 0} items`}
          icon={Layers}
          tone="violet"
        />
      </div>

      {/* Filters */}
      <div className="bg-[#1F1F1F] p-4 rounded border border-[#2A2A2A] shadow-xs flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Priority</label>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => { setPriorityFilter(''); setVisible(PAGE); }}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${!priorityFilter ? 'bg-[#1F1F1F] text-white border-slate-800' : 'bg-[#141414] text-slate-500 border-[#2A2A2A] hover:border-slate-400'}`}
            >
              All ({recs.length})
            </button>
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
              <button
                key={p}
                onClick={() => { setPriorityFilter(priorityFilter === p ? '' : p); setVisible(PAGE); }}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${priorityFilter === p ? `${PRIORITY_META[p].bg} ${PRIORITY_META[p].text} ${PRIORITY_META[p].ring}` : 'bg-[#141414] text-slate-500 border-[#2A2A2A] hover:border-slate-400'}`}
              >
                {p} ({priorityCounts[p] || 0})
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-[180px]">
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Route</label>
          <select
            value={routeFilter}
            onChange={(e) => { setRouteFilter(e.target.value); setVisible(PAGE); }}
            className="w-full text-xs bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 font-medium text-slate-200 focus:outline-none"
          >
            <option value="">All Routes</option>
            {routeOptions.map((r) => (
              <option key={r.route_id} value={r.route_id}>{r.route_name || r.route_id}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Search</label>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setVisible(PAGE); }}
              placeholder="Search title, route, impact..."
              className="w-full text-xs bg-[#141414] border border-[#2A2A2A] rounded-lg pl-8 pr-3 py-2 font-medium text-slate-200 focus:outline-none"
            />
          </div>
        </div>

        <button onClick={reset} className="text-xs font-semibold text-slate-500 hover:text-white px-2 py-2">
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Feed */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-[#E31E24]" />
            <h2 className="text-sm font-bold text-white">Actionable Insights ({filtered.length})</h2>
          </div>

          {shown.length === 0 && (
            <div className="bg-[#1F1F1F] rounded border border-dashed border-[#2A2A2A]">
              <EmptyState
                icon={Lightbulb}
                title="No recommendations found"
                message="No recommendations match the current filters."
                action={{ label: 'Reset filters', onClick: reset }}
              />
            </div>
          )}

          {shown.map((r) => {
            const meta = PRIORITY_META[r.priority] || PRIORITY_META.LOW;
            const Icon = CATEGORY_ICON[r.category] || Lightbulb;
            return (
              <div key={r.id} className="bg-[#1F1F1F] border border-[#2A2A2A] hover:border-[#E31E24]/50 rounded-[4px] p-5 shadow-sm transition-all duration-200 group">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2 mb-2.5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-[4px] bg-[#E31E24]/10 border border-[#E31E24]/30 text-[#E31E24] flex items-center justify-center shrink-0 mt-0.5">
                      <Icon size={16} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white group-hover:text-red-400 transition-colors leading-snug">{r.title}</h3>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-[2px] ${
                          r.priority === 'CRITICAL' ? 'bg-[#E31E24]/20 text-[#E31E24] border border-[#E31E24]/40' :
                          r.priority === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' :
                          r.priority === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                          'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" /> {r.priority}
                        </span>
                        <span className="text-[10px] font-semibold bg-[#141414] border border-[#2A2A2A] text-slate-300 px-2 py-0.5 rounded-[2px]">
                          {r.category || 'General'}
                        </span>
                        {r.route_id && (
                          <span className="text-[10px] font-bold text-[#E31E24] bg-[#E31E24]/10 border border-[#E31E24]/20 px-2 py-0.5 rounded-[2px]">{r.route_id}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed mb-3 pl-0 sm:pl-11">{r.description}</p>

                <div className="bg-[#141414] border border-[#2A2A2A] p-3 rounded-[4px] text-xs text-emerald-400 sm:ml-11 flex items-start gap-2">
                  <span className="font-black uppercase tracking-wider text-[10px] text-slate-400 shrink-0 mt-0.5">Impact:</span>
                  <span className="font-medium text-slate-200">{r.expected_impact}</span>
                </div>
              </div>
            );
          })}

          {visible < filtered.length && (
            <button
              onClick={() => setVisible((v) => v + PAGE)}
              className="w-full py-2.5 bg-[#1F1F1F] border border-[#2A2A2A] rounded text-xs font-bold text-slate-300 hover:bg-[#141414] transition"
            >
              Load more ({filtered.length - visible} remaining)
            </button>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4 self-start">
          <div className="bg-[#1F1F1F] p-5 rounded border border-[#2A2A2A] shadow-xs">
            <h3 className="text-sm font-bold text-white mb-3">By Category</h3>
            <div className="space-y-2.5">
              {Object.entries(stats.categories).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
                const Icon = CATEGORY_ICON[cat] || Lightbulb;
                return (
                  <div key={cat} className="flex items-center gap-2 text-xs">
                    <Icon size={13} className="text-slate-400" />
                    <span className="flex-1 text-slate-300">{cat}</span>
                    <div className="w-24 h-2 bg-[#1B1B1B] rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(count / stats.total) * 100}%` }} />
                    </div>
                    <span className="font-bold text-white w-7 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded shadow-md text-white">
            <div className="flex items-center gap-2 mb-2">
              <Sliders size={16} />
              <h3 className="text-sm font-bold">What-If Simulator</h3>
            </div>
            <p className="text-xs text-blue-100 leading-relaxed mb-4">
              Pick any recommendation and test its impact — simulate frequency, capacity,
              or trip changes and see projected occupancy, wait time, and delay before committing.
            </p>
            <Link
              to="/whatif"
              className="inline-flex items-center gap-1.5 bg-[#1F1F1F] text-blue-700 text-xs font-bold px-4 py-2 rounded-lg hover:bg-blue-50 transition"
            >
              Open Simulator <ChevronRight size={14} />
            </Link>
          </div>

          <div className="bg-[#1F1F1F] p-5 rounded border border-[#2A2A2A] shadow-xs">
            <h3 className="text-sm font-bold text-white mb-2">Priority Mix</h3>
            <div className="flex h-3 rounded-full overflow-hidden mb-3">
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
                <div
                  key={p}
                  className="h-full"
                  title={`${p}: ${priorityCounts[p] || 0}`}
                  style={{
                    width: `${((priorityCounts[p] || 0) / (recs.length || 1)) * 100}%`,
                    background: p === 'CRITICAL' ? '#F43F5E' : p === 'HIGH' ? '#F97316' : p === 'MEDIUM' ? '#F59E0B' : '#0EA5E9',
                  }}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
                <div key={p} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${PRIORITY_META[p].dot}`} />
                  <span className="text-slate-500">{p}</span>
                  <span className="font-bold text-white ml-auto">{priorityCounts[p] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
