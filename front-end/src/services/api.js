// src/services/api.js - Version complètement corrigée
import axios from 'axios';

// Configuration pour les requêtes
const API_REQUEST_DELAY = 1000; // 1 seconde pour éviter la limitation de taux
const MAX_RETRIES = 3;
const CACHE_TTL = 300000; // 5 minutes

// Fonction utilitaire pour retarder l'exécution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Créer une instance axios
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  timeout: 30000, // Augmentation du timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Cache pour stocker les réponses
const createCache = () => {
  const cache = new Map();
  
  return {
    get: (key) => {
      const item = cache.get(key);
      if (!item) return null;
      
      if (Date.now() > item.expiry) {
        cache.delete(key);
        return null;
      }
      
      return item.value;
    },
    set: (key, value, ttl = CACHE_TTL) => {
      cache.set(key, {
        value,
        expiry: Date.now() + ttl
      });
    },
    clear: () => cache.clear()
  };
};

// Créer un cache pour les réponses API
const apiCache = createCache();

// Désactiver la déduplication pour corriger les erreurs "Requête déjà en cours"
// La nouvelle approche est d'utiliser un horodatage unique pour chaque requête

// Fonction d'aide API avec logique de réessai
const apiWithRetry = async (apiCallFn, maxRetries = MAX_RETRIES) => {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      return await apiCallFn();
    } catch (error) {
      // Ne pas réessayer pour certains codes d'état
      if (error.response && [401, 403, 404].includes(error.response.status)) {
        throw error;
      }
      
      retries++;
      
      if (retries >= maxRetries) {
        throw error;
      }
      
      // Attendre avant de réessayer avec un backoff exponentiel
      const delayTime = Math.min(1000 * Math.pow(2, retries), 10000);
      await delay(delayTime);
    }
  }
};

// Fonction d'aide API avec mise en cache
const apiWithCache = async (cacheKey, apiCallFn, ttl = CACHE_TTL) => {
  // Vérifier d'abord le cache
  const cachedResponse = apiCache.get(cacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Si pas dans le cache, faire l'appel API
  const response = await apiWithRetry(apiCallFn);
  
  // Stocker dans le cache
  if (response && response.data) {
    apiCache.set(cacheKey, response, ttl);
  }
  
  return response;
};

// Effacer tout le cache
const clearCache = () => {
  apiCache.clear();
};

// Ajouter un horodatage aux requêtes pour éviter la déduplication
const addTimestamp = (config) => {
  const newConfig = { ...config };
  
  if (!newConfig.params) {
    newConfig.params = {};
  }
  
  // Ajouter un timestamp unique pour éviter la mise en cache du navigateur
  newConfig.params._t = Date.now();
  
  return newConfig;
};

// Service d'authentification
export const authService = {
  login: (credentials) => apiWithRetry(() => api.post('/login', credentials)),
  register: (userData) => apiWithRetry(() => api.post('/register', userData)),
  logout: () => {
    localStorage.removeItem('auth_token');
    return apiWithRetry(() => api.post('/logout'));
  },
  getUser: () => apiWithRetry(() => api.get('/user')),
};

// Service d'upload XML
export const xmlService = {
  uploadXml: (formData, config = {}) => {
    return apiWithRetry(() => api.post('/upload-xml', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...config
    }));
  },
  getUploadHistory: () => apiWithCache(
    'upload-history', 
    () => api.get('/upload-history', addTimestamp({}))
  ),
  getLatestReports: () => apiWithCache(
    'latest-reports', 
    () => api.get('/latest-reports', addTimestamp({}))
  ),
};

