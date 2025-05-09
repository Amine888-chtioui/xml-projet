// src/services/api.js - Version finale corrigée
import axios from 'axios';

// Configuration du délai entre les requêtes pour éviter les erreurs 429 (Too Many Requests)
const API_REQUEST_DELAY = 800; // ms

// Fonction utilitaire pour retarder les requêtes
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Création d'une instance Axios avec une configuration personnalisée
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  timeout: 15000, // Timeout plus long pour les appels lents
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Sémaphore pour limiter le nombre de requêtes simultanées
let pendingRequests = 0;
const MAX_CONCURRENT_REQUESTS = 2;
const requestQueue = [];
let isProcessingQueue = false;

// Fonction pour traiter la queue de requêtes
const processQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (requestQueue.length > 0 && pendingRequests < MAX_CONCURRENT_REQUESTS) {
    pendingRequests++;
    const { config, resolve, reject } = requestQueue.shift();
    
    try {
      // Effectuer la requête avec axios directement, sans passer par l'instance api
      // pour éviter une boucle infinie avec les intercepteurs
      const response = await axios(config);
      resolve(response);
    } catch (error) {
      reject(error);
    } finally {
      pendingRequests--;
      // Pause entre les requêtes pour éviter les erreurs 429
      await delay(API_REQUEST_DELAY);
    }
  }
  
  isProcessingQueue = false;
  
  // S'il reste des requêtes et que nous sommes sous la limite, relancer le traitement
  if (requestQueue.length > 0 && pendingRequests < MAX_CONCURRENT_REQUESTS) {
    processQueue();
  }
};

// Intercepteur pour ajouter les requêtes à la queue
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Retourner une promesse qui sera résolue une fois la requête traitée par la queue
    return new Promise((resolve, reject) => {
      // Vérifier si la requête est déjà dans la queue (pour éviter les doublons)
      const isDuplicate = requestQueue.some(item => 
        item.config.url === config.url && 
        JSON.stringify(item.config.params) === JSON.stringify(config.params)
      );
      
      if (!isDuplicate) {
        requestQueue.push({
          config,
          resolve,
          reject
        });
        
        // Démarrer le traitement de la queue si ce n'est pas déjà fait
        processQueue();
      } else {
        // Si c'est un doublon, rejeter la requête pour éviter les requêtes inutiles
        reject(new Error('Requête dupliquée ignorée'));
      }
    });
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
    console.error('API Error:', error);
    
    // Si l'erreur est une 404, on peut logger plus de détails
    if (error.response && error.response.status === 404) {
      console.error('API 404 Error for URL:', error.config?.url);
    }
    
    // Gérer les erreurs 429 (Too Many Requests)
    if (error.response && error.response.status === 429) {
      console.error('API 429 Error: Too Many Requests. Consider reducing request frequency.');
    }
    
    // Gérer les erreurs 401 (non autorisé)
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

// Fonction helper pour exécuter des appels API avec des retry en cas d'échec
const apiWithRetry = async (apiCall, maxRetries = 3) => {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      return await apiCall();
    } catch (error) {
      // Ignorer les erreurs de requêtes dupliquées
      if (error.message === 'Requête dupliquée ignorée') {
        console.log('Requête dupliquée ignorée');
        throw error; // Ne pas retenter les requêtes dupliquées
      }
      
      retries++;
      console.log(`Attempt ${retries}/${maxRetries} failed.`);
      
      if (retries === maxRetries) {
        throw error;
      }
      
      // Temps d'attente exponentiel entre les tentatives
      await delay(Math.pow(2, retries) * 1000);
    }
  }
};

// Fonction utilitaire pour créer un cache simple
const createCache = () => {
  const cache = {};
  const CACHE_TTL = 60000; // 60 secondes
  
  return {
    get: (key) => {
      const item = cache[key];
      if (!item) return null;
      
      // Vérifier si le cache est expiré
      if (Date.now() > item.expiry) {
        delete cache[key];
        return null;
      }
      
      return item.value;
    },
    set: (key, value) => {
      cache[key] = {
        value,
        expiry: Date.now() + CACHE_TTL
      };
    }
  };
};

// Créer un cache pour les appels API
const apiCache = createCache();

// Fonction helper pour les appels API avec cache
const apiWithCache = async (cacheKey, apiCall) => {
  // Vérifier si la réponse est dans le cache
  const cachedResponse = apiCache.get(cacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Sinon, faire l'appel API et mettre en cache le résultat
  const response = await apiWithRetry(apiCall);
  apiCache.set(cacheKey, response);
  return response;
};

// Méthodes d'API spécifiques avec cache et retry
export const authService = {
  login: (credentials) => apiWithRetry(() => api.post('/login', credentials)),
  register: (userData) => apiWithRetry(() => api.post('/register', userData)),
  logout: () => apiWithRetry(() => api.post('/logout')),
  getUser: () => apiWithRetry(() => api.get('/user')),
};

export const xmlService = {
  uploadXml: (formData, config = {}) => {
    return apiWithRetry(() => api.post('/upload-xml', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...config
    }));
  },
  getUploadHistory: () => apiWithCache('upload-history', () => api.get('/upload-history')),
  getLatestReports: () => apiWithCache('latest-reports', () => api.get('/latest-reports')),
};

