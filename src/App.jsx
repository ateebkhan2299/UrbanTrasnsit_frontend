import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui';
import Shell from './components/layout/Shell';

// Auth
import Login from './pages/Login';
import HomeLanding from './pages/HomeLanding';

// Core Dashboards
import Overview          from './pages/Overview';
import PassengerFlow     from './pages/PassengerFlow';
import RoutePerformance  from './pages/RoutePerformance';
import RoutePerformanceDashboard from './pages/RoutePerformanceDashboard';
import Delays            from './pages/Delays';
import Forecast          from './pages/Forecast';

// Tools & Management
import Recommendations   from './pages/Recommendations';
import WhatIf            from './pages/WhatIf';
import ModelComparison   from './pages/ModelComparison';
import ReportsExport     from './pages/ReportsExport';
import RouteMapVisualization from './pages/RouteMapVisualization';
import RouteManagement   from './pages/RouteManagement';
import StopManagement    from './pages/StopManagement';
import TripManagement    from './pages/TripManagement';
import VehicleManagement from './pages/VehicleManagement';
import AnalyticsLab      from './pages/AnalyticsLab';
import TicketManagement  from './pages/TicketManagement';

// Admin & System
import Admin             from './pages/Admin';
import SparkJobs         from './pages/SparkJobs';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/home" element={<HomeLanding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Shell />}>
            {/* Landing page link or default overview */}
            <Route index element={<Navigate to="/overview" replace />} />

            {/* ── Executive Overview ── */}
            <Route path="overview"            element={<Overview />} />

            {/* ── Passenger Flow ── */}
            <Route path="passenger-flow"      element={<PassengerFlow />} />

            {/* ── Route Performance ── */}
            <Route path="route-performance"   element={<RoutePerformance />} />
            <Route path="route-performance-detail" element={<RoutePerformanceDashboard />} />

            {/* ── Delay Analysis ── */}
            <Route path="delays"              element={<Delays />} />

            {/* ── Demand Forecast ── */}
            <Route path="forecast"            element={<Forecast />} />

            {/* ── Recommendations & What-If ── */}
            <Route path="recommendations"     element={<Recommendations />} />
            <Route path="whatif"              element={<WhatIf />} />

            {/* ── Model Comparison ── */}
            <Route path="model-comparison"    element={<ModelComparison />} />

            {/* ── Reports & Export ── */}
            <Route path="reports"             element={<ReportsExport />} />

            {/* ── Data Science Visual Analytics Lab ── */}
            <Route path="analytics-lab"       element={<AnalyticsLab />} />
            <Route path="ds-charts"           element={<AnalyticsLab />} />

            {/* ── Map ── */}
            <Route path="map"                 element={<RouteMapVisualization />} />

            {/* ── Management ── */}
            <Route path="route-management"    element={<RouteManagement />} />
            <Route path="stop-management"     element={<StopManagement />} />
            <Route path="trip-management"     element={<TripManagement />} />
            <Route path="vehicle-management"  element={<VehicleManagement />} />
            <Route path="ticket-management"  element={<TicketManagement />} />

            {/* ── Admin & System ── */}
            <Route path="admin"               element={<Admin />} />
            <Route path="spark-jobs"          element={<SparkJobs />} />

            {/* Unknown URLs land safely on Overview */}
            <Route path="*"                   element={<Navigate to="/overview" replace />} />
          </Route>
        </Routes>
        </BrowserRouter>
      </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
