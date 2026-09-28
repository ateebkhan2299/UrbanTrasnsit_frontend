import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Play, CheckCircle, XCircle, Clock, Inbox } from 'lucide-react';
import { Loading, ErrorState, EmptyState, PageHeader, friendlyError } from '../components/ui';

const SparkJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  const fetchJobs = useCallback(async () => {
    try {
      const t = token || localStorage.getItem('token');
      const res = await fetch('/api/admin/spark-jobs', {
        headers: { 'Authorization': t ? `Bearer ${t}` : '' }
      });
      if (!res.ok) throw new Error('Failed to fetch spark jobs status');
      setJobs(await res.json());
      setError(null);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 15000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  return (
    <div className="space-y-6">
      <PageHeader
        dark
        title="Spark Job Monitoring"
        subtitle="Real-time status of PySpark analytics pipelines."
        icon={Play}
      />

      <div className="bg-[#1F1F1F] rounded border border-[#2A2A2A] overflow-hidden">
        {loading ? (
          <Loading dark label="Loading spark jobs..." />
        ) : error && jobs.length === 0 ? (
          <ErrorState dark message={error} onRetry={fetchJobs} />
        ) : jobs.length === 0 ? (
          <EmptyState dark icon={Inbox} title="No pipeline runs yet" message="Spark job executions will appear here after the first pipeline run." />
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4">
            {jobs.map((job) => (
              <div key={job.id} className="bg-[#141414]/40 rounded border border-[#2A2A2A] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {job.status === 'Success' && <CheckCircle className="w-6 h-6 text-emerald-400" />}
                    {job.status === 'Failed' && <XCircle className="w-6 h-6 text-red-400" />}
                    {job.status === 'Running' && <Clock className="w-6 h-6 text-amber-400 animate-pulse" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-200">{job.job_name}.py</h3>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-400">
                      <span>Started: {new Date(job.start_time).toLocaleString()}</span>
                      {job.end_time && <span>Finished: {new Date(job.end_time).toLocaleString()}</span>}
                      {job.duration_seconds && <span>Duration: {job.duration_seconds}s</span>}
                      {job.records_processed !== null && <span>Records: {job.records_processed.toLocaleString()}</span>}
                    </div>
                    {job.error_message && (
                      <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono rounded">
                        {job.error_message}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                    ${job.status === 'Success' ? 'bg-emerald-500/20 text-emerald-400' : ''}
                    ${job.status === 'Failed' ? 'bg-red-500/20 text-red-400' : ''}
                    ${job.status === 'Running' ? 'bg-amber-500/20 text-amber-400' : ''}
                  `}>
                    {job.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SparkJobs;