// Service de statistiques
export const statsService = {
  getStats: (filters = {}) => {
    const cacheKey = `stats-${JSON.stringify(filters)}`;
    return apiWithCache(
      cacheKey,
      () => api.get('/maintenance-stats', addTimestamp({ params: filters }))
    );
  },
  getSummary: () => apiWithCache(
    'summary', 
    () => api.get('/maintenance-stats/summary', addTimestamp({}))
  ),
  getMachines: () => apiWithCache(
    'machines', 
    () => api.get('/maintenance-stats/machines', addTimestamp({}))
  ),
  getErrorTypes: () => apiWithCache(
    'error-types', 
    () => api.get('/maintenance-stats/error-types', addTimestamp({}))
  ),
  // Ajout de la fonction getErrorCodes manquante
  getErrorCodes: () => apiWithCache(
    'error-codes',
    () => {
      // Si l'API n'existe pas encore, retournez des données de démonstration
      const mockData = [
        { id: '01_Breakage', name: 'Breakage' },
        { id: '02_Wear', name: 'Wear' },
        { id: '04_Blockage', name: 'Blockage' },
        { id: '05_Loosening', name: 'Loosening' }
      ];
      return Promise.resolve({ data: mockData });
      // Ou utilisez cette ligne quand l'API existera :
      // return api.get('/maintenance-stats/error-codes', addTimestamp({}));
    }
  ),
  getTimeEvolution: (filters = {}) => {
    const cacheKey = `time-evolution-${JSON.stringify(filters)}`;
    return apiWithCache(
      cacheKey, 
      () => api.get('/maintenance-stats/time-evolution', addTimestamp({ params: filters }))
    );
  },
  getStatsByMachine: (filters = {}) => {
    const cacheKey = `stats-by-machine-${JSON.stringify(filters)}`;
    return apiWithCache(
      cacheKey, 
      () => api.get('/maintenance-stats/by-machine', addTimestamp({ params: filters }))
    );
  },
  getStatsByErrorType: (filters = {}) => {
    const cacheKey = `stats-by-error-type-${JSON.stringify(filters)}`;
    return apiWithCache(
      cacheKey, 
      () => api.get('/maintenance-stats/by-error-type', addTimestamp({ params: filters }))
    );
  },
  getCriticalIssues: (filters = {}) => {
    const cacheKey = `critical-issues-${JSON.stringify(filters)}`;
    return apiWithCache(
      cacheKey, 
      () => api.get('/maintenance-stats/critical-issues', addTimestamp({ params: filters }))
    );
  },
  getStatsByPeriod: (filters = {}) => {
    const cacheKey = `stats-by-period-${JSON.stringify(filters)}`;
    return apiWithCache(
      cacheKey, 
      () => api.get('/maintenance-stats/by-period', addTimestamp({ params: filters }))
    );
  },
  getDashboardStats: () => apiWithCache(
    'dashboard-stats', 
    () => api.get('/dashboard-stats', addTimestamp({}))
  ),
  getPerformanceIndicators: (period = 'month') => {
    const cacheKey = `performance-indicators-${period}`;
    return apiWithCache(
      cacheKey, 
      () => api.get('/performance-indicators', addTimestamp({ params: { period } }))
    );
  },
};

// Service machine
export const machineService = {
  getAllMachines: () => apiWithCache(
    'all-machines', 
    () => api.get('/machines', addTimestamp({}))
  ),
  getMachine: (id) => apiWithCache(
    `machine-${id}`, 
    () => api.get(`/machines/${id}`, addTimestamp({}))
  ),
  createMachine: (data) => apiWithRetry(
    () => api.post('/machines', data)
  ),
  updateMachine: (id, data) => apiWithRetry(
    () => api.put(`/machines/${id}`, data)
  ),
  deleteMachine: (id) => apiWithRetry(
    () => api.delete(`/machines/${id}`)
  ),
  getDowntimeHistory: (id) => apiWithCache(
    `downtime-history-${id}`, 
    () => api.get(`/machines/${id}/downtime-history`, addTimestamp({}))
  ),
  getCommonErrors: (id) => apiWithCache(
    `common-errors-${id}`, 
    () => api.get(`/machines/${id}/common-errors`, addTimestamp({}))
  ),
};

// Service de code d'erreur
export const errorCodeService = {
  getAllErrorCodes: () => apiWithCache(
    'all-error-codes', 
    () => api.get('/error-codes', addTimestamp({}))
  ),
  getErrorCode: (id) => apiWithCache(
    `error-code-${id}`, 
    () => api.get(`/error-codes/${id}`, addTimestamp({}))
  ),
  createErrorCode: (data) => apiWithRetry(
    () => api.post('/error-codes', data)
  ),
  updateErrorCode: (id, data) => apiWithRetry(
    () => api.put(`/error-codes/${id}`, data)
  ),
  deleteErrorCode: (id) => apiWithRetry(
    () => api.delete(`/error-codes/${id}`)
  ),
  getAffectedMachines: (code) => apiWithCache(
    `affected-machines-${code}`, 
    () => api.get(`/error-codes/${code}/affected-machines`, addTimestamp({}))
  ),
};

// Service de rapport
export const reportService = {
  getAllReports: () => apiWithCache(
    'all-reports', 
    () => api.get('/reports', addTimestamp({}))
  ),
  getReport: (id) => apiWithCache(
    `report-${id}`, 
    () => api.get(`/reports/${id}`, addTimestamp({}))
  ),
  getLatestReports: () => apiWithCache(
    'latest-reports', 
    () => api.get('/latest-reports', addTimestamp({}))
  ),
  getReportDetails: (id) => apiWithCache(
    `report-details-${id}`, 
    () => api.get(`/reports/${id}/details`, addTimestamp({}))
  ),
};

// Service d'exportation
export const exportService = {
  exportCsv: (filters = {}) => apiWithRetry(
    () => api.get('/export/csv', { params: filters, responseType: 'blob' })
  ),
  exportExcel: (filters = {}) => apiWithRetry(
    () => api.get('/export/excel', { params: filters, responseType: 'blob' })
  ),
  exportPdf: (filters = {}) => apiWithRetry(
    () => api.get('/export/pdf', { params: filters, responseType: 'blob' })
  ),
};

// Exporter les utilitaires de cache
export const cacheUtils = {
  clearAll: clearCache,
  clearStats: () => {
    clearCache();
  }
};

// Exporter l'instance Axios pour une utilisation personnalisée
export default api;