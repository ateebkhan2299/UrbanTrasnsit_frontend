import React, { useState } from 'react';
import Header from '../components/Header';
import { exportReport } from '../api/client';
import { friendlyError, useToast } from '../components/ui';
import { FileText, Download, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';

const REPORT_TYPES = [
  { id: 'passenger_demand', name: 'Passenger Demand & Flow', desc: 'Origin-destination matrices and hourly boarding data.' },
  { id: 'route_performance', name: 'Route Performance', desc: 'Rankings, reliability scores, and overall health.' },
  { id: 'delays', name: 'Delay & Bottlenecks', desc: 'Incident causes, delay severity, and hotspot locations.' },
  { id: 'occupancy', name: 'Occupancy & Crowding', desc: 'Historical utilization rates and overcrowded trips.' },
  { id: 'forecasting', name: 'Demand Forecasting', desc: 'Future predicted volumes and error metrics.' },
  { id: 'route_clustering', name: 'Route Clustering', desc: 'Unsupervised ML clustering of routes by behavior.' },
  { id: 'recommendations', name: 'Actionable Recommendations', desc: 'Model-derived suggestions for schedule optimization.' },
  { id: 'model_comparison', name: 'Spark vs Python Comparison', desc: 'Dual-pipeline validation results and mismatches.' },
];

const ReportsExport = () => {
  const { addToast } = useToast();
  const [downloadStatus, setDownloadStatus] = useState(null); // { id: string, type: string, status: 'loading' | 'success' | 'error'

  const handleDownload = async (reportId, format) => {
    setDownloadStatus({ id: reportId, type: format, status: 'loading' });
    try {
      // Need to tell axios to return a blob
      const res = await exportReport(reportId, format);
      if (res.status === 200) {
        const blob = new Blob([res.data], { type: format === 'csv' ? 'text/csv' : 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `urbantransit_${reportId}_export.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

        setDownloadStatus({ id: reportId, type: format, status: 'success' });
        addToast('Export downloaded', 'success');
        setTimeout(() => setDownloadStatus(null), 3000);
      }
    } catch (err) {
      addToast(friendlyError(err), 'error');
      setDownloadStatus({ id: reportId, type: format, status: 'error' });
      setTimeout(() => setDownloadStatus(null), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto font-sans">
      <Header
        title="Intelligence Reports & Enterprise Data Export"
        subtitle="Download raw corridor analytics datasets and executive transit management dossiers"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {REPORT_TYPES.map((report) => (
          <div key={report.id} className="bg-[#1F1F1F] border border-[#2A2A2A] hover:border-[#E31E24]/50 rounded-[4px] p-6 flex flex-col justify-between transition-all duration-200 shadow-sm group">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded bg-[#E31E24]/10 border border-[#E31E24]/30 flex items-center justify-center text-[#E31E24]">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-red-400 transition-colors">{report.name}</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pl-12">{report.desc}</p>
            </div>
            
            <div className="flex gap-3 pt-4 border-t border-[#2A2A2A]">
              <button 
                onClick={() => handleDownload(report.id, 'csv')}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#141414] hover:bg-white hover:text-[#111111] text-slate-200 py-2.5 px-4 rounded-[4px] border border-[#2A2A2A] hover:border-white text-xs font-bold uppercase tracking-wider transition-all"
                disabled={downloadStatus?.id === report.id && downloadStatus?.status === 'loading'}
              >
                {downloadStatus?.id === report.id && downloadStatus?.type === 'csv' ? (
                  downloadStatus.status === 'loading' ? <span className="animate-spin w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full"></span> :
                  downloadStatus.status === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> :
                  <AlertCircle className="w-4 h-4 text-red-400" />
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>CSV Dataset</span>
                  </>
                )}
              </button>
              
              <button 
                onClick={() => handleDownload(report.id, 'pdf')}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#E31E24] hover:bg-white hover:text-[#E31E24] hover:border hover:border-[#E31E24] text-white py-2.5 px-4 rounded-[4px] border border-[#E31E24] text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-red-600/30"
                disabled={downloadStatus?.id === report.id && downloadStatus?.status === 'loading'}
              >
                {downloadStatus?.id === report.id && downloadStatus?.type === 'pdf' ? (
                  downloadStatus.status === 'loading' ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> :
                  downloadStatus.status === 'success' ? <CheckCircle className="w-4 h-4 text-white" /> :
                  <AlertCircle className="w-4 h-4 text-white" />
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>PDF Dossier</span>
                  </>
                )}
              </button>
            </div>
            
            {/* Error Message Tooltip-style */}
            {downloadStatus?.id === report.id && downloadStatus?.status === 'error' && (
              <div className="mt-3 text-xs text-red-400 text-center font-bold">
                Export failed. Please try again.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportsExport;
