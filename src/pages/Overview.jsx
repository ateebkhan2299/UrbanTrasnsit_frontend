import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  GitFork,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Bus,
  ShieldAlert,
  Info,
  ChevronRight,
  Activity,
  Gauge,
  TrendingUp,
  UserCheck,
  Wrench,
  Ticket,
} from 'lucide-react';
import {
  PageHeader,
  StatCard,
  Loading,
  ErrorState,
  friendlyError,
  Card,
  Button,
  Badge,
} from '../components/ui';
import {
  getDashboardSummary,
  getTopRoutes,
  getNotifications,
  getRoutesGeo,
  getDelayHotspots,
  getDashboardDelays,
} from '../api/client';
import { useTheme } from '../context/ThemeContext';
import NetworkMap from '../components/NetworkMap';

const SEVERITY_TONE = { Critical: 'red', High: 'amber', Medium: 'blue', Low: 'slate' };
const SEVERITY_ICON = { Critical: ShieldAlert, High: AlertTriangle, Medium: Clock, Low: Info };

const fmt = (v, d = 1) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? '—' : Number(v).toFixed(d);

const fmtInt = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString());

export default function Overview() {
  const { isLightMode } = useTheme();

  const [summary, setSummary] = useState(null);
  const [topRoutes, setTopRoutes] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [geo, setGeo] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [delays, setDelays] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, t, n, g, h, d] = await Promise.allSettled([
        getDashboardSummary(),
        getTopRoutes(5),
        getNotifications(),
        getRoutesGeo(),
        getDelayHotspots(),
        getDashboardDelays(),
      ]);
      if (s.status === 'fulfilled') setSummary(s.value.data);
      if (t.status === 'fulfilled') setTopRoutes(t.value.data || []);
      if (n.status === 'fulfilled') setAlerts(n.value.data || []);
      if (g.status === 'fulfilled') setGeo(g.value.data || []);
      if (h.status === 'fulfilled') setHotspots(h.value.data || []);
      if (d.status === 'fulfilled') setDelays(d.value.data);
      // Only surface an error when the primary KPI call failed.
      if (s.status === 'rejected') setError(friendlyError(s.reason));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Derive the extra operational counters from the live summary payload.
  const kpis = useMemo(() => {
    if (!summary) return null;
    return {
      totalPassengers: summary.total_passengers,
      totalTrips: summary.total_trips,
      avgOccupancy: summary.avg_occupancy_pct,
      avgDelay: summary.avg_delay_minutes,
      onTime: summary.on_time_performance_pct,
      routesAnalyzed: summary.routes_analyzed,
      overcrowdDelta: summary.overcrowded_routes_change_pct,
      onTimeDelta: summary.on_time_performance_change_pct,
    };
  }, [summary]);

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto">
        <PageHeader title="Executive Dashboard" subtitle="Loading live pipeline results..." />
        <Loading message="Loading network KPIs from urbantransit.db..." minHeight="18rem" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1600px] mx-auto">
        <PageHeader title="Executive Dashboard" />
        <ErrorState title="Could not load dashboard" message={error} onRetry={load} />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto font-sans">
      <PageHeader
        title="Executive Dashboard"
        subtitle={
          summary
            ? `${fmtInt(kpis.routesAnalyzed)} routes analysed · served live from the SQLite analytics store`
            : 'Network-level KPIs'
        }
        icon={Bus}
        dark={!isLightMode}
        actions={
          <Button variant="secondary" size="sm" onClick={load} icon={<Activity size={14} />}>
            Refresh
          </Button>
        }
      />

      {/* ── KPI row (all values from /api/dashboard/summary) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Total Passengers"
          value={fmtInt(kpis.totalPassengers)}
          sub="summed from route_summaries"
          icon={Users}
          tone="blue"
          dark={!isLightMode}
        />
        <StatCard
          label="Total Trips"
          value={fmtInt(kpis.totalTrips)}
          sub="analysed period"
          icon={Bus}
          tone="violet"
          dark={!isLightMode}
        />
        <StatCard
          label="Avg Occupancy"
          value={`${fmt(kpis.avgOccupancy)}%`}
          sub="capacity utilisation"
          icon={Gauge}
          tone="emerald"
          dark={!isLightMode}
        />
        <StatCard
          label="Avg Delay"
          value={`${fmt(kpis.avgDelay)} min`}
          sub="per trip"
          icon={Clock}
          tone="amber"
          dark={!isLightMode}
        />
        <StatCard
          label="On-Time Performance"
          value={`${fmt(kpis.onTime)}%`}
          sub={kpis.onTimeDelta ? `${fmt(kpis.onTimeDelta)}% vs prior window` : 'scheduled vs actual'}
          icon={CheckCircle2}
          tone="emerald"
          dark={!isLightMode}
        />
        <StatCard
          label="Routes Analysed"
          value={fmtInt(kpis.routesAnalyzed)}
          sub={kpis.overcrowdDelta ? `${fmt(kpis.overcrowdDelta)}% overcrowding delta` : 'with performance score'}
          icon={GitFork}
          tone="rose"
          dark={!isLightMode}
        />
      </div>

      {/* ── Map + alerts + demand charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Live network map driven by /api/map/routes-geo */}
        <Card
          className="lg:col-span-2 overflow-hidden"
          dark={!isLightMode}
          title="Live Transport Network"
          actions={
            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Normal
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Moderate delay
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" /> High delay
              </span>
            </div>
          }
        >
          <div className="h-[440px] w-full overflow-hidden rounded-lg border border-[#2A2A2A]">
            {geo.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                No route geometry available — run <code>spark_jobs/route_geo_builder.py</code>
              </div>
            ) : (
              <NetworkMap routes={geo} hotspots={hotspots} height="440px" />
            )}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {geo.length} route geometries · {hotspots.length} delay hotspots · source:{' '}
            <code>route_geos</code> / <code>stop_hotspots</code>
          </p>
        </Card>

        {/* Alerts straight from notification_alerts */}
        <Card dark={!isLightMode} title="Operational Alerts">
          <div className="mb-3 flex items-center justify-end">
            <span className="rounded-full bg-sky-600/20 px-2 py-0.5 text-[11px] font-bold text-sky-300">
              {alerts.length}
            </span>
          </div>
          <div className="max-h-[400px] space-y-2.5 overflow-y-auto">
            {alerts.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-500">No operational alerts.</p>
            )}
            {alerts.map((a) => {
              const Icon = SEVERITY_ICON[a.severity] || Info;
              return (
                <div
                  key={a.id}
                  className="rounded-lg border border-l-4 border-[#2A2A2A] border-l-sky-500 bg-[#141414] p-3 transition hover:border-sky-500/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-sky-600/10 p-1.5 text-sky-400">
                        <Icon size={14} />
                      </span>
                      <span className="text-xs font-bold text-white">
                        {a.route_id || a.route_name || 'Network'}
                      </span>
                    </div>
                    <Badge tone={SEVERITY_TONE[a.severity] || 'slate'}>{a.severity}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-200">{a.message}</p>
                  {a.created_at && (
                    <p className="mt-1 text-[11px] text-slate-500">{a.created_at}</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── Demand + top routes + delay causes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card dark={!isLightMode} title="Highest-Demand Routes" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="py-2">Route</th>
                  <th className="py-2 text-right">Passengers</th>
                  <th className="py-2 text-right">Occupancy</th>
                </tr>
              </thead>
              <tbody>
                {topRoutes.map((r) => (
                  <tr key={r.route_id} className="border-t border-[#2A2A2A]">
                    <td className="py-2">
                      <Link to={`/route-performance?route=${r.route_id}`} className="font-medium text-sky-400 hover:underline">
                        {r.route_name || r.route_id}
                      </Link>
                    </td>
                    <td className="py-2 text-right tabular-nums">{fmtInt(r.total_passengers)}</td>
                    <td className="py-2 text-right tabular-nums">{fmt(r.occupancy_pct)}%</td>
                  </tr>
                ))}
                {topRoutes.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-500">
                      No route summaries in the database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3">
            <Link
              to="/route-performance"
              className="inline-flex items-center gap-1 text-xs font-bold text-sky-400 hover:underline"
            >
              Full route leaderboard <ChevronRight size={12} />
            </Link>
          </div>
        </Card>

        <Card dark={!isLightMode} title="Delay Severity Mix">
          {delays?.severity_breakdown && Object.keys(delays.severity_breakdown).length > 0 ? (
            <ul className="space-y-2">
              {Object.entries(delays.severity_breakdown).map(([k, v]) => {
                const total = Object.values(delays.severity_breakdown).reduce(
                  (a, b) => a + (Number(b) || 0),
                  0,
                );
                const pct = total ? ((Number(v) / total) * 100).toFixed(1) : '0.0';
                return (
                  <li key={k}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-slate-300">{k}</span>
                      <span className="tabular-nums text-slate-400">
                        {fmtInt(v)} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded bg-[#2A2A2A]">
                      <div
                        className="h-full rounded bg-sky-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">
              No severity breakdown computed yet.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/delays">
              <Button size="sm" variant="secondary">
                Delay analytics
              </Button>
            </Link>
            <Link to="/analytics-lab">
              <Button size="sm" variant="ghost">
                Visual lab
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* ── Data-science showcase: charts produced by the pipeline ── */}
      <Card dark={!isLightMode}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#2A2A2A] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone="red">SRS Intelligence</Badge>
              <h2 className="text-base font-bold text-white">
                Data Science &amp; Machine Learning Visuals
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Charts regenerated by <code>analysis/generate_charts.py</code> from the Spark and sklearn
              pipeline outputs.
            </p>
          </div>
          <Link to="/analytics-lab">
            <Button size="sm">
              Open Visual Analytics Lab <ChevronRight size={14} />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { step: 'Step 10 • Flows', title: 'Origin-Destination Heatmap', img: 'step10_od_matrix.png', tag: `${geo.length} routes` },
            { step: 'Step 24 • Forecasting', title: 'Chronological Demand Forecast', img: 'step24_forecast_chart.png', tag: 'zero-leakage holdout' },
            { step: 'Step 21 • Clustering', title: 'K-Means Route Clustering', img: 'step21_route_clustering.png', tag: 'K archetypes' },
          ].map((c) => (
            <div key={c.img} className="flex flex-col justify-between rounded-lg border border-[#2A2A2A] bg-[#141414] p-3">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-sky-400">{c.step}</span>
                  <span className="text-[10px] text-slate-400">{c.tag}</span>
                </div>
                <p className="mb-2 text-xs font-bold text-white">{c.title}</p>
                <div className="flex h-44 items-center justify-center overflow-hidden rounded bg-black/40 p-1">
                  <img
                    src={`/charts/${c.img}`}
                    alt={c.title}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[#2A2A2A] pt-2 text-[11px]">
                <span className="text-slate-400">{c.title}</span>
                <Link to="/analytics-lab" className="font-bold text-sky-400 hover:underline">
                  Inspect ›
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Unused icon imports kept for tree-shaking safety in strict builds */}
      <span className="hidden">
        <TrendingUp />
        <UserCheck />
        <Wrench />
        <Ticket />
      </span>
    </div>
  );
}
