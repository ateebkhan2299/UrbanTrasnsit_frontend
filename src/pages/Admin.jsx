import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  UserPlus, Users, Database, ScrollText, Activity, Trash2,
  RefreshCw, CheckCircle, XCircle, Power, KeyRound, Inbox
} from 'lucide-react';
import {
  Modal, ConfirmDialog, Loading, ErrorState, EmptyState, PageHeader,
  SearchInput, StatCard, friendlyError, useToast
} from '../components/ui';

const ROLES = ['Admin', 'Operator', 'Analyst', 'Evaluator'];
const EMPTY_FORM = { username: '', full_name: '', email: '', role: 'Analyst', password: '' };

const RoleBadge = ({ role }) => {
  const map = {
    Admin: 'bg-blue-100 text-blue-700 border-blue-200',
    Operator: 'bg-amber-100 text-amber-700 border-amber-200',
    Analyst: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Evaluator: 'bg-violet-100 text-violet-700 border-violet-200'
  };
  return <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${map[role] || 'bg-[#1B1B1B] text-slate-300 border-[#2A2A2A]'}`}>{role}</span>;
};

export default function Admin() {
  const [activeTab, setActiveTab] = useState('users');
  const { token, user } = useAuth();
  
  const getAuthHeaders = () => {
    const t = token || localStorage.getItem('token');
    return {
      'Authorization': t ? `Bearer ${t}` : '',
      'Content-Type': 'application/json'
    };
  };

  const isAdmin = user?.role === 'Admin';
  const toast = useToast();

  // --- Users state ---
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // --- Registry state ---
  const [registry, setRegistry] = useState([]);
  const [registryLoading, setRegistryLoading] = useState(true);

  // --- Audit state ---
  const [logs, setLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  // --- Monitoring state ---
  const [health, setHealth] = useState(null);
  const [sync, setSync] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [monLoading, setMonLoading] = useState(true);
  const [monError, setMonError] = useState('');

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/admin/users', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
      setUsers(await res.json());
      setUsersError(null);
    } catch (err) {
      setUsersError(friendlyError(err));
    } finally {
      setUsersLoading(false);
    }
  }, [token]);

  const fetchRegistry = useCallback(async () => {
    try {
      const res = await fetch('/api/models/registry', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`Failed to load model registry (${res.status})`);
      setRegistry(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setRegistryLoading(false);
    }
  }, [token]);

  const fetchAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await fetch('/api/admin/audit-trail', { headers: getAuthHeaders() });
      if (res.status === 403) { setAuditError('Your role does not have permission to view audit logs (Admin/Evaluator only)'); setLogs([]); return; }
      if (!res.ok) throw new Error(`Failed to load audit trail (${res.status})`);
      setLogs(await res.json());
      setAuditError('');
    } catch (err) {
      setAuditError(err.message);
    } finally {
      setAuditLoading(false);
    }
  }, [token]);

  const fetchMonitoring = useCallback(async () => {
    setMonLoading(true);
    try {
      const [hRes, sRes, jRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/dashboard/sync-status'),
        fetch('/api/admin/spark-jobs', { headers: getAuthHeaders() })
      ]);
      setHealth(hRes.ok ? await hRes.json() : null);
      setSync(sRes.ok ? await sRes.json() : null);
      if (jRes.ok) { setJobs(await jRes.json()); setMonError(''); }
      else setMonError(jRes.status === 403 ? 'Spark job history requires Admin/Evaluator role' : 'Failed to load Spark jobs');
    } catch (err) {
      setMonError(err.message);
    } finally {
      setMonLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchUsers(); fetchRegistry(); }, [fetchUsers, fetchRegistry]);
  useEffect(() => { if (activeTab === 'audit') fetchAudit(); }, [activeTab, fetchAudit]);
  useEffect(() => { if (activeTab === 'health') fetchMonitoring(); }, [activeTab, fetchMonitoring]);

  // --- Users handlers ---
  const filteredUsers = users.filter((u) =>
    (roleFilter === 'all' || u.role === roleFilter) &&
    (u.username + ' ' + u.full_name + ' ' + u.email).toLowerCase().includes(userSearch.toLowerCase())
  );

  const userStats = {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    admins: users.filter((u) => u.role === 'Admin').length,
    locked: users.filter((u) => !u.is_active).length
  };

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); };
  const openEdit = (u) => {
    setEditing(u);
    setForm({ username: u.username, full_name: u.full_name || '', email: u.email || '', role: u.role, password: '' });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      let res;
      if (editing) {
        const payload = { email: form.email, role: form.role, full_name: form.full_name };
        if (form.password) payload.password = form.password;
        res = await fetch(`/api/admin/users/${editing.username}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(payload) });
      } else {
        res = await fetch('/api/admin/users', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(form) });
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Save failed');
      }
      setModalOpen(false);
      toast.success(editing ? 'User updated' : 'User created');
      await fetchUsers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (u) => {
    try {
      const res = await fetch(`/api/admin/users/${u.username}`, {
        method: 'PUT', headers: getAuthHeaders(),
        body: JSON.stringify({ is_active: !u.is_active })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Update failed');
      }
      toast.success(`${u.username} ${u.is_active ? 'disabled' : 'enabled'}`);
      await fetchUsers();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (username) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${username}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Delete failed');
      }
      setConfirmDelete(null);
      toast.success('User deleted');
      await fetchUsers();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // --- Audit filters ---
  const actionOptions = ['all', ...Array.from(new Set(logs.map((l) => l.action)))];
  const filteredLogs = logs.filter((l) =>
    (actionFilter === 'all' || l.action === actionFilter) &&
    (l.username + ' ' + l.action + ' ' + l.endpoint + ' ' + (l.details || '')).toLowerCase().includes(logSearch.toLowerCase())
  );

  const actionTone = (a) => {
    if (/DELETE|DISABLE/.test(a)) return 'bg-rose-100 text-rose-700 border-rose-200';
    if (/CREATE|LOGIN/.test(a)) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (/UPDATE|RESET/.test(a)) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-[#1B1B1B] text-slate-300 border-[#2A2A2A]';
  };

  // --- Monitoring helpers ---
  const fmtUptime = (s) => {
    if (!s && s !== 0) return '—';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  };
  const jobStatusIcon = (st) => {
    if (st === 'SUCCESS' || st === 'COMPLETED' || st === 'completed') return <span className="inline-flex items-center gap-1 text-emerald-600 font-bold"><CheckCircle size={12} /> {st}</span>;
    if (st === 'FAILED' || st === 'error') return <span className="inline-flex items-center gap-1 text-rose-600 font-bold"><XCircle size={12} /> {st}</span>;
    return <span className="inline-flex items-center gap-1 text-[#E31E24] font-bold"><RefreshCw size={12} className="animate-spin" /> {st}</span>;
  };

  const TABS = [
    { id: 'users', label: 'Users & Roles', icon: Users },
    { id: 'registry', label: 'Model Registry', icon: Database },
    { id: 'audit', label: 'Audit Logs', icon: ScrollText },
    { id: 'health', label: 'System Monitoring', icon: Activity }
  ];

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto font-sans">
      {/* Header */}
      <PageHeader
        title="Administration"
        subtitle="User access control, role delegation, model version registry, and system audit logs"
        icon={Users}
        actions={
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-1.5">
            Logged in as <span className="text-white">{user?.username}</span>
            <RoleBadge role={user?.role} />
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#2A2A2A] overflow-x-auto" role="tablist" aria-label="Administration sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[#E31E24] text-[#E31E24] bg-[#1F1F1F]'
                : 'border-transparent text-slate-500 hover:text-slate-200'
            }`}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ============ TAB 1: USERS & ROLES ============ */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Users} tone="blue" label="Total Users" value={userStats.total} />
            <StatCard icon={CheckCircle} tone="emerald" label="Active" value={userStats.active} />
            <StatCard icon={UserPlus} tone="amber" label="Administrators" value={userStats.admins} />
            <StatCard icon={Power} tone="rose" label="Deactivated" value={userStats.locked} />
          </div>

          <div className="bg-[#1F1F1F] p-5 rounded border border-[#2A2A2A] shadow-xs">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h2 className="text-sm font-bold text-white">User Access Control</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <SearchInput value={userSearch} onChange={setUserSearch} placeholder="Search users..." className="w-44" />
                <label htmlFor="admin-role-filter" className="sr-only">Filter by role</label>
                <select
                  id="admin-role-filter"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="text-xs border border-[#2A2A2A] rounded-lg px-2 py-1.5 bg-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">All Roles</option>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <button
                  onClick={openAdd}
                  disabled={!isAdmin}
                  title={isAdmin ? 'Add a new user' : 'Admin role required'}
                  className="flex items-center gap-1.5 bg-[#E31E24] hover:bg-[#b81419] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-xs"
                >
                  <UserPlus size={14} /> Add User
                </button>
              </div>
            </div>

            {usersLoading ? (
              <Loading label="Loading users..." />
            ) : usersError ? (
              <ErrorState message={usersError} onRetry={fetchUsers} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#141414] text-slate-500 font-semibold border-b border-[#2A2A2A]">
                    <tr>
                      <th className="py-2.5 px-4">User</th>
                      <th className="py-2.5 px-4">Role</th>
                      <th className="py-2.5 px-4">Email</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Created</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-200 font-medium">
                    {filteredUsers.map((u) => (
                      <tr key={u.username} className="hover:bg-[#141414]/60 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{u.full_name || u.username}</div>
                          <div className="text-[11px] text-slate-400">@{u.username}</div>
                        </td>
                        <td className="py-3 px-4"><RoleBadge role={u.role} /></td>
                        <td className="py-3 px-4 text-slate-500">{u.email || '—'}</td>
                        <td className="py-3 px-4">
                          {u.is_active ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                            </span>
                          ) : (
                            <span className="text-rose-600 font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Disabled
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">{u.created_at ? String(u.created_at).slice(0, 10) : '—'}</td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => openEdit(u)}
                            disabled={!isAdmin}
                            className="text-[#E31E24] hover:underline mr-3 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                          >Edit</button>
                          <button
                            onClick={() => handleToggleActive(u)}
                            disabled={!isAdmin || u.username === user?.username}
                            title={!isAdmin ? 'Admin role required' : u.username === user?.username ? 'You cannot deactivate yourself' : ''}
                            className="text-slate-500 hover:text-amber-600 mr-3 font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
                          >{u.is_active ? 'Disable' : 'Enable'}</button>
                          <button
                            onClick={() => setConfirmDelete(u)}
                            disabled={!isAdmin || u.username === user?.username}
                            title={!isAdmin ? 'Admin role required' : u.username === user?.username ? 'You cannot delete yourself' : ''}
                            className="text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          ><Trash2 size={13} /></button>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={6} className="p-0"><EmptyState icon={Inbox} title={users.length === 0 ? 'No users yet' : 'No users match your filters'} message={users.length === 0 ? 'Add your first user to get started.' : 'Try a different search or role.'} action={users.length > 0 ? { label: 'Clear filters', onClick: () => { setUserSearch(''); setRoleFilter('all'); } } : null} /></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ TAB 2: MODEL REGISTRY ============ */}
      {activeTab === 'registry' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Database} tone="blue" label="Registered Models" value={registry.length} />
            <StatCard icon={Activity} tone="emerald" label="Tasks Covered" value={new Set(registry.map((m) => m.task_name)).size} />
            <StatCard icon={CheckCircle} tone="amber" label="Scikit-Learn" value={registry.filter((m) => m.pipeline_type === 'python_sklearn').length} />
            <StatCard icon={RefreshCw} tone="slate" label="Spark MLlib" value={registry.filter((m) => m.pipeline_type === 'spark_mllib').length} />
          </div>

          <div className="bg-[#1F1F1F] p-5 rounded border border-[#2A2A2A] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white">Trained Model Registry</h2>
              <button onClick={fetchRegistry} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#E31E24] border border-[#2A2A2A] px-3 py-1.5 rounded-lg transition">
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
            {registryLoading ? (
              <Loading label="Loading registry..." />
            ) : registry.length === 0 ? (
              <EmptyState icon={Inbox} title="No trained models yet" message="Train a model to populate the registry." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#141414] text-slate-500 font-semibold border-b border-[#2A2A2A]">
                    <tr>
                      <th className="py-2.5 px-4">Task</th>
                      <th className="py-2.5 px-4">Pipeline</th>
                      <th className="py-2.5 px-4">Model</th>
                      <th className="py-2.5 px-4">Key Metrics</th>
                      <th className="py-2.5 px-4">Trained</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-200 font-medium">
                    {registry.map((m) => {
                      const metrics = m.metrics || {};
                      const pick = ['f1', 'accuracy', 'rmse', 'mae', 'r2', 'silhouette', 'precision', 'recall', 'k']
                        .filter((k) => metrics[k] !== undefined && metrics[k] !== null);
                      return (
                        <tr key={m.id} className="hover:bg-[#141414]/60 transition align-top">
                          <td className="py-3 px-4"><span className="font-bold text-white capitalize">{m.task_name.replace('_', ' ')}</span></td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${m.pipeline_type === 'spark_mllib' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                              {m.pipeline_type === 'spark_mllib' ? 'Spark MLlib' : 'Scikit-Learn'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-white">{m.model_name}</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1.5">
                              {pick.map((k) => (
                                <span key={k} className="bg-[#1B1B1B] border border-[#2A2A2A] rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-300">
                                  {k}={typeof metrics[k] === 'number' ? metrics[k].toFixed(3).replace(/\.?0+$/, '') : String(metrics[k])}
                                </span>
                              ))}
                              {pick.length === 0 && <span className="text-slate-400 text-[11px]">No scalar metrics</span>}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">{m.created_at ? String(m.created_at).slice(0, 19).replace('T', ' ') : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ TAB 3: AUDIT LOGS ============ */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-[#1F1F1F] p-5 rounded border border-[#2A2A2A] shadow-xs">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div>
                <h2 className="text-sm font-bold text-white">System Audit Trail</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">{filteredLogs.length} of {logs.length} entries shown (latest 100)</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <SearchInput value={logSearch} onChange={setLogSearch} placeholder="Search user, action, endpoint..." className="w-56" />
                <label htmlFor="audit-action-filter" className="sr-only">Filter by action</label>
                <select
                  id="audit-action-filter"
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="text-xs border border-[#2A2A2A] rounded-lg px-2 py-1.5 bg-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {actionOptions.map((a) => <option key={a} value={a}>{a === 'all' ? 'All Actions' : a}</option>)}
                </select>
                <button onClick={fetchAudit} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#E31E24] border border-[#2A2A2A] px-3 py-1.5 rounded-lg transition">
                  <RefreshCw size={13} /> Refresh
                </button>
              </div>
            </div>

            {auditLoading ? (
              <Loading label="Loading audit trail..." />
            ) : auditError ? (
              <ErrorState message={auditError} onRetry={fetchAudit} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#141414] text-slate-500 font-semibold border-b border-[#2A2A2A]">
                    <tr>
                      <th className="py-2.5 px-4">Time</th>
                      <th className="py-2.5 px-4">User</th>
                      <th className="py-2.5 px-4">Role</th>
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 px-4">Endpoint</th>
                      <th className="py-2.5 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-200 font-medium">
                    {filteredLogs.map((l) => (
                      <tr key={l.id} className="hover:bg-[#141414]/60 transition">
                        <td className="py-2.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">{String(l.timestamp).slice(0, 19).replace('T', ' ')}</td>
                        <td className="py-2.5 px-4 font-bold text-white">{l.username}</td>
                        <td className="py-2.5 px-4"><RoleBadge role={l.role} /></td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${actionTone(l.action)}`}>{l.action}</span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">{l.endpoint}</td>
                        <td className="py-2.5 px-4 text-slate-500 text-[11px] max-w-[280px] truncate" title={l.details || ''}>{l.details || '—'}</td>
                      </tr>
                    ))}
                    {filteredLogs.length === 0 && (
                      <tr><td colSpan={6} className="p-0"><EmptyState icon={Inbox} title="No log entries" message={logs.length === 0 ? 'Audit entries appear here as people use the system.' : 'Nothing matches your filters.'} action={logs.length > 0 ? { label: 'Clear filters', onClick: () => { setLogSearch(''); setActionFilter('all'); } } : null} /></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ TAB 4: SYSTEM MONITORING ============ */}
      {activeTab === 'health' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={Activity}
              tone={health?.status === 'healthy' ? 'emerald' : 'rose'}
              label="API Status"
              value={health ? health.status.toUpperCase() : '...'}
              sub={health ? `DB: ${health.database}` : ''}
            />
            <StatCard icon={RefreshCw} tone="blue" label="Uptime" value={health ? fmtUptime(health.uptime_seconds) : '...'} sub="since last restart" />
            <StatCard icon={Database} tone="amber" label="Memory" value={health ? `${health.memory_usage_mb} MB` : '...'} sub="backend process RSS" />
            <StatCard icon={ScrollText} tone="slate" label="Last Sync" value={sync ? (sync.last_updated || sync.status || '—') : '...'} sub={sync?.status ? `status: ${sync.status}` : 'data sync status'} />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-[#1F1F1F] p-5 rounded border border-[#2A2A2A] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-white">Spark Job History</h2>
                <button onClick={fetchMonitoring} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#E31E24] border border-[#2A2A2A] px-3 py-1.5 rounded-lg transition">
                  <RefreshCw size={13} /> Refresh
                </button>
              </div>
              {monLoading ? (
                <Loading label="Loading..." />
              ) : monError ? (
                <ErrorState message={monError} onRetry={fetchMonitoring} />
              ) : jobs.length === 0 ? (
                <EmptyState icon={Inbox} title="No Spark jobs recorded" message="Run a Spark job to see its history here." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#141414] text-slate-500 font-semibold border-b border-[#2A2A2A]">
                      <tr>
                        <th className="py-2.5 px-4">Job</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4">Started</th>
                        <th className="py-2.5 px-4">Duration</th>
                        <th className="py-2.5 px-4">Records</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-200 font-medium">
                      {jobs.map((j) => (
                        <tr key={j.id} className="hover:bg-[#141414]/60 transition">
                          <td className="py-2.5 px-4 font-bold text-white">{j.job_name}</td>
                          <td className="py-2.5 px-4">{jobStatusIcon(j.status)}</td>
                          <td className="py-2.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">{j.start_time ? String(j.start_time).slice(0, 19).replace('T', ' ') : '—'}</td>
                          <td className="py-2.5 px-4 text-slate-500">{j.duration_seconds != null ? `${Math.round(j.duration_seconds)}s` : '—'}</td>
                          <td className="py-2.5 px-4 text-slate-500">{j.records_processed != null ? j.records_processed.toLocaleString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-[#1F1F1F] p-5 rounded border border-[#2A2A2A] shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-white">Service Checks</h2>
              {[
                { name: 'FastAPI Backend', ok: health?.status === 'healthy', detail: health ? `uptime ${fmtUptime(health.uptime_seconds)}` : 'checking...' },
                { name: 'SQLite Database', ok: health?.database === 'connected', detail: health?.database || 'checking...' },
                { name: 'Data Sync', ok: sync?.status === 'OK' || sync?.status === 'ok' || (sync && !sync.error), detail: sync ? `last sync: ${sync.last_updated || '—'}` : 'checking...' },
                { name: 'Model Registry', ok: registry.length > 0, detail: `${registry.length} models trained` },
                { name: 'Audit Trail', ok: logs.length > 0 || !auditLoading, detail: `${logs.length} log entries` }
              ].map((c) => (
                <div key={c.name} className="flex items-center justify-between gap-3 border border-[#2A2A2A] rounded px-3 py-2.5 bg-[#141414]/60">
                  <div>
                    <div className="text-xs font-bold text-white">{c.name}</div>
                    <div className="text-[10px] text-slate-400">{c.detail}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${c.ok ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-rose-100 text-rose-700 border-rose-200'}`}>
                    {c.ok ? 'UP' : 'DOWN'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============ ADD / EDIT USER MODAL ============ */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.username}` : 'Add New User'}
        closeOnBackdrop={false}
        footer={
          <>
            <button type="button" onClick={() => setModalOpen(false)} className="text-xs font-semibold text-slate-500 hover:text-slate-200 px-4 py-2 border border-[#2A2A2A] rounded-lg">
              Cancel
            </button>
            <button type="submit" form="user-form" disabled={saving} className="text-xs font-semibold text-white bg-[#E31E24] hover:bg-[#b81419] disabled:opacity-50 px-4 py-2 rounded-lg transition">
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create User'}
            </button>
          </>
        }
      >
        <form id="user-form" onSubmit={handleSave} className="space-y-3">
          {formError && (
            <div role="alert" className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {formError}
            </div>
          )}
          {!editing && (
            <div>
              <label htmlFor="new_username" className="block text-[11px] font-semibold text-slate-500 mb-1">Username *</label>
              <input
                id="new_username"
                required minLength={3}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full text-xs border border-[#2A2A2A] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                placeholder="e.g. hamza.ali"
              />
            </div>
          )}
          <div>
            <label htmlFor="new_full_name" className="block text-[11px] font-semibold text-slate-500 mb-1">Full Name</label>
            <input
              id="new_full_name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full text-xs border border-[#2A2A2A] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              placeholder="e.g. Hamza Ali"
            />
          </div>
          <div>
            <label htmlFor="new_email" className="block text-[11px] font-semibold text-slate-500 mb-1">Email {!editing && '*'}</label>
            <input
              id="new_email"
              required={!editing} type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full text-xs border border-[#2A2A2A] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              placeholder="user@transit.gov.pk"
            />
          </div>
          <div>
            <label htmlFor="new_role" className="block text-[11px] font-semibold text-slate-500 mb-1">Role *</label>
            <select
              id="new_role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full text-xs border border-[#2A2A2A] rounded-lg px-3 py-2 bg-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="new_password" className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
              <KeyRound size={11} /> {editing ? 'New Password (leave blank to keep current)' : 'Password * (min 6 chars)'}
            </label>
            <input
              id="new_password"
              required={!editing} minLength={6}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full text-xs border border-[#2A2A2A] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              placeholder={editing ? '••••••' : 'Enter password'}
            />
          </div>
        </form>
      </Modal>

      {/* ============ DELETE CONFIRM ============ */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => handleDelete(confirmDelete.username)}
        title="Delete user?"
        busy={deleting}
        message={
          <>
            <span className="font-bold text-white">@{confirmDelete?.username}</span> ({confirmDelete?.role}) will be permanently removed. Their audit log history is preserved.
          </>
        }
      />
    </div>
  );
}
