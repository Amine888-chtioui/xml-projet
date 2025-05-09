// src/services/api.js
import axios from 'axios';

// Création d'une instance Axios avec une configuration personnalisée
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Intercepteur pour ajouter le token d'authentification à chaque requête
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les réponses et les erreurs
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Gérer les erreurs 401 (non autorisé) - redirection vers la page de connexion
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      
      // Rediriger vers la page de connexion si vous utilisez un système de routes
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Méthodes d'API spécifiques
export const authService = {
  login: (credentials) => api.post('/login', credentials),
  register: (userData) => api.post('/register', userData),
  logout: () => api.post('/logout'),
  getUser: () => api.get('/user'),
};

export const xmlService = {
  uploadXml: (formData) => api.post('/upload-xml', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getUploadHistory: () => api.get('/upload-history'),
};

export const statsService = {
  getStats: (filters = {}) => api.get('/maintenance-stats', { params: filters }),
  getSummary: () => api.get('/maintenance-stats/summary'),
  getMachines: () => api.get('/maintenance-stats/machines'),
  getErrorTypes: () => api.get('/maintenance-stats/error-types'),
  getTimeEvolution: (filters = {}) => api.get('/maintenance-stats/time-evolution', { params: filters }),
  getStatsByMachine: (filters = {}) => api.get('/maintenance-stats/by-machine', { params: filters }),
  getStatsByErrorType: (filters = {}) => api.get('/maintenance-stats/by-error-type', { params: filters }),
  getCriticalIssues: (filters = {}) => api.get('/maintenance-stats/critical-issues', { params: filters }),
  getDashboardStats: () => api.get('/dashboard-stats'),
  getPerformanceIndicators: (period = 'month') => api.get('/performance-indicators', { params: { period } }),
};

export const machineService = {
  getAllMachines: () => api.get('/machines'),
  getMachine: (id) => api.get(`/machines/${id}`),
  createMachine: (data) => api.post('/machines', data),
  updateMachine: (id, data) => api.put(`/machines/${id}`, data),
  deleteMachine: (id) => api.delete(`/machines/${id}`),
  getDowntimeHistory: (id) => api.get(`/machines/${id}/downtime-history`),
  getCommonErrors: (id) => api.get(`/machines/${id}/common-errors`),
};

export const errorCodeService = {
  getAllErrorCodes: () => api.get('/error-codes'),
  getErrorCode: (id) => api.get(`/error-codes/${id}`),
  createErrorCode: (data) => api.post('/error-codes', data),
  updateErrorCode: (id, data) => api.put(`/error-codes/${id}`, data),
  deleteErrorCode: (id) => api.delete(`/error-codes/${id}`),
  getAffectedMachines: (code) => api.get(`/error-codes/${code}/affected-machines`),
};

export const reportService = {
  getAllReports: () => api.get('/reports'),
  getReport: (id) => api.get(`/reports/${id}`),
  getLatestReports: () => api.get('/latest-reports'),
  getReportDetails: (id) => api.get(`/reports/${id}/details`),
};

export const exportService = {
  exportCsv: (filters = {}) => api.get('/export/csv', { params: filters, responseType: 'blob' }),
  exportExcel: (filters = {}) => api.get('/export/excel', { params: filters, responseType: 'blob' }),
  exportPdf: (filters = {}) => api.get('/export/pdf', { params: filters, responseType: 'blob' }),
};

// Exporter l'instance Axios par défaut pour une utilisation personnalisée
export default api;