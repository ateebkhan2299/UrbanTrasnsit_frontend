import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Map, BarChart3, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function HomeLanding() {
  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-[#1F1F1F] to-[#141414]">
        <h1 className="text-5xl font-black mb-4 tracking-wider">
          URBAN<span className="text-[#E31E24]">TRANSIT</span> IQ
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mb-8">
          A Big Data & Data Science powered analytics platform for public transport operations. 
          Identify peak demand, detect overcrowded routes, and predict delays using Apache Spark and Machine Learning.
        </p>
        <Link 
          to="/overview" 
          className="px-8 py-3 bg-[#E31E24] text-white font-bold rounded hover:bg-red-700 transition shadow-[0_0_15px_rgba(227,30,36,0.5)]"
        >
          ENTER DASHBOARD
        </Link>
      </div>

      {/* Features Grid */}
      <div className="p-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        <FeatureCard 
          icon={<Activity size={32} className="text-[#E31E24]" />}
          title="Passenger Flow Analysis"
          desc="Analyze boarding, alighting, and Origin-Destination matrices to understand travel demand."
        />
        <FeatureCard 
          icon={<Clock size={32} className="text-[#E31E24]" />}
          title="Delay Prediction"
          desc="Forecast delays and identify schedule adherence issues using historical Big Data."
        />
        <FeatureCard 
          icon={<AlertTriangle size={32} className="text-[#E31E24]" />}
          title="Crowding & Occupancy"
          desc="Detect overcrowded routes in real-time and predict future capacity bottlenecks."
        />
        <FeatureCard 
          icon={<Map size={32} className="text-[#E31E24]" />}
          title="Route Clustering"
          desc="Group routes using unsupervised K-Means to identify performance archetypes."
        />
        <FeatureCard 
          icon={<BarChart3 size={32} className="text-[#E31E24]" />}
          title="Dual ML Pipelines"
          desc="Cross-validate predictions between Apache Spark MLlib and Python Data Science models."
        />
        <FeatureCard 
          icon={<ShieldCheck size={32} className="text-[#E31E24]" />}
          title="Actionable Insights"
          desc="Evidence-based recommendations for schedule optimization and capacity management."
        />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="bg-[#1F1F1F] p-6 rounded-lg border border-[#2A2A2A] hover:border-[#E31E24] transition">
      <div className="mb-4 bg-black/30 w-16 h-16 rounded-full flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{desc}</p>
    </div>
  );
}
