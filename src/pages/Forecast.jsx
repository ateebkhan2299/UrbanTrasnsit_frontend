import React, { useState, useEffect } from 'react';
import { PageHeader, StatCard, Loading, ErrorState } from '../components/ui';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Activity, AlertTriangle, Calendar } from 'lucide-react';
import { getForecast } from '../api/client';

export default function Forecast() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const res = await getForecast();
        if (res.data?.status === 'data_unavailable') {
          throw new Error(res.data.reason);
        }
        setData(res.data);
      } catch (err) {
        setData(null);
        setError(err.message || 'Forecast data could not be loaded.');
      } finally {
        setLoading(false);
      }
    };
    fetchForecast();
  }, []);

  if (loading) return <Loading message="Loading forecast models..." />;
  if (error) return <ErrorState message="Failed to load forecast data" />;

  return (
    <div className="p-6 max-w-7xl mx-auto text-white">
      <PageHeader 
        title="Passenger Demand Forecasting" 
        subtitle="Chronological forecasting using Spark MLlib and XGBoost pipelines" 
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Mean Absolute Error (MAE)" value={data?.metrics?.mae} icon={Activity} />
        <StatCard title="Root Mean Sq Error" value={data?.metrics?.rmse} icon={AlertTriangle} />
        <StatCard title="Model Accuracy" value={data?.metrics?.accuracy} icon={TrendingUp} color="text-green-500" />
        <StatCard title="Predicted Peak Period" value={data?.metrics?.predicted_peak} icon={Calendar} color="text-red-500" />
      </div>

      <div className="bg-[#1F1F1F] p-6 rounded-lg border border-[#2A2A2A] shadow-lg">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="text-[#E31E24]" />
          Demand Forecast vs Actual (Holdout Set)
        </h3>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.series} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="time" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
              <Legend />
              <Line type="monotone" dataKey="historical" stroke="#4ade80" name="Historical Average" strokeWidth={2} />
              <Line type="monotone" dataKey="forecast" stroke="#E31E24" name="ML Forecast" strokeWidth={3} />
              <Line type="monotone" dataKey="actual" stroke="#60a5fa" name="Actual (Holdout)" strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
