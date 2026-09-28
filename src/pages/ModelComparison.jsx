import React, { useState, useEffect, useMemo } from 'react';
import {
  GitCompare, Cpu, Database, CheckCircle2, AlertTriangle, Layers,
  RefreshCw, Trophy, FlaskConical, ClipboardList, Target, Info
} from 'lucide-react';
import { getModelComparison, getModelRegistry, getForecast } from '../api/client';
import { Loading, ErrorState, PageHeader, StatCard } from '../components/ui';

const TabButton = ({ id, label, icon: Icon, active, onSelect }) => (
  <button
    role="tab"
    aria-selected={active}
    onClick={() => onSelect(id)}
    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
      active ? 'border-[#E31E24] text-[#E31E24] bg-[#1F1F1F]' : 'border-transparent text-slate-500 hover:text-slate-200'
    }`}
  >
    <Icon size={13} /> {label}
  </button>
);

const TASK_LABELS = {
  delay_prediction: 'Delay Prediction',
  demand_forecast: 'Demand Forecast',
  route_clustering: 'Route Clustering',
  occupancy_risk: 'Occupancy Risk',
};
const TASK_KIND = {
  delay_prediction: 'regression',
  demand_forecast: 'regression',
  route_clustering: 'clustering',
  occupancy_risk: 'classification',
};
const PIPE_META = {
  spark_mllib: { label: 'Apache Spark MLlib', icon: Database, color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  python_sklearn: { label: 'Python Scikit-Learn', icon: Cpu, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
};

const fmt = (v) => {
  if (v == null) return '—';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return String(v);
};
const pct = (v) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`);

