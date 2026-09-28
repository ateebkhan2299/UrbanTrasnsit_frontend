import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Route, Plus, Pencil, Trash2, Inbox, ListOrdered, ArrowUp, ArrowDown, X, ChevronRight } from 'lucide-react';
import { Modal, ConfirmDialog, Loading, ErrorState, EmptyState, PageHeader, SearchInput, friendlyError, useToast } from '../components/ui';

const EMPTY_FORM = { route_id: '', route_name: '', transport_mode: 'Bus', active: true };

const RouteManagement = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { token } = useAuth();
  const toast = useToast();

  // Stop Sequence state
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeStops, setRouteStops] = useState([]);
  const [allStops, setAllStops] = useState([]);
  const [loadingStops, setLoadingStops] = useState(false);
  const [addStopId, setAddStopId] = useState('');
  const [savingStops, setSavingStops] = useState(false);

  const getAuthHeaders = () => {
    const t = token || localStorage.getItem('token');
    return {
      'Authorization': t ? `Bearer ${t}` : '',
      'Content-Type': 'application/json'
    };
  };

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/routes', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch routes');
      setRoutes(await res.json());
      setFetchError(null);
    } catch (err) {
      setFetchError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchRoutes(); }, [fetchRoutes]);

  // Fetch all stops for the dropdown
  const fetchAllStops = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stops', { headers: getAuthHeaders() });
      if (res.ok) setAllStops(await res.json());
    } catch {}
  }, [token]);

  useEffect(() => { fetchAllStops(); }, [fetchAllStops]);

  // Fetch stops for selected route
  const fetchRouteStops = async (routeId) => {
    setLoadingStops(true);
    try {
      const res = await fetch(`/api/admin/routes/${routeId}/stops`, { headers: getAuthHeaders() });
      if (res.ok) setRouteStops(await res.json());
      else setRouteStops([]);
    } catch {
      setRouteStops([]);
    } finally {
      setLoadingStops(false);
    }
  };

  const selectRoute = (r) => {
    setSelectedRoute(r);
    fetchRouteStops(r.route_id);
    setAddStopId('');
  };

  const closeStopPanel = () => {
    setSelectedRoute(null);
    setRouteStops([]);
  };

  // Move stop up/down in sequence
  const moveStop = (index, direction) => {
    const newStops = [...routeStops];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= newStops.length) return;
    [newStops[index], newStops[swapIndex]] = [newStops[swapIndex], newStops[index]];
    // Renumber sequences
    newStops.forEach((s, i) => { s.stop_sequence = i + 1; });
    setRouteStops(newStops);
  };

  // Remove stop from sequence
  const removeStopFromSeq = (index) => {
    const newStops = routeStops.filter((_, i) => i !== index);
    newStops.forEach((s, i) => { s.stop_sequence = i + 1; });
    setRouteStops(newStops);
  };

  // Add stop to sequence
  const addStopToSeq = () => {
    if (!addStopId) return;
    const stop = allStops.find(s => s.stop_id === addStopId);
    const newEntry = {
      id: Date.now(),
      route_id: selectedRoute.route_id,
      stop_id: addStopId,
      stop_sequence: routeStops.length + 1,
      stop_name: stop?.stop_name || addStopId
    };
    setRouteStops([...routeStops, newEntry]);
    setAddStopId('');
  };

  // Save stop sequence to backend
  const saveStopSequence = async () => {
    setSavingStops(true);
    try {
      const payload = routeStops.map((s, i) => ({
        route_id: selectedRoute.route_id,
        stop_id: s.stop_id,
        stop_sequence: i + 1
      }));
      const res = await fetch(`/api/admin/routes/${selectedRoute.route_id}/stops`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success(`Stop sequence saved for ${selectedRoute.route_id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingStops(false);
    }
  };

  const filtered = routes.filter((r) =>
    (r.route_id + ' ' + r.route_name + ' ' + r.transport_mode).toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); };
  const openEdit = (r) => {
    setEditing(r);
    setForm({ route_id: r.route_id, route_name: r.route_name, transport_mode: r.transport_mode, active: r.active });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const url = editing ? `/api/admin/routes/${editing.route_id}` : '/api/admin/routes';
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: getAuthHeaders(), body: JSON.stringify(form) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Save failed');
      }
      setModalOpen(false);
      toast.success(editing ? 'Route updated' : 'Route created');
      await fetchRoutes();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (route_id) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/routes/${route_id}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Delete failed');
      }
      setConfirmDelete(null);
      if (selectedRoute?.route_id === route_id) closeStopPanel();
      toast.success('Route deleted');
      await fetchRoutes();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const fieldCls = 'w-full bg-[#141414] border border-[#2A2A2A] text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#E31E24] disabled:opacity-50';
  const labelCls = 'block text-xs font-semibold text-slate-400 mb-1';

  // Available stops not yet in the sequence
  const availableStops = allStops.filter(s => !routeStops.some(rs => rs.stop_id === s.stop_id));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Route Management"
        subtitle="Manage transit routes and configure stop sequences."
        icon={Route}
        actions={
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-[#E31E24] hover:bg-[#c4191e] text-white text-sm font-bold rounded-[6px] transition-colors shadow-md shadow-red-900/30">
            <Plus className="w-4 h-4" />
            Add Route
          </button>
        }
      />

      <div className={`grid gap-4 ${selectedRoute ? 'grid-cols-1 lg:grid-cols-5' : 'grid-cols-1'}`}>

        {/* ── Routes Table ── */}
        <div className={`bg-[#1F1F1F] rounded-[8px] border border-[#2A2A2A] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.3)] ${selectedRoute ? 'lg:col-span-3' : ''}`}>
          <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between bg-[#1F1F1F]/80 gap-4 flex-wrap">
            <SearchInput dark value={search} onChange={setSearch} placeholder="Search routes..." className="w-64" />
            {!loading && !fetchError && (
              <div className="text-sm text-slate-400 font-medium">
                Showing {filtered.length} of {routes.length} routes
              </div>
            )}
          </div>

          {loading ? (
            <Loading dark label="Loading routes..." />
          ) : fetchError ? (
            <ErrorState dark message={fetchError.message} onRetry={fetchRoutes} />
          ) : filtered.length === 0 ? (
            <EmptyState
              dark
              icon={Inbox}
              title={routes.length === 0 ? 'No routes yet' : 'No routes match your search'}
              message={routes.length === 0 ? 'Create your first route to get started.' : `Nothing matches "${search}".`}
              action={search ? { label: 'Clear search', onClick: () => setSearch('') } : null}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#141414]/50 text-slate-400 text-sm uppercase tracking-wider border-b border-[#2A2A2A]">
                    <th className="px-5 py-3.5 font-medium">ID</th>
                    <th className="px-5 py-3.5 font-medium">Route Name</th>
                    <th className="px-5 py-3.5 font-medium">Mode</th>
                    <th className="px-5 py-3.5 font-medium">Status</th>
                    <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A2A]/60">
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      className={`hover:bg-white/[0.03] transition-colors text-sm cursor-pointer ${selectedRoute?.route_id === r.route_id ? 'bg-[#E31E24]/10 border-l-2 border-l-[#E31E24]' : ''}`}
                      onClick={() => selectRoute(r)}
                    >
                      <td className="px-5 py-3.5 font-mono text-white">{r.route_id}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-200">{r.route_name}</td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded text-xs">{r.transport_mode}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${r.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {r.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-3" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => selectRoute(r)} className="text-[#A9A9A9] hover:text-[#E31E24] font-medium text-sm inline-flex items-center gap-1 transition-colors" title="Stop Sequence">
                          <ListOrdered className="w-3.5 h-3.5" /> Stops
                        </button>
                        <button onClick={() => openEdit(r)} className="text-[#E31E24] hover:text-white font-medium text-sm inline-flex items-center gap-1 transition-colors">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button onClick={() => setConfirmDelete(r)} className="text-red-400 hover:text-red-300 font-medium text-sm inline-flex items-center gap-1 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Stop Sequence Panel ── */}
        {selectedRoute && (
          <div className="lg:col-span-2 bg-[#1F1F1F] rounded-[8px] border border-[#2A2A2A] shadow-[0_2px_8px_rgba(0,0,0,0.3)] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-[#E31E24]" />
                  <h3 className="text-sm font-bold text-white">Stop Sequence</h3>
                </div>
                <p className="text-xs text-[#A9A9A9] mt-1">
                  <span className="font-mono text-white">{selectedRoute.route_id}</span>
                  <ChevronRight className="w-3 h-3 inline mx-1" />
                  {selectedRoute.route_name}
                </p>
              </div>
              <button onClick={closeStopPanel} className="text-[#A9A9A9] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add Stop */}
            <div className="p-3 border-b border-[#2A2A2A] flex items-center gap-2">
              <select
                value={addStopId}
                onChange={(e) => setAddStopId(e.target.value)}
                className="flex-1 bg-[#141414] border border-[#2A2A2A] text-slate-200 text-xs rounded-[6px] px-2.5 py-2 focus:outline-none focus:border-[#E31E24]"
              >
                <option value="">Select stop to add...</option>
                {availableStops.map(s => (
                  <option key={s.stop_id} value={s.stop_id}>{s.stop_id} — {s.stop_name}</option>
                ))}
              </select>
              <button
                onClick={addStopToSeq}
                disabled={!addStopId}
                className="px-3 py-2 bg-[#E31E24] hover:bg-[#c4191e] disabled:opacity-30 text-white text-xs font-bold rounded-[6px] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Stop List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[500px] scrollbar-thin">
              {loadingStops ? (
                <div className="text-center py-8 text-xs text-[#A9A9A9]">Loading stops...</div>
              ) : routeStops.length === 0 ? (
                <div className="text-center py-8">
                  <ListOrdered className="w-8 h-8 text-[#2A2A2A] mx-auto mb-2" />
                  <p className="text-xs text-[#A9A9A9]">No stops assigned yet</p>
                  <p className="text-[10px] text-slate-500 mt-1">Use dropdown above to add stops</p>
                </div>
              ) : (
                routeStops.map((rs, idx) => (
                  <div
                    key={rs.stop_id + '-' + idx}
                    className="flex items-center gap-2 bg-[#141414] border border-[#2A2A2A] rounded-[6px] px-3 py-2.5 group hover:border-[#E31E24]/40 transition-colors"
                  >
                    {/* Sequence number */}
                    <span className="w-6 h-6 rounded-full bg-[#E31E24] text-white text-[10px] font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    {/* Stop info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">{rs.stop_name || rs.stop_id}</div>
                      <div className="text-[10px] text-[#A9A9A9] font-mono">{rs.stop_id}</div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => moveStop(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 text-[#A9A9A9] hover:text-white disabled:opacity-20 transition-colors"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveStop(idx, 1)}
                        disabled={idx === routeStops.length - 1}
                        className="p-1 text-[#A9A9A9] hover:text-white disabled:opacity-20 transition-colors"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeStopFromSeq(idx)}
                        className="p-1 text-red-400 hover:text-red-300 transition-colors"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Save Button */}
            {routeStops.length > 0 && (
              <div className="p-3 border-t border-[#2A2A2A]">
                <button
                  onClick={saveStopSequence}
                  disabled={savingStops}
                  className="w-full py-2.5 bg-[#E31E24] hover:bg-[#c4191e] disabled:opacity-50 text-white text-xs font-bold rounded-[6px] transition-colors shadow-md shadow-red-900/30"
                >
                  {savingStops ? 'Saving...' : `Save Sequence (${routeStops.length} stops)`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Route' : 'Add Route'}
        dark
        closeOnBackdrop={false}
        footer={
          <>
            <button type="button" onClick={() => setModalOpen(false)} className="text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-600 hover:bg-slate-700 px-4 py-2 rounded-lg">
              Cancel
            </button>
            <button type="submit" form="route-form" disabled={saving} className="text-xs font-semibold text-white bg-[#E31E24] hover:bg-[#c4191e] disabled:opacity-50 px-4 py-2 rounded-lg transition">
              {saving ? 'Saving...' : editing ? 'Update Route' : 'Create Route'}
            </button>
          </>
        }
      >
        <form id="route-form" onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div role="alert" className="p-2.5 bg-red-900/30 border border-red-700/50 text-red-400 text-xs rounded-lg">
              {formError}
            </div>
          )}
          <div>
            <label htmlFor="route_id" className={labelCls}>Route ID</label>
            <input id="route_id" required value={form.route_id} disabled={!!editing} onChange={(e) => setForm({ ...form, route_id: e.target.value })}
              className={fieldCls} placeholder="ROUTE_101" />
          </div>
          <div>
            <label htmlFor="route_name" className={labelCls}>Route Name</label>
            <input id="route_name" required value={form.route_name} onChange={(e) => setForm({ ...form, route_name: e.target.value })}
              className={fieldCls} placeholder="Line R101" />
          </div>
          <div>
            <label htmlFor="transport_mode" className={labelCls}>Transport Mode</label>
            <select id="transport_mode" value={form.transport_mode} onChange={(e) => setForm({ ...form, transport_mode: e.target.value })} className={fieldCls}>
              <option>Bus</option><option>Metro</option><option>Tram</option><option>Train</option><option>Ferry</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 rounded" />
            Active
          </label>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => handleDelete(confirmDelete.route_id)}
        title="Delete Route?"
        dark
        busy={deleting}
        message={
          <>
            Delete <span className="font-mono text-white">{confirmDelete?.route_id}</span> — {confirmDelete?.route_name}? This cannot be undone.
          </>
        }
      />
    </div>
  );
};

export default RouteManagement;