export const statsService = {
  getStats: (filters = {}) => {
    const cacheKey = `stats-${JSON.stringify(filters)}`;
    return apiWithCache(cacheKey, () => api.get('/maintenance-stats', { params: filters }));
  },
  getSummary: () => apiWithCache('summary', () => api.get('/maintenance-stats/summary')),
  getMachines: () => apiWithCache('machines', () => api.get('/maintenance-stats/machines')),
  getErrorTypes: () => apiWithCache('error-types', () => api.get('/maintenance-stats/error-types')),
  getTimeEvolution: (filters = {}) => {
    const cacheKey = `time-evolution-${JSON.stringify(filters)}`;
    return apiWithCache(cacheKey, () => api.get('/maintenance-stats/time-evolution', { params: filters }));
  },
  getStatsByMachine: (filters = {}) => {
    const cacheKey = `stats-by-machine-${JSON.stringify(filters)}`;
    return apiWithCache(cacheKey, () => api.get('/maintenance-stats/by-machine', { params: filters }));
  },
  getStatsByErrorType: (filters = {}) => {
    const cacheKey = `stats-by-error-type-${JSON.stringify(filters)}`;
    return apiWithCache(cacheKey, () => api.get('/maintenance-stats/by-error-type', { params: filters }));
  },
  getCriticalIssues: (filters = {}) => {
    const cacheKey = `critical-issues-${JSON.stringify(filters)}`;
    return apiWithCache(cacheKey, () => api.get('/maintenance-stats/critical-issues', { params: filters }));
  },
  getDashboardStats: () => apiWithCache('dashboard-stats', () => api.get('/dashboard-stats')),
  getPerformanceIndicators: (period = 'month') => {
    const cacheKey = `performance-indicators-${period}`;
    return apiWithCache(cacheKey, () => api.get('/performance-indicators', { params: { period } }));
  },
};

export const machineService = {
  getAllMachines: () => apiWithCache('all-machines', () => api.get('/machines')),
  getMachine: (id) => apiWithCache(`machine-${id}`, () => api.get(`/machines/${id}`)),
  createMachine: (data) => apiWithRetry(() => api.post('/machines', data)),
  updateMachine: (id, data) => apiWithRetry(() => api.put(`/machines/${id}`, data)),
  deleteMachine: (id) => apiWithRetry(() => api.delete(`/machines/${id}`)),
  getDowntimeHistory: (id) => apiWithCache(`downtime-history-${id}`, () => api.get(`/machines/${id}/downtime-history`)),
  getCommonErrors: (id) => apiWithCache(`common-errors-${id}`, () => api.get(`/machines/${id}/common-errors`)),
};

export const errorCodeService = {
  getAllErrorCodes: () => apiWithCache('all-error-codes', () => api.get('/error-codes')),
  getErrorCode: (id) => apiWithCache(`error-code-${id}`, () => api.get(`/error-codes/${id}`)),
  createErrorCode: (data) => apiWithRetry(() => api.post('/error-codes', data)),
  updateErrorCode: (id, data) => apiWithRetry(() => api.put(`/error-codes/${id}`, data)),
  deleteErrorCode: (id) => apiWithRetry(() => api.delete(`/error-codes/${id}`)),
  getAffectedMachines: (code) => apiWithCache(`affected-machines-${code}`, () => api.get(`/error-codes/${code}/affected-machines`)),
};

export const reportService = {
  getAllReports: () => apiWithCache('all-reports', () => api.get('/reports')),
  getReport: (id) => apiWithCache(`report-${id}`, () => api.get(`/reports/${id}`)),
  getLatestReports: () => apiWithCache('latest-reports', () => api.get('/latest-reports')),
  getReportDetails: (id) => apiWithCache(`report-details-${id}`, () => api.get(`/reports/${id}/details`)),
};

export const exportService = {
  exportCsv: (filters = {}) => apiWithRetry(() => api.get('/export/csv', { params: filters, responseType: 'blob' })),
  exportExcel: (filters = {}) => apiWithRetry(() => api.get('/export/excel', { params: filters, responseType: 'blob' })),
  exportPdf: (filters = {}) => apiWithRetry(() => api.get('/export/pdf', { params: filters, responseType: 'blob' })),
};

// Exporter l'instance Axios par défaut pour une utilisation personnalisée
export default api;