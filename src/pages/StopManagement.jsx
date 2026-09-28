import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { MapPin, Plus, Pencil, Trash2, Inbox } from 'lucide-react';
import { Modal, ConfirmDialog, Loading, ErrorState, EmptyState, PageHeader, SearchInput, friendlyError, useToast } from '../components/ui';

const EMPTY_FORM = { stop_id: '', stop_name: '', latitude: '', longitude: '', zone: '' };

const StopManagement = () => {
  const [stops, setStops] = useState([]);
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

  const getAuthHeaders = () => {
    const t = token || localStorage.getItem('token');
    return {
      'Authorization': t ? `Bearer ${t}` : '',
      'Content-Type': 'application/json'
    };
  };

  const fetchStops = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stops', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch stops');
      setStops(await res.json());
      setFetchError(null);
    } catch (err) {
      setFetchError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchStops(); }, [fetchStops]);

  const filtered = stops.filter((s) =>
    (s.stop_id + ' ' + s.stop_name + ' ' + (s.zone || '')).toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({ stop_id: s.stop_id, stop_name: s.stop_name, latitude: s.latitude, longitude: s.longitude, zone: s.zone || '' });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        stop_id: form.stop_id,
        stop_name: form.stop_name,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        zone: form.zone || null,
      };
      if (isNaN(payload.latitude) || isNaN(payload.longitude)) throw new Error('Latitude & Longitude must be numbers');
      const url = editing ? `/api/admin/stops/${editing.stop_id}` : '/api/admin/stops';
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Save failed');
      }
      setModalOpen(false);
      toast.success(editing ? 'Stop updated' : 'Stop created');
      await fetchStops();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (stop_id) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/stops/${stop_id}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Delete failed');
      }
      setConfirmDelete(null);
      toast.success('Stop deleted');
      await fetchStops();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const fieldCls = 'w-full bg-[#141414] border border-[#2A2A2A] text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 disabled:opacity-50';
  const labelCls = 'block text-xs font-semibold text-slate-400 mb-1';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Stops"
        subtitle="Add, edit and remove transit stops."
        icon={MapPin}
        actions={
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            Add Stop
          </button>
        }
      />

      <div className="bg-[#1F1F1F] rounded border border-[#2A2A2A] overflow-hidden">
        <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between bg-[#1F1F1F]/80 gap-4 flex-wrap">
          <SearchInput dark value={search} onChange={setSearch} placeholder="Search stops..." className="w-64" />
          {!loading && !fetchError && (
            <div className="text-sm text-slate-400 font-medium">Showing {filtered.length} of {stops.length} stops</div>
          )}
        </div>

        {loading ? (
          <Loading dark label="Loading stops..." />
        ) : fetchError ? (
          <ErrorState dark message={fetchError.message} onRetry={fetchStops} />
        ) : filtered.length === 0 ? (
          <EmptyState
            dark
            icon={Inbox}
            title={stops.length === 0 ? 'No stops yet' : 'No stops match your search'}
            message={stops.length === 0 ? 'Create your first stop to get started.' : `Nothing matches "${search}".`}
            action={search ? { label: 'Clear search', onClick: () => setSearch('') } : null}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#141414]/50 text-slate-400 text-sm uppercase tracking-wider border-b border-[#2A2A2A]">
                  <th className="px-6 py-4 font-medium">Stop ID</th>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Zone</th>
                  <th className="px-6 py-4 font-medium">Latitude</th>
                  <th className="px-6 py-4 font-medium">Longitude</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-700/20 transition-colors text-sm">
                    <td className="px-6 py-4 font-mono text-white">{s.stop_id}</td>
                    <td className="px-6 py-4 font-medium text-slate-200">{s.stop_name}</td>
                    <td className="px-6 py-4 text-slate-400">{s.zone || '-'}</td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{Number(s.latitude).toFixed(5)}</td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{Number(s.longitude).toFixed(5)}</td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button onClick={() => openEdit(s)} className="text-[#E31E24] hover:text-cyan-300 font-medium text-sm inline-flex items-center gap-1">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => setConfirmDelete(s)} className="text-red-400 hover:text-red-300 font-medium text-sm inline-flex items-center gap-1">
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
        title={editing ? 'Edit Stop' : 'Add Stop'}
        dark
        closeOnBackdrop={false}
        footer={
          <>
            <button type="button" onClick={() => setModalOpen(false)} className="text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-600 hover:bg-slate-700 px-4 py-2 rounded-lg">
              Cancel
            </button>
            <button type="submit" form="stop-form" disabled={saving} className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 rounded-lg transition">
              {saving ? 'Saving...' : editing ? 'Update Stop' : 'Create Stop'}
            </button>
          </>
        }
      >
        <form id="stop-form" onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div role="alert" className="p-2.5 bg-red-900/30 border border-red-700/50 text-red-400 text-xs rounded-lg">
              {formError}
            </div>
          )}
          <div>
            <label htmlFor="stop_id" className={labelCls}>Stop ID</label>
            <input id="stop_id" required value={form.stop_id} disabled={!!editing} onChange={(e) => setForm({ ...form, stop_id: e.target.value })}
              className={fieldCls} placeholder="STOP_0101" />
          </div>
          <div>
            <label htmlFor="stop_name" className={labelCls}>Stop Name</label>
            <input id="stop_name" required value={form.stop_name} onChange={(e) => setForm({ ...form, stop_name: e.target.value })}
              className={fieldCls} placeholder="Central Station" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="latitude" className={labelCls}>Latitude</label>
              <input id="latitude" required type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                className={fieldCls} placeholder="40.7128" />
            </div>
            <div>
              <label htmlFor="longitude" className={labelCls}>Longitude</label>
              <input id="longitude" required type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                className={fieldCls} placeholder="-74.0060" />
            </div>
          </div>
          <div>
            <label htmlFor="zone" className={labelCls}>Zone</label>
            <input id="zone" value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })}
              className={fieldCls} placeholder="Zone 1" />
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => handleDelete(confirmDelete.stop_id)}
        title="Delete Stop?"
        dark
        busy={deleting}
        message={
          <>
            Delete <span className="font-mono text-white">{confirmDelete?.stop_id}</span> — {confirmDelete?.stop_name}? This cannot be undone.
          </>
        }
      />
    </div>
  );
};

export default StopManagement;
