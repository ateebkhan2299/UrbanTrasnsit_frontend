import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, Plus, Pencil, Trash2, Inbox } from 'lucide-react';
import { Modal, ConfirmDialog, Loading, ErrorState, EmptyState, PageHeader, SearchInput, friendlyError, useToast } from '../components/ui';

const EMPTY_FORM = { trip_id: '', route_id: '', vehicle_id: '', direction: 'Outbound', status: 'Scheduled', scheduled_start: '', scheduled_end: '' };

const statusColor = (s) =>
  s === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' :
  s === 'In Progress' ? 'bg-blue-500/20 text-blue-400' :
  s === 'Cancelled' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400';

const toLocalInput = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ''; }
};

const TripManagement = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { token } = useAuth();
  const toast = useToast();

  const getAuthHeaders = () => {
    const t = token || localStorage.getItem('token');
    return {
      'Authorization': t ? `Bearer ${t}` : '',
      'Content-Type': 'application/json'
    };
  };

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/trips', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch trips');
      setTrips(await res.json());
      setFetchError(null);
    } catch (err) {
      setFetchError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  const filtered = trips.filter((t) => {
    const matchSearch = (t.trip_id + ' ' + t.route_id + ' ' + t.vehicle_id + ' ' + t.direction).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); };
  const openEdit = (t) => {
    setEditing(t);
    setForm({
      trip_id: t.trip_id,
      route_id: t.route_id,
      vehicle_id: t.vehicle_id,
      direction: t.direction,
      status: t.status,
      scheduled_start: toLocalInput(t.scheduled_start),
      scheduled_end: toLocalInput(t.scheduled_end),
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        trip_id: form.trip_id,
        route_id: form.route_id,
        vehicle_id: form.vehicle_id,
        direction: form.direction,
        status: form.status,
        scheduled_start: form.scheduled_start ? new Date(form.scheduled_start).toISOString() : null,
        scheduled_end: form.scheduled_end ? new Date(form.scheduled_end).toISOString() : null,
      };
      const url = editing ? `/api/admin/trips/${editing.trip_id}` : '/api/admin/trips';
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Save failed');
      }
      setModalOpen(false);
      toast.success(editing ? 'Trip updated' : 'Trip created');
      await fetchTrips();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (trip_id) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/trips/${trip_id}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Delete failed');
      }
      setConfirmDelete(null);
      toast.success('Trip deleted');
      await fetchTrips();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const fieldCls = 'w-full bg-[#141414] border border-[#2A2A2A] text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500 disabled:opacity-50';
  const labelCls = 'block text-xs font-semibold text-slate-400 mb-1';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Trips"
        subtitle="Schedule, track and manage transit trips."
        icon={Calendar}
        actions={
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            Add Trip
          </button>
        }
      />

      <div className="bg-[#1F1F1F] rounded border border-[#2A2A2A] overflow-hidden">
        <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between bg-[#1F1F1F]/80 gap-4 flex-wrap">
          <SearchInput dark value={search} onChange={setSearch} placeholder="Search trips..." className="w-64" />
          <div className="flex items-center gap-3">
            <label htmlFor="status-filter" className="sr-only">Filter by status</label>
            <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-[#141414]/50 border border-[#2A2A2A] text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:border-amber-500">
              <option>All</option><option>Scheduled</option><option>In Progress</option><option>Completed</option><option>Cancelled</option>
            </select>
            {!loading && !fetchError && (
              <div className="text-sm text-slate-400 font-medium">Showing {filtered.length} of {trips.length}</div>
            )}
          </div>
        </div>

        {loading ? (
          <Loading dark label="Loading trips..." />
        ) : fetchError ? (
          <ErrorState dark message={fetchError.message} onRetry={fetchTrips} />
        ) : filtered.length === 0 ? (
          <EmptyState
            dark
            icon={Inbox}
            title={trips.length === 0 ? 'No trips yet' : 'No trips match your filters'}
            message={trips.length === 0 ? 'Schedule your first trip to get started.' : 'Try a different search or status.'}
            action={search || statusFilter !== 'All' ? { label: 'Clear filters', onClick: () => { setSearch(''); setStatusFilter('All'); } } : null}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#141414]/50 text-slate-400 text-sm uppercase tracking-wider border-b border-[#2A2A2A]">
                  <th className="px-6 py-4 font-medium">Trip ID</th>
                  <th className="px-6 py-4 font-medium">Route</th>
                  <th className="px-6 py-4 font-medium">Vehicle</th>
                  <th className="px-6 py-4 font-medium">Direction</th>
                  <th className="px-6 py-4 font-medium">Scheduled Start</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-700/20 transition-colors text-sm">
                    <td className="px-6 py-4 font-mono text-amber-400">{t.trip_id}</td>
                    <td className="px-6 py-4 text-slate-300">{t.route_id}</td>
                    <td className="px-6 py-4 text-slate-300">{t.vehicle_id}</td>
                    <td className="px-6 py-4 text-slate-400">{t.direction}</td>
                    <td className="px-6 py-4 text-slate-400 text-xs font-mono">
                      {t.scheduled_start ? new Date(t.scheduled_start).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColor(t.status)}`}>{t.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button onClick={() => openEdit(t)} className="text-[#E31E24] hover:text-cyan-300 font-medium text-sm inline-flex items-center gap-1">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => setConfirmDelete(t)} className="text-red-400 hover:text-red-300 font-medium text-sm inline-flex items-center gap-1">
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

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Trip' : 'Add Trip'}
        dark
        maxWidth="max-w-lg"
        closeOnBackdrop={false}
        footer={
          <>
            <button type="button" onClick={() => setModalOpen(false)} className="text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-600 hover:bg-slate-700 px-4 py-2 rounded-lg">
              Cancel
            </button>
            <button type="submit" form="trip-form" disabled={saving} className="text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 px-4 py-2 rounded-lg transition">
              {saving ? 'Saving...' : editing ? 'Update Trip' : 'Create Trip'}
            </button>
          </>
        }
      >
        <form id="trip-form" onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div role="alert" className="p-2.5 bg-red-900/30 border border-red-700/50 text-red-400 text-xs rounded-lg">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="trip_id" className={labelCls}>Trip ID</label>
              <input id="trip_id" required value={form.trip_id} disabled={!!editing} onChange={(e) => setForm({ ...form, trip_id: e.target.value })}
                className={fieldCls} placeholder="TRIP_101" />
            </div>
            <div>
              <label htmlFor="route_id" className={labelCls}>Route ID</label>
              <input id="route_id" required value={form.route_id} onChange={(e) => setForm({ ...form, route_id: e.target.value })}
                className={fieldCls} placeholder="ROUTE_001" />
            </div>
            <div>
              <label htmlFor="vehicle_id" className={labelCls}>Vehicle ID</label>
              <input id="vehicle_id" required value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
                className={fieldCls} placeholder="VEH_001" />
            </div>
            <div>
              <label htmlFor="direction" className={labelCls}>Direction</label>
              <select id="direction" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} className={fieldCls}>
                <option>Outbound</option><option>Inbound</option>
              </select>
            </div>
            <div>
              <label htmlFor="trip_status" className={labelCls}>Status</label>
              <select id="trip_status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={fieldCls}>
                <option>Scheduled</option><option>In Progress</option><option>Completed</option><option>Cancelled</option>
              </select>
            </div>
            <div />
            <div>
              <label htmlFor="scheduled_start" className={labelCls}>Scheduled Start</label>
              <input id="scheduled_start" type="datetime-local" value={form.scheduled_start} onChange={(e) => setForm({ ...form, scheduled_start: e.target.value })} className={fieldCls} />
            </div>
            <div>
              <label htmlFor="scheduled_end" className={labelCls}>Scheduled End</label>
              <input id="scheduled_end" type="datetime-local" value={form.scheduled_end} onChange={(e) => setForm({ ...form, scheduled_end: e.target.value })} className={fieldCls} />
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => handleDelete(confirmDelete.trip_id)}
        title="Delete Trip?"
        dark
        busy={deleting}
        message={
          <>
            Delete trip <span className="font-mono text-amber-400">{confirmDelete?.trip_id}</span>? This cannot be undone.
          </>
        }
      />
    </div>
  );
};

export default TripManagement;
