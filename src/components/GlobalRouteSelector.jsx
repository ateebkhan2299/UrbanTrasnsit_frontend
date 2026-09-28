import React, { useEffect, useState } from 'react';
import { Route, Search } from 'lucide-react';
import { getRoutesList } from '../api/client';

const GlobalRouteSelector = ({ selectedRouteId, onSelectRoute }) => {
  const [routes, setRoutes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    getRoutesList()
      .then((res) => setRoutes(res.data))
      .catch((err) => console.error(err));
  }, []);

  const filteredRoutes = routes.filter((r) =>
    r.route_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.route_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex items-center gap-2">
      <Route className="w-4 h-4 text-cyan-400" />
      <select
        value={selectedRouteId || ''}
        onChange={(e) => onSelectRoute(e.target.value || null)}
        className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500 font-medium max-w-xs"
      >
        <option value="">All Transit Routes (System-wide)</option>
        {routes.map((r) => (
          <option key={r.route_id} value={r.route_id}>
            {r.route_name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default GlobalRouteSelector;
