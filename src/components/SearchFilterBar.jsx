import React, { useState, useEffect } from 'react';
import { Search, Calendar } from 'lucide-react';
import { getRoutesList } from '../api/client';

const SearchFilterBar = ({ onFilterChange }) => {
  const [routes, setRoutes] = useState([]);
  const [filters, setFilters] = useState({
    dateRange: '',
    route: '',
    search: '',
    peakToggle: 'all',
    delaySeverity: 'all',
    occupancyLevel: 'all',
  });

  useEffect(() => {
    getRoutesList()
      .then((res) => setRoutes(res.data || []))
      .catch(() => setRoutes([]));
  }, []);

  const handleChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    if (onFilterChange) onFilterChange(newFilters);
  };

  return (
    <div className="glass-card p-4 mb-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-slate-400 mb-1">Date Range</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="date"
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
              value={filters.dateRange}
              onChange={(e) => handleChange('dateRange', e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs text-slate-400 mb-1">Route</label>
          <select
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            value={filters.route}
            onChange={(e) => handleChange('route', e.target.value)}
          >
            <option value="">All Routes ({routes.length})</option>
            {routes.map((r) => (
              <option key={r.route_id} value={r.route_id}>
                {r.route_name || r.route_id}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-slate-400 mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Route ID or name..."
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
              value={filters.search}
              onChange={(e) => handleChange('search', e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-slate-400 mb-1">Time Period</label>
          <select
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            value={filters.peakToggle}
            onChange={(e) => handleChange('peakToggle', e.target.value)}
          >
            <option value="all">All Day</option>
            <option value="peak">Peak Hours</option>
            <option value="offpeak">Off-Peak</option>
          </select>
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-slate-400 mb-1">Delay Level</label>
          <select
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            value={filters.delaySeverity}
            onChange={(e) => handleChange('delaySeverity', e.target.value)}
          >
            <option value="all">All</option>
            <option value="low">Low (best third)</option>
            <option value="medium">Medium</option>
            <option value="high">High (worst third)</option>
          </select>
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-slate-400 mb-1">Occupancy</label>
          <select
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            value={filters.occupancyLevel}
            onChange={(e) => handleChange('occupancyLevel', e.target.value)}
          >
            <option value="all">All</option>
            <option value="low">Low (&lt;30%)</option>
            <option value="medium">Medium (30-60%)</option>
            <option value="high">High (&gt;60%)</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default SearchFilterBar;
