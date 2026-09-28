import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { getSyncStatus } from '../api/client';

const LiveSyncIndicator = () => {
  const [syncData, setSyncData] = useState({ last_updated: '', status: 'ok' });
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isFailed, setIsFailed] = useState(false);

  const fetchSyncStatus = () => {
    setLoading(true);
    getSyncStatus()
      .then((res) => {
        setSyncData(res.data);
        setIsFailed(res.data.status !== 'ok');
        setSecondsAgo(0);
      })
      .catch(() => {
        setIsFailed(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSyncStatus();
    const pollInterval = setInterval(fetchSyncStatus, 30000); // Poll every 30s
    const timerInterval = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(timerInterval);
    };
  }, []);

  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
        isFailed
          ? 'bg-rose-950/60 border-rose-800/80 text-rose-400'
          : 'bg-emerald-950/50 border-emerald-800/60 text-emerald-400'
      }`}>
        <span className={`w-2.5 h-2.5 rounded-full ${isFailed ? 'bg-rose-500 animate-ping' : 'bg-emerald-400 animate-pulse'}`}></span>
        <span>{isFailed ? 'Sync Failed' : `Updated ${secondsAgo}s ago`}</span>
      </div>

      <button
        onClick={fetchSyncStatus}
        disabled={loading}
        title="Manual Refresh Pipeline Sync"
        className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
};

export default LiveSyncIndicator;