export default function ModelComparison() {
  const [activeTab, setActiveTab] = useState('comparison');
  const [report, setReport] = useState(null);
  const [registry, setRegistry] = useState([]);
  const [fcDash, setFcDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.allSettled([getModelComparison(), getModelRegistry(), getForecast()])
      .then(([m, r, f]) => {
        if (m.status === 'fulfilled') setReport(m.value.data);
        else setError('Failed to load model comparison report. Run the comparison pipeline first.');
        if (r.status === 'fulfilled') setRegistry(r.value.data || []);
        if (f.status === 'fulfilled') setFcDash(f.value.data || null);
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const tasks = useMemo(() => {
    if (!report?.models) return [];
    return Object.entries(report.models).map(([key, val]) => ({ key, ...val, label: TASK_LABELS[key] || key }));
  }, [report]);

  const winners = useMemo(() => {
    const c = { spark_mllib: 0, python_sklearn: 0 };
    tasks.forEach((t) => { if (t.winner && c[t.winner] != null) c[t.winner] += 1; });
    return c;
  }, [tasks]);

  const consistency = useMemo(() => {
    const rows = fcDash?.model_comparison || [];
    if (!rows.length) return null;
    const matches = rows.filter((r) => r.match).length;
    return { total: rows.length, matches, pct: Math.round((matches / rows.length) * 100) };
  }, [fcDash]);

  const metricDefs = (kind) => {
    if (kind === 'classification') return [
      { key: 'accuracy', label: 'Accuracy', hi: true },
      { key: 'precision', label: 'Precision', hi: true },
      { key: 'recall', label: 'Recall', hi: true },
      { key: 'f1', label: 'F1-Score', hi: true },
    ];
    if (kind === 'clustering') return [
      { key: 'silhouette', label: 'Silhouette', hi: true },
      { key: 'k', label: 'Clusters (k)', hi: null },
    ];
    return [
      { key: 'rmse', label: 'RMSE', hi: false },
      { key: 'mae', label: 'MAE', hi: false },
      { key: 'r2', label: 'R²', hi: true },
    ];
  };

  const MetricRow = ({ def, sparkVal, pyVal }) => {
    const better = (a, b) => {
      if (def.hi == null || a == null || b == null || a === b) return null;
      return def.hi ? (a > b ? 'spark' : 'python') : (a < b ? 'spark' : 'python');
    };
    const win = better(sparkVal, pyVal);
    return (
      <tr className="border-t border-[#2A2A2A]">
        <td className="py-2 px-3 text-slate-500 font-medium">{def.label}</td>
        <td className={`py-2 px-3 text-right font-bold ${win === 'spark' ? 'text-emerald-600' : 'text-slate-200'}`}>
          {def.key === 'k' ? fmt(sparkVal) : def.key === 'accuracy' || def.key === 'precision' || def.key === 'recall' || def.key === 'f1' ? pct(sparkVal) : fmt(sparkVal)}
          {win === 'spark' && <span className="ml-1 text-[9px] text-emerald-500">◀ better</span>}
        </td>
        <td className={`py-2 px-3 text-right font-bold ${win === 'python' ? 'text-emerald-600' : 'text-slate-200'}`}>
          {def.key === 'k' ? fmt(pyVal) : def.key === 'accuracy' || def.key === 'precision' || def.key === 'recall' || def.key === 'f1' ? pct(pyVal) : fmt(pyVal)}
          {win === 'python' && <span className="ml-1 text-[9px] text-emerald-500">◀ better</span>}
        </td>
      </tr>
    );
  };

  if (loading) {
    return (
      <div className="space-y-5 max-w-[1600px] mx-auto">
        <PageHeader title="Model Lab" subtitle="Dual-Pipeline benchmarking: Apache Spark MLlib vs Python Scikit-Learn / XGBoost" icon={GitCompare} />
        <div className="bg-[#1F1F1F] rounded border border-[#2A2A2A] shadow-xs">
          <Loading label="Loading dual-pipeline benchmark report..." />
        </div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="space-y-5 max-w-[1600px] mx-auto">
        <PageHeader title="Model Lab" subtitle="Dual-Pipeline benchmarking: Apache Spark MLlib vs Python Scikit-Learn / XGBoost" icon={GitCompare} />
        <div className="bg-[#1F1F1F] rounded border border-[#2A2A2A] shadow-xs">
          <ErrorState message={error} onRetry={load} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto font-sans">
      {/* Header */}
      <PageHeader
        title="AI Model Lab & Dual-Pipeline Benchmarking"
        subtitle={
          <>
            Distributed Apache Spark MLlib vs Python Scikit-Learn / XGBoost high-performance pipeline validation
            {report?.timestamp && <span className="ml-1 text-red-500 font-semibold">· {report.timestamp}</span>}
          </>
        }
        icon={GitCompare}
        actions={
          <button onClick={load} title="Refresh" aria-label="Refresh model report" className="p-2 rounded border border-[#2A2A2A] text-slate-400 hover:text-white hover:bg-white/5 transition">
            <RefreshCw size={15} />
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Tasks Benchmarked" value={tasks.length} sub="dual pipeline each" />
        <StatCard label="Python sklearn Wins" value={winners.python_sklearn} sub={`of ${tasks.length} tasks`} tone="blue" />
        <StatCard label="Spark MLlib Wins" value={winners.spark_mllib} sub={`of ${tasks.length} tasks`} tone="violet" />
        <StatCard label="Pipeline Consistency" value={consistency ? `${consistency.pct}%` : '—'} sub={consistency ? `${consistency.matches}/${consistency.total} test cases agree` : 'no cases'} tone="emerald" />
      </div>

      {/* Tabs */}
      <div role="tablist" className="flex items-center gap-2 border-b border-[#2A2A2A] overflow-x-auto">
        <TabButton id="comparison" label="Model Comparison" icon={GitCompare} active={activeTab === 'comparison'} onSelect={setActiveTab} />
        <TabButton id="details" label="Model Details" icon={FlaskConical} active={activeTab === 'details'} onSelect={setActiveTab} />
        <TabButton id="results" label="Prediction Results" icon={Target} active={activeTab === 'results'} onSelect={setActiveTab} />
      </div>

      {/* ============ TAB: COMPARISON ============ */}
      {activeTab === 'comparison' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {tasks.map((t) => {
              const spark = t.spark_mllib || {};
              const py = t.python_sklearn || {};
              const SparkIcon = PIPE_META.spark_mllib.icon;
              const PyIcon = PIPE_META.python_sklearn.icon;
              return (
                <div key={t.key} className="bg-[#1F1F1F] p-5 rounded border border-[#2A2A2A] shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Layers size={16} className="text-[#E31E24]" />
                      <h2 className="text-sm font-bold text-white">{t.label}</h2>
                      <span className="text-[10px] font-bold bg-[#1B1B1B] text-slate-500 px-2 py-0.5 rounded-full uppercase">
                        {TASK_KIND[t.key]}
                      </span>
                    </div>
                    {t.winner && (
                      <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${t.winner === 'python_sklearn' ? 'bg-blue-50 text-blue-700' : 'bg-indigo-50 text-indigo-700'}`}>
                        <Trophy size={11} /> {PIPE_META[t.winner]?.label}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-3 rounded-[4px] border border-[#2A2A2A] bg-[#141414] overflow-hidden">
                      <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-amber-400">
                        <SparkIcon size={13} /> Spark MLlib
                      </div>
                      <div className="text-xs text-white mt-1 font-semibold truncate" title={spark.model_type}>{spark.model_type}</div>
                    </div>
                    <div className="p-3 rounded-[4px] border border-[#2A2A2A] bg-[#141414] overflow-hidden">
                      <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-[#E31E24]">
                        <PyIcon size={13} /> Scikit-Learn
                      </div>
                      <div className="text-xs text-white mt-1 font-semibold truncate" title={py.model_type}>{py.model_type}</div>
                    </div>
                  </div>

                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] uppercase text-slate-400 border-b border-[#2A2A2A]">
                        <th className="py-2 px-3 text-left">Metric</th>
                        <th className="py-2 px-3 text-right text-amber-400 font-bold">Spark</th>
                        <th className="py-2 px-3 text-right text-[#E31E24] font-bold">Python</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A2A2A]">
                      {metricDefs(TASK_KIND[t.key]).map((def) => (
                        <MetricRow key={def.key} def={def} sparkVal={spark[def.key]} pyVal={py[def.key]} />
                      ))}
                      {spark.num_trees != null && (
                        <MetricRow def={{ key: 'num_trees', label: 'Trees', hi: null }} sparkVal={spark.num_trees} pyVal={py.num_trees} />
                      )}
                    </tbody>
                  </table>

                  <div className="mt-3.5 pt-3 border-t border-[#2A2A2A] text-[11px] text-slate-400 flex items-start gap-1.5">
                    <Info size={13} className="mt-0.5 shrink-0 text-[#E31E24]" />
                    <span><strong className="text-slate-300">Features:</strong> {[...new Set([...(spark.features || []), ...(py.features || [])])].join(', ') || '—'}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pipeline Consistency */}
          <div className="bg-[#1F1F1F] p-5 rounded border border-[#2A2A2A] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Pipeline Consistency</span>
                <span className="text-xs text-slate-400">(Unseen Cases: {consistency?.total ?? '—'})</span>
              </div>
              <span className="text-xl font-extrabold text-[#E31E24]">{consistency ? `${consistency.pct}%` : '—'}</span>
            </div>
            <div className="w-full bg-[#1B1B1B] h-3.5 rounded-full overflow-hidden mb-3">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${consistency?.pct ?? 0}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Prediction Agreement: <strong className="text-white">{consistency ? `${consistency.matches} / ${consistency.total}` : '—'}</strong></span>
              <span>Different Predictions: <strong className="text-rose-600">{consistency ? `${consistency.total - consistency.matches} / ${consistency.total}` : '—'}</strong></span>
            </div>
          </div>

          {/* Visual Evidence: Dual Pipeline & Confusion Matrix Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-[#1F1F1F] p-5 rounded border border-[#2A2A2A] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#2A2A2A]">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-[4px] bg-[#E31E24] text-white text-[10px] font-black uppercase">Step 44</span>
                    <h3 className="text-sm font-bold text-white">Dual-Pipeline Consistency Chart</h3>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-400">87.0% Match</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Visual breakdown of 150 unseen operational cases evaluated across Apache Spark MLlib and Python Scikit-Learn.
                </p>
                <div className="bg-[#141414] rounded p-2 flex items-center justify-center min-h-[220px]">
                  <img
                    src="/charts/step44_pipeline_agreement.png"
                    alt="Step 44 Pipeline Agreement"
                    className="max-h-60 max-w-full object-contain rounded"
                  />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-[#2A2A2A] flex items-center justify-between text-[11px] text-slate-400">
                <span>Holdout: 150 Unseen Cases</span>
                <a href="/charts/step44_pipeline_agreement.png" download="step44_pipeline_agreement.png" className="text-[#E31E24] hover:underline font-bold">Download PNG ›</a>
              </div>
            </div>

            <div className="bg-[#1F1F1F] p-5 rounded border border-[#2A2A2A] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#2A2A2A]">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-[4px] bg-[#E31E24] text-white text-[10px] font-black uppercase">Step 20</span>
                    <h3 className="text-sm font-bold text-white">Multi-Class Confusion Matrix</h3>
                  </div>
                  <span className="text-xs font-extrabold text-amber-400">96.66% Acc</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  PySpark MLlib classification accuracy across 5 delay severity tiers (On-Time, Minor, Moderate, Major, Severe).
                </p>
                <div className="bg-[#141414] rounded p-2 flex items-center justify-center min-h-[220px]">
                  <img
                    src="/charts/step20_confusion_matrix.png"
                    alt="Step 20 Confusion Matrix"
                    className="max-h-60 max-w-full object-contain rounded"
                  />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-[#2A2A2A] flex items-center justify-between text-[11px] text-slate-400">
                <span>Evaluated on 50,000 trips</span>
                <a href="/charts/step20_confusion_matrix.png" download="step20_confusion_matrix.png" className="text-[#E31E24] hover:underline font-bold">Download PNG ›</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ TAB: MODEL DETAILS ============ */}
      {activeTab === 'details' && (
        <div className="space-y-5">
          <div className="bg-[#1F1F1F] rounded border border-[#2A2A2A] shadow-xs overflow-hidden">
            <div className="p-5 pb-3 flex items-center gap-2">
              <FlaskConical size={15} className="text-[#E31E24]" />
              <h2 className="text-sm font-bold text-white">Trained Model Registry</h2>
              <span className="text-[10px] font-bold bg-[#1B1B1B] text-slate-500 px-2 py-0.5 rounded-full">{registry.length} models</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="text-[10px] uppercase bg-[#141414] text-slate-400">
                  <tr>
                    <th className="px-4 py-2.5">Task</th>
                    <th className="px-4 py-2.5">Pipeline</th>
                    <th className="px-4 py-2.5">Model</th>
                    <th className="px-4 py-2.5">Features</th>
                    <th className="px-4 py-2.5">Key Metrics</th>
                    <th className="px-4 py-2.5">Trained</th>
                  </tr>
                </thead>
                <tbody>
                  {registry.map((m) => {
                    const isSpark = m.pipeline_type === 'spark_mllib';
                    const winnerTask = tasks.find((t) => t.key === m.task_name || t.key === `${m.task_name}` || (m.task_name === 'forecast' && t.key === 'demand_forecast') || (m.task_name === 'delay' && t.key === 'delay_prediction') || (m.task_name === 'clustering' && t.key === 'route_clustering'));
                    const isWinner = winnerTask && winnerTask.winner === m.pipeline_type;
                    const metricStr = Object.entries(m.metrics || {})
                      .filter(([k]) => !['model_type', 'features', 'cluster_centers', 'tree_weights'].includes(k))
                      .map(([k, v]) => `${k}=${typeof v === 'number' ? (+v).toFixed(3).replace(/0+$/, '').replace(/\.$/, '') : v}`)
                      .join(' · ');
                    return (
                      <tr key={m.id} className="border-t border-[#2A2A2A] hover:bg-[#141414]">
                        <td className="px-4 py-2.5 font-bold text-white">
                          {m.task_name}
                          {isWinner && <span className="ml-1.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">WINNER</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isSpark ? 'bg-indigo-50 text-indigo-700' : 'bg-blue-50 text-blue-700'}`}>
                            {isSpark ? 'SPARK' : 'PYTHON'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-medium">{m.model_name}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1 max-w-[240px]">
                            {(m.metrics?.features || []).map((f) => (
                              <span key={f} className="text-[9px] bg-[#1B1B1B] text-slate-500 px-1.5 py-0.5 rounded">{f}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-[11px] text-slate-500 max-w-[280px]">{metricStr}</td>
                        <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{(m.created_at || '').slice(0, 16)}</td>
                      </tr>
                    );
                  })}
                  {!registry.length && <tr><td colSpan="6" className="px-4 py-6 text-center text-slate-400">No trained models in registry.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Extra model info cards from report */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasks.map((t) => (
              <div key={t.key} className="bg-[#1F1F1F] p-5 rounded border border-[#2A2A2A] shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white">{t.label}</span>
                  {t.winner && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={11} /> {PIPE_META[t.winner]?.label} wins
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 space-y-1">
                  {t.key === 'route_clustering' ? (
                    <>
                      <p>Spark silhouette <strong>{fmt(t.spark_mllib?.silhouette)}</strong> vs Sklearn <strong>{fmt(t.python_sklearn?.silhouette)}</strong> at k={t.spark_mllib?.k}.</p>
                      <p>Cluster centers stored in report ({t.spark_mllib?.cluster_centers?.length} centroids × {(t.spark_mllib?.cluster_centers?.[0] || []).length} features).</p>
                    </>
                  ) : t.key === 'occupancy_risk' ? (
                    <>
                      <p>Spark RF accuracy <strong>{pct(t.spark_mllib?.accuracy)}</strong> / F1 <strong>{pct(t.spark_mllib?.f1)}</strong>.</p>
                      <p>Python XGBoost accuracy <strong>{pct(t.python_sklearn?.accuracy)}</strong> / F1 <strong>{pct(t.python_sklearn?.f1)}</strong> — high accuracy but zero recall indicates majority-class collapse on rare overcrowding events.</p>
                    </>
                  ) : (
                    <>
                      <p>Winner evaluated by {'RMSE'}. Spark RMSE <strong>{fmt(t.spark_mllib?.rmse)}</strong> vs Python <strong>{fmt(t.python_sklearn?.rmse)}</strong>.</p>
                      <p>R²: Spark <strong>{fmt(t.spark_mllib?.r2)}</strong> · Python <strong>{fmt(t.python_sklearn?.r2)}</strong></p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ TAB: PREDICTION RESULTS ============ */}
      {activeTab === 'results' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-[#1F1F1F] p-4 rounded border border-[#2A2A2A] shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Test Targets</span>
              <div className="text-2xl font-bold text-white mt-1">{consistency?.total ?? '—'}</div>
              <div className="text-[11px] text-slate-400">compared across pipelines</div>
            </div>
            <div className="bg-[#1F1F1F] p-4 rounded border border-[#2A2A2A] shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Agreements</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">{consistency?.matches ?? '—'}</div>
              <div className="text-[11px] text-slate-400">spark ≈ python predictions</div>
            </div>
            <div className="bg-[#1F1F1F] p-4 rounded border border-[#2A2A2A] shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Unseen Sample Cases</span>
              <div className="text-2xl font-bold text-[#E31E24] mt-1">{report?.sample_test_cases?.length ?? 0}</div>
              <div className="text-[11px] text-slate-400">held-out evaluation inputs</div>
            </div>
          </div>

          {/* Dual pipeline results */}
          <div className="bg-[#1F1F1F] rounded border border-[#2A2A2A] shadow-xs overflow-hidden">
            <div className="p-5 pb-3 flex items-center gap-2">
              <Target size={15} className="text-[#E31E24]" />
              <h2 className="text-sm font-bold text-white">Spark vs Python — Prediction Results</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="text-[10px] uppercase bg-[#141414] text-slate-400">
                  <tr>
                    <th className="px-4 py-2.5">Target</th>
                    <th className="px-4 py-2.5">Actual</th>
                    <th className="px-4 py-2.5 text-indigo-600">Spark MLlib</th>
                    <th className="px-4 py-2.5 text-[#E31E24]">Python sklearn</th>
                    <th className="px-4 py-2.5">Difference</th>
                    <th className="px-4 py-2.5">Agreement</th>
                  </tr>
                </thead>
                <tbody>
                  {(fcDash?.model_comparison || []).map((m) => (
                    <tr key={m.target_id} className="border-t border-[#2A2A2A] hover:bg-[#141414]">
                      <td className="px-4 py-2.5 font-bold text-white">{m.target_id}</td>
                      <td className="px-4 py-2.5">{Number(m.actual).toLocaleString()}</td>
                      <td className="px-4 py-2.5 font-semibold">{Number(m.spark_result).toLocaleString()}</td>
                      <td className="px-4 py-2.5 font-semibold">{Number(m.python_result).toLocaleString()}</td>
                      <td className="px-4 py-2.5">{m.difference}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${m.match ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {m.match ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />} {m.match ? 'MATCH' : 'MISMATCH'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!(fcDash?.model_comparison || []).length && (
                    <tr><td colSpan="6" className="px-4 py-6 text-center text-slate-400">No prediction comparison data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Unseen sample cases */}
          <div className="bg-[#1F1F1F] rounded border border-[#2A2A2A] shadow-xs overflow-hidden">
            <div className="p-5 pb-3 flex items-center gap-2">
              <ClipboardList size={15} className="text-[#E31E24]" />
              <h2 className="text-sm font-bold text-white">Unseen Evaluation Cases (inputs)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="text-[10px] uppercase bg-[#141414] text-slate-400">
                  <tr>
                    <th className="px-4 py-2.5">Route</th>
                    <th className="px-4 py-2.5">Scheduled Delay</th>
                    <th className="px-4 py-2.5">Hour of Day</th>
                    <th className="px-4 py-2.5">Day of Week</th>
                    <th className="px-4 py-2.5">Temperature</th>
                    <th className="px-4 py-2.5">Peak Hour</th>
                  </tr>
                </thead>
                <tbody>
                  {(report?.sample_test_cases || []).map((c, i) => (
                    <tr key={i} className="border-t border-[#2A2A2A] hover:bg-[#141414]">
                      <td className="px-4 py-2.5 font-bold text-white">{c.route_id}</td>
                      <td className="px-4 py-2.5">{c.scheduled_delay_minutes} min</td>
                      <td className="px-4 py-2.5">{c.hour_of_day}:00</td>
                      <td className="px-4 py-2.5">{c.day_of_week}</td>
                      <td className="px-4 py-2.5">{c.temperature_c}°C</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.is_peak_hour ? 'bg-amber-100 text-amber-700' : 'bg-[#1B1B1B] text-slate-500'}`}>
                          {c.is_peak_hour ? 'PEAK' : 'OFF-PEAK'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!(report?.sample_test_cases || []).length && (
                    <tr><td colSpan="6" className="px-4 py-6 text-center text-slate-400">No sample cases in report.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
