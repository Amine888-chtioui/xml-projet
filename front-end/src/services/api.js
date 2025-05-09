// src/services/api.js - Fixed version
import axios from 'axios';

// Configuration for request timing
const API_REQUEST_DELAY = 1000; // Increased to 1 second to avoid rate limiting
const MAX_RETRIES = 3;
const CACHE_TTL = 300000; // 5 minutes

// Utility function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  timeout: 30000, // Increased timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Simple request deduplication system
const pendingRequests = new Map();

// Create a request key based on URL and params
const getRequestKey = (config) => {
  const { url, params, method = 'get' } = config;
  return `${method}:${url}:${JSON.stringify(params || {})}`;
};

// Utility to create a simple memory cache
const createCache = () => {
  const cache = new Map();
  
  return {
    get: (key) => {
      const item = cache.get(key);
      if (!item) return null;
      
      // Check if cache is expired
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

// Create cache for API responses
const apiCache = createCache();

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Create a unique key for this request
    const requestKey = getRequestKey(config);
    
    // If there's already a pending request with the same key, reject this one
    if (pendingRequests.has(requestKey)) {
      return Promise.reject(new Error('Request already in progress'));
    }
    
    // Add this request to pending requests
    pendingRequests.set(requestKey, true);
    
    // Override the default transformRequest to ensure method is set
    if (!config.method) {
      config.method = 'get';
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Clear this request from pending requests
    const requestKey = getRequestKey(response.config);
    pendingRequests.delete(requestKey);
    
    return response;
  },
  (error) => {
    // Clear this request from pending requests
    if (error.config) {
      const requestKey = getRequestKey(error.config);
      pendingRequests.delete(requestKey);
    }
    
    // Handle specific error cases
    if (error.response) {
      // Handle 401 Unauthorized
      if (error.response.status === 401) {
        localStorage.removeItem('auth_token');
      }
      
      // Log rate limiting issues but don't show these to the user
      if (error.response.status === 429) {
        console.warn('API rate limit reached. Consider reducing request frequency.');
      }
    }
    
    return Promise.reject(error);
  }
);

// API helper function with retry logic
const apiWithRetry = async (apiCallFn, maxRetries = MAX_RETRIES) => {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      return await apiCallFn();
    } catch (error) {
      // Don't retry if we get a "request already in progress" error
      if (error.message === 'Request already in progress') {
        throw error;
      }
      
      // Don't retry for certain status codes
      if (error.response && [401, 403, 404].includes(error.response.status)) {
        throw error;
      }
      
      retries++;
      
      if (retries >= maxRetries) {
        throw error;
      }
      
      // Wait before retrying with exponential backoff
      const delayTime = Math.min(1000 * Math.pow(2, retries), 10000);
      await delay(delayTime);
    }
  }
};

// API helper function with caching
const apiWithCache = async (cacheKey, apiCallFn, ttl = CACHE_TTL) => {
  // Check cache first
  const cachedResponse = apiCache.get(cacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // If not in cache, make the API call
  const response = await apiWithRetry(apiCallFn);
  
  // Store in cache
  apiCache.set(cacheKey, response, ttl);
  
  return response;
};

// Clear all cache
const clearCache = () => {
  apiCache.clear();
};

// Authentication service
export const authService = {
  login: (credentials) => apiWithRetry(() => api.post('/login', credentials)),
  register: (userData) => apiWithRetry(() => api.post('/register', userData)),
  logout: () => {
    localStorage.removeItem('auth_token');
    return apiWithRetry(() => api.post('/logout'));
  },
  getUser: () => apiWithRetry(() => api.get('/user')),
};

// XML upload service
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

// Statistics service
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

// Machine service
export const machineService = {
  getAllMachines: () => apiWithCache('all-machines', () => api.get('/machines')),
  getMachine: (id) => apiWithCache(`machine-${id}`, () => api.get(`/machines/${id}`)),
  createMachine: (data) => apiWithRetry(() => api.post('/machines', data)),
  updateMachine: (id, data) => apiWithRetry(() => api.put(`/machines/${id}`, data)),
  deleteMachine: (id) => apiWithRetry(() => api.delete(`/machines/${id}`)),
  getDowntimeHistory: (id) => apiWithCache(`downtime-history-${id}`, () => api.get(`/machines/${id}/downtime-history`)),
  getCommonErrors: (id) => apiWithCache(`common-errors-${id}`, () => api.get(`/machines/${id}/common-errors`)),
};

// Error code service
export const errorCodeService = {
  getAllErrorCodes: () => apiWithCache('all-error-codes', () => api.get('/error-codes')),
  getErrorCode: (id) => apiWithCache(`error-code-${id}`, () => api.get(`/error-codes/${id}`)),
  createErrorCode: (data) => apiWithRetry(() => api.post('/error-codes', data)),
  updateErrorCode: (id, data) => apiWithRetry(() => api.put(`/error-codes/${id}`, data)),
  deleteErrorCode: (id) => apiWithRetry(() => api.delete(`/error-codes/${id}`)),
  getAffectedMachines: (code) => apiWithCache(`affected-machines-${code}`, () => api.get(`/error-codes/${code}/affected-machines`)),
};

// Report service
export const reportService = {
  getAllReports: () => apiWithCache('all-reports', () => api.get('/reports')),
  getReport: (id) => apiWithCache(`report-${id}`, () => api.get(`/reports/${id}`)),
  getLatestReports: () => apiWithCache('latest-reports', () => api.get('/latest-reports')),
  getReportDetails: (id) => apiWithCache(`report-details-${id}`, () => api.get(`/reports/${id}/details`)),
};

// Export service
export const exportService = {
  exportCsv: (filters = {}) => apiWithRetry(() => api.get('/export/csv', { params: filters, responseType: 'blob' })),
  exportExcel: (filters = {}) => apiWithRetry(() => api.get('/export/excel', { params: filters, responseType: 'blob' })),
  exportPdf: (filters = {}) => apiWithRetry(() => api.get('/export/pdf', { params: filters, responseType: 'blob' })),
};

// Export cache utilities
export const cacheUtils = {
  clearAll: clearCache,
  clearStats: () => {
    // Clear all stats-related cache entries
    clearCache();
  }
};

// Export the Axios instance for custom use
export default api;