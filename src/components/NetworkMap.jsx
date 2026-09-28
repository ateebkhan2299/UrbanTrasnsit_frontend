import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const STATUS_COLORS = {
  normal: { stroke: '#22c55e', weight: 3, fill: '#22c55e' },
  moderate: { stroke: '#f59e0b', weight: 4, fill: '#f59e0b' },
  high: { stroke: '#ef4444', weight: 5, fill: '#ef4444' },
};

const STATUS_LABEL = { normal: 'On time', moderate: 'Moderate delay', high: 'High delay' };

function FitBounds({ items }) {
  const map = useMap();
  useEffect(() => {
    const pts = [];
    (items || []).forEach((r) =>
      (r.path || []).forEach((p) => {
        const lat = Number(p.lat ?? p.latitude);
        const lon = Number(p.lon ?? p.lng ?? p.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lon)) pts.push([lat, lon]);
      }),
    );
    if (pts.length) {
      try {
        map.fitBounds(L.latLngBounds(pts).pad(0.15), { animate: false });
      } catch {
        /* degenerate geometry -- keep the default view */
      }
    }
  }, [map, items]);
  return null;
}

function Legend() {
  return (
    <div className="pointer-events-none absolute bottom-2 left-2 z-[400] rounded-md border border-slate-700 bg-slate-900/85 px-2.5 py-1.5 text-[10px] font-medium text-slate-300">
      {Object.entries(STATUS_LABEL).map(([k, label]) => (
        <div key={k} className="flex items-center gap-1.5">
          <span
            className="inline-block h-1 w-5 rounded"
            style={{ background: STATUS_COLORS[k].stroke }}
          />
          {label}
        </div>
      ))}
    </div>
  );
}

const DEFAULT_CENTER = [40.7128, -74.006];
const DEFAULT_ZOOM = 11;

/**
 * Reusable Leaflet network map fed by GET /api/map/routes-geo and
 * GET /api/map/delay-hotspots.
 */
export default function NetworkMap({ routes = [], hotspots = [], height = '440px', onSelectRoute }) {
  const [hovered, setHovered] = React.useState(null);
  const prev = useRef(new Map());

  // Rebuild the previous-status lookup so we can render arrows/popups cheaply.
  useEffect(() => {
    prev.current = new Map((routes || []).map((r) => [r.route_id, r]));
  }, [routes]);

  const center = useMemo(() => {
    const pts = [];
    (routes || []).slice(0, 40).forEach((r) =>
      (r.path || []).forEach((p) => {
        const lat = Number(p.lat ?? p.latitude);
        const lon = Number(p.lon ?? p.lng ?? p.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lon)) pts.push([lat, lon]);
      }),
    );
    if (!pts.length) return DEFAULT_CENTER;
    return [
      pts.reduce((a, p) => a + p[0], 0) / pts.length,
      pts.reduce((a, p) => a + p[1], 0) / pts.length,
    ];
  }, [routes]);

  return (
    <div className="relative w-full" style={{ height }}>
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        className="bg-slate-900"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds items={routes} />

        {(routes || []).map((r) => {
          const cfg = STATUS_COLORS[r.status_color] || STATUS_COLORS.normal;
          const latlngs = (r.path || [])
            .map((p) => [Number(p.lat ?? p.latitude), Number(p.lon ?? p.lng ?? p.longitude)])
            .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
          if (latlngs.length < 2) return null;
          const isHover = hovered === r.route_id;
          return (
            <Polyline
              key={r.route_id}
              positions={latlngs}
              pathOptions={{
                color: cfg.stroke,
                weight: isHover ? cfg.weight + 2 : cfg.weight,
                opacity: hovered && !isHover ? 0.25 : 0.85,
              }}
              eventHandlers={{
                mouseover: () => setHovered(r.route_id),
                mouseout: () => setHovered(null),
                click: () => onSelectRoute && onSelectRoute(r),
              }}
            >
              <Tooltip sticky>
                <div className="text-xs">
                  <div className="font-bold">{r.route_name || r.route_id}</div>
                  <div>{r.route_id}</div>
                  <div className="mt-1 text-slate-500">
                    {r.path.length} aligned stops
                  </div>
                </div>
              </Tooltip>
            </Polyline>
          );
        })}

        {(hotspots || []).map((h) => {
          const lat = Number(h.latitude);
          const lon = Number(h.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
          const intensity = Math.min(1, (Number(h.delay_events) || 0) / 60);
          return (
            <CircleMarker
              key={`hs-${h.stop_id}`}
              center={[lat, lon]}
              radius={4 + intensity * 8}
              pathOptions={{
                color: '#ef4444',
                fillColor: '#ef4444',
                fillOpacity: 0.25 + intensity * 0.5,
                weight: 1.5,
              }}
            >
              <Tooltip>
                <div className="text-xs">
                  <div className="font-bold">{h.stop_name || h.stop_id}</div>
                  <div>{h.delay_events} delay events</div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <Legend />
    </div>
  );
}
