import axios from 'axios';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

const TOKEN_KEY = 'transit_token';
const USER_KEY = 'transit_user';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    // A rejected token must not leave a half-authenticated UI behind.
    if (error?.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    return Promise.reject(error);
  },
);

export function getAuthHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const login = (username, password) => apiClient.post('/auth/login', { username, password });
export const getCurrentUser = () => apiClient.get('/auth/me');

// ---------------------------------------------------------------------------
// Executive dashboard / sync
// ---------------------------------------------------------------------------
export const getSyncStatus = () => apiClient.get('/dashboard/sync-status');
export const getDashboardSummary = () => apiClient.get('/dashboard/summary');
export const getTopRoutes = (limit = 10) => apiClient.get(`/dashboard/top-routes?limit=${limit}`);
export const getDashboardDelays = () => apiClient.get('/dashboard/delays');
export const getDashboardOccupancy = () => apiClient.get('/dashboard/occupancy');
export const getDashboardForecast = () => apiClient.get('/dashboard/forecast');
export const getHealth = () => apiClient.get('/health');

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
export const getRoutesList = () => apiClient.get('/routes/list');
export const getRoutes = () => apiClient.get('/routes');
export const getRouteById = (id) => apiClient.get(`/routes/${encodeURIComponent(id)}`);

// ---------------------------------------------------------------------------
// Passenger flow
// ---------------------------------------------------------------------------
export const getPassengerFlow = () => apiClient.get('/dashboard/passenger-flow');

// ---------------------------------------------------------------------------
// Delays
// ---------------------------------------------------------------------------
export const getDelays = () => apiClient.get('/delays/by-cause');
export const getDelaysSummary = () => apiClient.get('/delays/summary');
export const getDelayedRoutes = () => apiClient.get('/delays/routes');

// ---------------------------------------------------------------------------
// Occupancy / forecast
// ---------------------------------------------------------------------------
export const getOccupancy = () => apiClient.get('/dashboard/occupancy');
export const getOccupancyHourly = (routeId = null) =>
  apiClient.get(`/occupancy/hourly${routeId ? `?route_id=${encodeURIComponent(routeId)}` : ''}`);
export const getOvercrowdedTrips = (routeId = null) =>
  apiClient.get(`/occupancy/overcrowded${routeId ? `?route_id=${encodeURIComponent(routeId)}` : ''}`);
export const getForecast = () => apiClient.get('/dashboard/forecast');
export const getForecastDemand = (routeId = null) =>
  apiClient.get(`/forecast/demand${routeId ? `?route_id=${encodeURIComponent(routeId)}` : ''}`);

// ---------------------------------------------------------------------------
// Route performance
// ---------------------------------------------------------------------------
export const getRoutePerformance = () => apiClient.get('/dashboard/route-performance');

// ---------------------------------------------------------------------------
// Map
// ---------------------------------------------------------------------------
export const getRoutesGeo = () => apiClient.get('/map/routes-geo');
export const getDelayHotspots = () => apiClient.get('/map/delay-hotspots');
export const getRouteGeoDashboard = () => apiClient.get('/dashboard/route-geo');

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------
export const getRecommendations = (routeId = null) =>
  apiClient.get(`/recommendations${routeId ? `?route_id=${encodeURIComponent(routeId)}` : ''}`);
export const getModelComparison = () => apiClient.get('/models/comparison');
export const getModelRegistry = () => apiClient.get('/models/registry');

// ---------------------------------------------------------------------------
// What-if
// ---------------------------------------------------------------------------
export const simulateWhatIf = (payload) => apiClient.post('/whatif/simulate', payload);
export const getWhatIfScenarios = () => apiClient.get('/whatif/scenarios');

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export const getNotifications = (unreadOnly = false) =>
  apiClient.get(`/notifications?unread_only=${unreadOnly}`);

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export const getSparkJobs = () => apiClient.get('/admin/spark-jobs');
export const getUsers = () => apiClient.get('/admin/users');
export const getAuditTrail = () => apiClient.get('/admin/audit-trail');

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
export const exportReport = (type, format = 'csv') =>
  apiClient.get(`/reports/export`, {
    params: { type, format },
    responseType: 'blob',
  });

export default apiClient;
