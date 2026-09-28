import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, X, RefreshCw, Navigation, AlertTriangle, Users, Clock, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRoutesGeo, getDelayHotspots, getDelayedRoutes, getRoutesList } from '../api/client';
import { Loading, ErrorState, PageHeader, SearchInput } from '../components/ui';

const STATUS_COLORS = {
  normal: '#10B981',
  moderate: '#F59E0B',
  high: '#EF4444',
  overcrowded: '#8B5CF6',
};
const STATUS_LABELS = {
  normal: 'Normal',
  moderate: 'Moderate Delay',
  high: 'High Delay',
  overcrowded: 'Overcrowded',
};

function FitBounds({ routes }) {
  const map = useMap();
  const key = routes.map((r) => r.route_id).join(',');
  useEffect(() => {
    if (!routes.length) return;
    const pts = routes.flatMap((r) => r.path || []).filter((p) => p.lat != null && p.lon != null);
    if (!pts.length) return;
    const bounds = [
      [Math.min(...pts.map((p) => p.lat)), Math.min(...pts.map((p) => p.lon))],
      [Math.max(...pts.map((p) => p.lat)), Math.max(...pts.map((p) => p.lon))],
    ];
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: routes.length === 1 ? 13 : 11 });
  }, [key, map]);
  return null;
}

