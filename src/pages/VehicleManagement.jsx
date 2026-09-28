import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bus, Plus, Pencil, Trash2, Inbox } from 'lucide-react';
import { Modal, ConfirmDialog, Loading, ErrorState, EmptyState, PageHeader, SearchInput, friendlyError, useToast } from '../components/ui';

const EMPTY_FORM = { vehicle_id: '', transport_mode: 'Bus', capacity: 40, status: 'Active', last_maintenance: '' };

const statusColor = (s) =>
  s === 'Active' ? 'bg-emerald-500/20 text-emerald-400' :
  s === 'Maintenance' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400';

const VehicleManagement = () => {
  const [vehicles, setVehicles] = useState([]);
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

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/vehicles', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch vehicles');
      setVehicles(await res.json());
      setFetchError(null);
    } catch (err) {
      setFetchError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const filtered = vehicles.filter((v) => {
    const matchSearch = (v.vehicle_id + ' ' + v.transport_mode + ' ' + v.status).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); };
  const openEdit = (v) => {
    setEditing(v);
    setForm({
      vehicle_id: v.vehicle_id,
      transport_mode: v.transport_mode,
      capacity: v.capacity,
      status: v.status,
      last_maintenance: v.last_maintenance ? v.last_maintenance.slice(0, 10) : '',
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
        vehicle_id: form.vehicle_id,
        transport_mode: form.transport_mode,
        capacity: parseInt(form.capacity, 10) || 0,
        status: form.status,
      };
      const url = editing ? `/api/admin/vehicles/${editing.vehicle_id}` : '/api/admin/vehicles';
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Save failed');
      }
      setModalOpen(false);
      toast.success(editing ? 'Vehicle updated' : 'Vehicle created');
      await fetchVehicles();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (vehicle_id) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/vehicles/${vehicle_id}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Delete failed');
      }
      setConfirmDelete(null);
      toast.success('Vehicle deleted');
      await fetchVehicles();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const activeCount = vehicles.filter((v) => v.status === 'Active').length;
  const maintenanceCount = vehicles.filter((v) => v.status === 'Maintenance').length;

  const fieldCls = 'w-full bg-[#141414] border border-[#2A2A2A] text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 disabled:opacity-50';
  const labelCls = 'block text-xs font-semibold text-slate-400 mb-1';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Vehicles"
        subtitle={`Fleet inventory — ${activeCount} Active • ${maintenanceCount} Maintenance • ${vehicles.length} total`}
        icon={Bus}
        actions={
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            Add Vehicle
          </button>
        }
      />

      <div className="bg-[#1F1F1F] rounded border border-[#2A2A2A] overflow-hidden">
        <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between bg-[#1F1F1F]/80 gap-4 flex-wrap">
          <SearchInput dark value={search} onChange={setSearch} placeholder="Search vehicles..." className="w-64" />
          <div className="flex items-center gap-3">
            <label htmlFor="vehicle-status-filter" className="sr-only">Filter by status</label>
            <select id="vehicle-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-[#141414]/50 border border-[#2A2A2A] text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:border-indigo-500">
              <option>All</option><option>Active</option><option>Maintenance</option><option>Retired</option>
            </select>
            {!loading && !fetchError && (
              <div className="text-sm text-slate-400 font-medium">Showing {filtered.length} of {vehicles.length}</div>
            )}
          </div>
        </div>

        {loading ? (
          <Loading dark label="Loading vehicles..." />
        ) : fetchError ? (
          <ErrorState dark message={fetchError.message} onRetry={fetchVehicles} />
        ) : filtered.length === 0 ? (
          <EmptyState
            dark
            icon={Inbox}
            title={vehicles.length === 0 ? 'No vehicles yet' : 'No vehicles match your filters'}
            message={vehicles.length === 0 ? 'Add your first vehicle to get started.' : 'Try a different search or status.'}
            action={search || statusFilter !== 'All' ? { label: 'Clear filters', onClick: () => { setSearch(''); setStatusFilter('All'); } } : null}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#141414]/50 text-slate-400 text-sm uppercase tracking-wider border-b border-[#2A2A2A]">
                  <th className="px-6 py-4 font-medium">Vehicle ID</th>
                  <th className="px-6 py-4 font-medium">Mode</th>
                  <th className="px-6 py-4 font-medium">Capacity</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Last Maintenance</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-700/20 transition-colors text-sm">
                    <td className="px-6 py-4 font-mono text-indigo-400">{v.vehicle_id}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded text-xs">{v.transport_mode}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{v.capacity} seats</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColor(v.status)}`}>{v.status}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs font-mono">
                      {v.last_maintenance ? new Date(v.last_maintenance).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button onClick={() => openEdit(v)} className="text-[#E31E24] hover:text-cyan-300 font-medium text-sm inline-flex items-center gap-1">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => setConfirmDelete(v)} className="text-red-400 hover:text-red-300 font-medium text-sm inline-flex items-center gap-1">
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
        title={editing ? 'Edit Vehicle' : 'Add Vehicle'}
        dark
        closeOnBackdrop={false}
        footer={
          <>
            <button type="button" onClick={() => setModalOpen(false)} className="text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-600 hover:bg-slate-700 px-4 py-2 rounded-lg">
              Cancel
            </button>
            <button type="submit" form="vehicle-form" disabled={saving} className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 rounded-lg transition">
              {saving ? 'Saving...' : editing ? 'Update Vehicle' : 'Create Vehicle'}
            </button>
          </>
        }
      >
        <form id="vehicle-form" onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div role="alert" className="p-2.5 bg-red-900/30 border border-red-700/50 text-red-400 text-xs rounded-lg">
              {formError}
            </div>
          )}
          <div>
            <label htmlFor="vehicle_id" className={labelCls}>Vehicle ID</label>
            <input id="vehicle_id" required value={form.vehicle_id} disabled={!!editing} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
              className={fieldCls} placeholder="VEH_101" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="v_transport_mode" className={labelCls}>Transport Mode</label>
              <select id="v_transport_mode" value={form.transport_mode} onChange={(e) => setForm({ ...form, transport_mode: e.target.value })} className={fieldCls}>
                <option>Bus</option><option>Metro</option><option>Tram</option><option>Train</option>
              </select>
            </div>
            <div>
              <label htmlFor="capacity" className={labelCls}>Capacity</label>
              <input id="capacity" required type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className={fieldCls} />
            </div>
          </div>
          <div>
            <label htmlFor="v_status" className={labelCls}>Status</label>
            <select id="v_status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={fieldCls}>
              <option>Active</option><option>Maintenance</option><option>Retired</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => handleDelete(confirmDelete.vehicle_id)}
        title="Delete Vehicle?"
        dark
        busy={deleting}
        message={
          <>
            Delete <span className="font-mono text-indigo-400">{confirmDelete?.vehicle_id}</span>? This cannot be undone.
          </>
        }
      />
    </div>
  );
};

export default VehicleManagement;
