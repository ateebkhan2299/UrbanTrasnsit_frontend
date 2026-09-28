import React from 'react';
import { PageHeader } from '../components/ui';
import { LineChart, BarChart2, Activity, Network } from 'lucide-react';

export default function AnalyticsLab() {
  return (
    <div className="p-6 max-w-7xl mx-auto text-white">
      <PageHeader 
        title="Visual Analytics Lab" 
        subtitle="Explore complex Data Science models, Spark MLlib outputs, and network visualizations" 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <LabCard 
          icon={<Network size={24} />}
          title="OD Matrix Heatmap"
          desc="Origin-Destination passenger flows visualized as a spatial adjacency matrix."
          imgSrc="/charts/step10_od_matrix.png"
        />
        <LabCard 
          icon={<BarChart2 size={24} />}
          title="K-Means Route Clustering"
          desc="Routes grouped into 4 distinct archetypes based on demand and performance."
          imgSrc="/charts/step21_route_clustering.png"
        />
        <LabCard 
          icon={<LineChart size={24} />}
          title="Chronological Demand Forecast"
          desc="XGBoost demand predictions vs actual holdout data across all routes."
          imgSrc="/charts/step24_forecast_chart.png"
        />
        <LabCard 
          icon={<Activity size={24} />}
          title="Delay Prediction Probability"
          desc="Logistic regression probability boundaries for predicted delay risk."
          imgSrc="/charts/delay_model_metrics.png"
        />
      </div>
    </div>
  );
}

function LabCard({ icon, title, desc, imgSrc }) {
  return (
    <div className="bg-[#1F1F1F] rounded-lg border border-[#2A2A2A] overflow-hidden flex flex-col hover:border-[#E31E24] transition">
      <div className="p-4 border-b border-[#2A2A2A] flex items-center gap-3">
        <div className="text-[#E31E24]">{icon}</div>
        <div>
          <h3 className="font-bold text-md">{title}</h3>
          <p className="text-xs text-gray-400">{desc}</p>
        </div>
      </div>
      <div className="flex-1 bg-black/50 p-2 flex items-center justify-center min-h-[250px]">
        {imgSrc ? (
          <img src={imgSrc} alt={title} className="max-h-64 object-contain opacity-80 hover:opacity-100 transition" 
               onError={(e) => {e.target.style.display='none'; e.target.nextSibling.style.display='block';}} />
        ) : null}
        <div style={{display: imgSrc ? 'none' : 'block'}} className="text-gray-600 text-sm italic">
          Chart generating...
        </div>
      </div>
    </div>
  );
}