export default function RouteMapVisualization() {
  const navigate = useNavigate();
  const [geoRoutes, setGeoRoutes] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [routeMetrics, setRouteMetrics] = useState([]);
  const [routeOptions, setRouteOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [crowdingLevel, setCrowdingLevel] = useState('');
  const [searchRoute, setSearchRoute] = useState('');
  const [hoveredId, setHoveredId] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.allSettled([getRoutesGeo(), getDelayHotspots(), getDelayedRoutes(), getRoutesList()])
      .then(([g, h, d, r]) => {
        if (g.status === 'fulfilled') setGeoRoutes(g.value.data || []);
        if (h.status === 'fulfilled') setHotspots(h.value.data || []);
        if (d.status === 'fulfilled') setRouteMetrics(d.value.data || []);
        if (r.status === 'fulfilled') setRouteOptions(r.value.data || []);
        if (g.status === 'rejected') setError('Failed to load map data from API.');
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const metricsById = useMemo(() => {
    const m = {};
    routeMetrics.forEach((r) => { m[r.route_id] = r; });
    return m;
  }, [routeMetrics]);

  const enrichedGeoRoutes = useMemo(() => {
    return geoRoutes.map((r) => {
      let color = 'normal';
      const m = metricsById[r.route_id];
      if (m) {
        if (m.avg_occupancy_pct >= 90) color = 'overcrowded';
        else if (m.avg_delay_minutes >= 10) color = 'high';
        else if (m.avg_delay_minutes >= 4) color = 'moderate';
      } else {
        color = r.status_color || 'normal';
      }
      return { ...r, status_color: color };
    });
  }, [geoRoutes, metricsById]);

  const statusOf = (routeId) => enrichedGeoRoutes.find((r) => r.route_id === routeId)?.status_color || 'normal';

  const statusCounts = useMemo(() => {
    const c = { normal: 0, moderate: 0, high: 0, overcrowded: 0 };
    enrichedGeoRoutes.forEach((r) => { if (c[r.status_color] != null) c[r.status_color] += 1; });
    return c;
  }, [enrichedGeoRoutes]);

  const visibleRoutes = useMemo(() => {
    const q = searchRoute.toLowerCase();
    return enrichedGeoRoutes.filter((r) => {
      if (selectedRouteId && r.route_id !== selectedRouteId) return false;
      if (crowdingLevel && r.status_color !== crowdingLevel) return false;
      if (q && !r.route_id.toLowerCase().includes(q) && !(r.route_name || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [enrichedGeoRoutes, selectedRouteId, crowdingLevel, searchRoute]);

  const selected = useMemo(() => {
    if (!selectedRouteId) return null;
    const geo = enrichedGeoRoutes.find((r) => r.route_id === selectedRouteId);
    if (!geo) return null;
    return { geo, metrics: metricsById[selectedRouteId] || null };
  }, [selectedRouteId, enrichedGeoRoutes, metricsById]);

  const resetFilters = () => {
    setSelectedRouteId('');
    setCrowdingLevel('');
    setSearchRoute('');
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-[1600px] mx-auto">
        <PageHeader title="Route Map" subtitle="Loading interactive network geometry..." icon={MapPin} />
        <div className="rounded border border-[#2A2A2A] bg-[#1F1F1F]">
          <Loading label={`Loading ${geoRoutes.length} routes...`} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 max-w-[1600px] mx-auto">
        <PageHeader title="Route Map" subtitle="Interactive transit network geometry and delay hotspots" icon={MapPin} />
        <div className="rounded border border-[#2A2A2A] bg-[#1F1F1F]">
          <ErrorState message={error} onRetry={load} />
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-4 max-w-[1600px] mx-auto font-sans h-[calc(100vh-100px)] flex flex-col">
      <style>{`
        .leaflet-popup-content-wrapper {
          background-color: #121824 !important;
          color: #f1f5f9 !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
        }
        .leaflet-popup-tip {
          background-color: #121824 !important;
          border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-left: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        .leaflet-popup-close-button {
          color: #94a3b8 !important;
        }
        .leaflet-popup-close-button:hover {
          color: #f8fafc !important;
        }
      `}</style>

      {/* Top Header Filter Bar */}
      <div className="bg-[#1F1F1F] p-4 rounded border border-[#2A2A2A] shadow-xs flex flex-wrap items-center justify-between gap-4 shrink-0">
        <PageHeader
          title="Route Map"
          subtitle={`${visibleRoutes.length} of ${geoRoutes.length} routes visible · ${hotspots.length} delay hotspots · click a route for details`}
          icon={MapPin}
        />

        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput
            value={searchRoute}
            onChange={setSearchRoute}
            placeholder="Search route..."
            className="w-44 sm:w-56"
          />

          <label htmlFor="map-route-select" className="sr-only">Filter by route</label>
          <select
            id="map-route-select"
            value={selectedRouteId}
            onChange={(e) => setSelectedRouteId(e.target.value)}
            className="text-xs bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-1.5 font-medium text-slate-200 focus:outline-none"
          >
            <option value="">All Routes ({routeOptions.length})</option>
            {routeOptions.map((r) => (
              <option key={r.route_id} value={r.route_id}>{r.route_name || r.route_id}</option>
            ))}
          </select>

          <select
            value={crowdingLevel}
            onChange={(e) => setCrowdingLevel(e.target.value)}
            className="text-xs bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-1.5 font-medium text-slate-200 focus:outline-none"
          >
            <option value="">Crowding Level</option>
            <option value="normal">Normal ({statusCounts.normal})</option>
            <option value="moderate">Moderate Delay ({statusCounts.moderate})</option>
            <option value="high">High Delay ({statusCounts.high})</option>
            <option value="overcrowded">Overcrowded ({statusCounts.overcrowded})</option>
          </select>

          <button onClick={resetFilters} className="text-xs font-semibold text-slate-500 hover:text-white px-2 py-1.5">Reset</button>
          <button onClick={load} title="Refresh" className="p-1.5 rounded-lg border border-[#2A2A2A] text-slate-500 hover:bg-[#141414]">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Map Body */}
      <div className="relative flex-1 rounded overflow-hidden border border-[#2A2A2A] shadow-xs bg-[#1B1B1B] min-h-[420px]">
        <MapContainer
          center={[40.71, -74.0]}
          zoom={10}
          className="w-full h-full"
          style={{ minHeight: '420px' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds routes={visibleRoutes} />

          {visibleRoutes.map((r) => (
            <Polyline
              key={r.route_id}
              positions={(r.path || []).filter((p) => p.lat != null && p.lon != null).map((p) => [p.lat, p.lon])}
              pathOptions={{
                color: STATUS_COLORS[r.status_color] || '#64748B',
                weight: hoveredId === r.route_id || selectedRouteId === r.route_id ? 6 : 3,
                opacity: selectedRouteId && selectedRouteId !== r.route_id ? 0.35 : 0.85,
              }}
              eventHandlers={{
                click: () => setSelectedRouteId(r.route_id),
                mouseover: () => setHoveredId(r.route_id),
                mouseout: () => setHoveredId(null),
              }}
            >
              <Tooltip direction="top" permanent={hoveredId === r.route_id}>
                <div style={{ fontSize: '11px', fontWeight: 700 }}>{r.route_name || r.route_id}</div>
                <div style={{ fontSize: '10px', color: '#64748B' }}>
                  {metricsById[r.route_id]
                    ? `${metricsById[r.route_id].avg_delay_minutes}m delay · ${metricsById[r.route_id].avg_occupancy_pct}% load`
                    : STATUS_LABELS[r.status_color] || r.status_color}
                </div>
              </Tooltip>
            </Polyline>
          ))}

          {hotspots.map((h) => (
            <CircleMarker
              key={h.stop_id}
              center={[h.latitude, h.longitude]}
              radius={Math.max(5, Math.min(14, h.delay_events / 3))}
              pathOptions={{
                color: '#B91C1C',
                fillColor: '#EF4444',
                fillOpacity: 0.65,
                weight: 1.5,
              }}
            >
              <Tooltip direction="top">
                <div style={{ fontSize: '11px', fontWeight: 700 }}>{h.stop_name}</div>
                <div style={{ fontSize: '10px' }}>{h.delay_events} delay events</div>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Legend */}
        <div className="absolute top-5 left-5 z-[1000] bg-[#121824] bg-opacity-95 backdrop-blur-md p-3.5 rounded shadow-lg border border-[#2A2A2A] text-xs space-y-2 select-none">
          <p className="font-bold text-white text-[11px] uppercase tracking-wider mb-2">Transit Status</p>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={crowdingLevel === key}
                onChange={(e) => setCrowdingLevel(e.target.checked ? key : '')}
                className="w-3 h-3"
              />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[key] }} />
              <span>{label}</span>
              <span className="ml-auto text-slate-400 font-semibold">{statusCounts[key]}</span>
            </label>
          ))}
          <div className="flex items-center gap-2 text-slate-200 border-t border-[#2A2A2A] pt-2 mt-2">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-rose-600 bg-rose-400" />
            <span>Delay Hotspot Stop</span>
            <span className="ml-auto text-slate-400 font-semibold">{hotspots.length}</span>
          </div>
        </div>

        {/* Selected route detail card */}
        {selected && (
          <div className="absolute top-5 right-5 z-[1000] bg-[#121824] bg-opacity-95 backdrop-blur-xl p-4 rounded shadow-2xl border border-[#2A2A2A] text-xs w-72 max-h-[75%] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-2 mb-2.5">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ background: STATUS_COLORS[selected.geo.status_color] }} />
                <span className="font-bold text-white text-sm">{selected.geo.route_name || selected.geo.route_id}</span>
              </div>
              <button onClick={() => setSelectedRouteId('')} className="text-slate-400 hover:text-slate-200">
                <X size={15} />
              </button>
            </div>

            <span
              className="inline-block font-bold px-2 py-0.5 rounded text-[10px] mb-2.5"
              style={{
                background: `${STATUS_COLORS[selected.geo.status_color]}1a`,
                color: STATUS_COLORS[selected.geo.status_color],
              }}
            >
              {(STATUS_LABELS[selected.geo.status_color] || selected.geo.status_color).toUpperCase()}
            </span>

            <div className="space-y-1.5 text-slate-300 text-xs">
              {selected.metrics && (
                <>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1"><Clock size={11} /> Avg Delay:</span>
                    <span className="font-bold text-amber-600">{selected.metrics.avg_delay_minutes} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1"><Users size={11} /> Avg Load:</span>
                    <span className="font-bold" style={{ color: selected.metrics.avg_occupancy_pct > 60 ? '#EF4444' : '#10B981' }}>
                      {selected.metrics.avg_occupancy_pct}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1"><Navigation size={11} /> On-Time:</span>
                    <span className="font-bold text-white">{selected.metrics.on_time_performance_pct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Passengers:</span>
                    <span className="font-bold text-white">{Number(selected.metrics.total_passengers || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Performance:</span>
                    <span className="font-bold text-[#E31E24]">{selected.metrics.performance_score} · {selected.metrics.performance_tier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mode:</span>
                    <span className="font-bold text-white">{selected.metrics.transport_mode}</span>
                  </div>
                </>
              )}
              {!selected.metrics && (
                <div className="flex items-center gap-1 text-slate-400">
                  <AlertTriangle size={12} /> No metrics found for this route.
                </div>
              )}
            </div>

            {(selected.geo.path || []).length > 0 && (
              <div className="border-t border-[#2A2A2A] mt-3 pt-2.5">
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Stops ({selected.geo.path.length})</div>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {selected.geo.path.map((p, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      {p.stop_name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => navigate('/route-performance-detail')}
              className="w-full mt-3.5 py-1.5 bg-[#E31E24] hover:bg-[#b81419] text-white font-semibold rounded-lg text-xs transition shadow-sm"
            >
              View Route Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
