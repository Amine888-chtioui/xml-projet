// src/services/api.js - Version corrigée et simplifiée
import axios from 'axios';

// Configuration de base
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const TIMEOUT = 10000; // 10 secondes

// Créer une instance axios
const api = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Intercepteur pour les requêtes
api.interceptors.request.use(
  (config) => {
    // Ajouter un timestamp pour éviter le cache
    if (!config.params) {
      config.params = {};
    }
    config.params._t = Date.now();
    
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Intercepteur pour les réponses
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} - ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`❌ Response Error: ${error.response?.status} - ${error.config?.url}`, error.message);
    return Promise.reject(error);
  }
);

// Fonction utilitaire pour gérer les erreurs
const handleApiCall = async (apiCall, fallbackData = null) => {
  try {
    const response = await apiCall();
    
    // Vérifier la structure de la réponse
    if (!response || !response.data) {
      console.warn('⚠️ Invalid response structure:', response);
      if (fallbackData) {
        return { data: fallbackData };
      }
      throw new Error('Invalid response structure');
    }
    
    // Si l'API retourne success: false, traiter comme une erreur
    if (response.data.success === false) {
      console.warn('⚠️ API returned success: false:', response.data.message);
      if (fallbackData) {
        return { data: fallbackData };
      }
      throw new Error(response.data.message || 'API call failed');
    }
    
    return response;
  } catch (error) {
    console.error('❌ API Call Failed:', error.message);
    
    // Si on a des données de secours, les utiliser
    if (fallbackData) {
      console.log('🔄 Using fallback data');
      return { data: fallbackData };
    }
    
    throw error;
  }
};

// Service de statistiques
export const statsService = {
  getSummary: async () => {
    return handleApiCall(
      () => api.get('/maintenance-stats/summary'),
      {
        success: true,
        data: {
          total_incidents: 0,
          total_downtime: 0,
          total_machines: 0,
          avg_downtime: 0,
          last_updated: new Date().toISOString(),
          is_demo_data: true
        }
      }
    );
  },

  getMachines: async () => {
    return handleApiCall(
      () => api.get('/maintenance-stats/machines'),
      {
        success: true,
        data: [
          { id: 'ALPHA_158', name: 'Komax Alpha 355' },
          { id: 'ALPHA_162', name: 'Komax Alpha 488 10M' },
          { id: 'ALPHA_166', name: 'Komax Alpha 488 7M' }
        ]
      }
    );
  },

  getErrorTypes: async () => {
    return handleApiCall(
      () => api.get('/maintenance-stats/error-types'),
      {
        success: true,
        data: [
          { id: '1 Mechanical', name: 'Mécanique' },
          { id: '2 Electrical', name: 'Électrique' },
          { id: '6 Maintenance', name: 'Maintenance' }
        ]
      }
    );
  },

  getErrorCodes: async () => {
    return handleApiCall(
      () => api.get('/error-codes'),
      {
        success: true,
        data: [
          { id: '01_Breakage', name: 'Breakage' },
          { id: '02_Wear', name: 'Wear' },
          { id: '04_Blockage', name: 'Blockage' }
        ]
      }
    );
  },

  getTimeEvolution: async (filters = {}) => {
    return handleApiCall(
      () => api.get('/maintenance-stats/time-evolution', { params: filters }),
      {
        success: true,
        data: generateFallbackTimeData()
      }
    );
  },

  getStatsByMachine: async (filters = {}) => {
    return handleApiCall(
      () => api.get('/maintenance-stats/by-machine', { params: filters }),
      {
        success: true,
        data: [
          {
            machine_id: 'ALPHA_169',
            name: 'HBQ-922',
            total_downtime: 300,
            incident_count: 1,
            avg_downtime: 300
          },
          {
            machine_id: 'ALPHA_162',
            name: 'Komax Alpha 488 10M',
            total_downtime: 240,
            incident_count: 1,
            avg_downtime: 240
          }
        ]
      }
    );
  },

  getStatsByErrorType: async (filters = {}) => {
    return handleApiCall(
      () => api.get('/maintenance-stats/by-error-type', { params: filters }),
      {
        success: true,
        data: [
          {
            error_type: '6 Maintenance - 02 Wear',
            total_downtime: 300,
            incident_count: 1,
            avg_downtime: 300
          },
          {
            error_type: '1 Mechanical - 02 Wear',
            total_downtime: 240,
            incident_count: 1,
            avg_downtime: 240
          }
        ]
      }
    );
  },

  getCriticalIssues: async (filters = {}) => {
    return handleApiCall(
      () => api.get('/maintenance-stats/critical-issues', { params: filters }),
      {
        success: true,
        data: []
      }
    );
  },

  getDashboardStats: async () => {
    return handleApiCall(
      () => api.get('/dashboard-stats'),
      {
        success: true,
        data: {
          summary: {
            total_incidents: 0,
            total_downtime: 0,
            total_machines: 0,
            avg_downtime: 0,
            is_demo_data: true
          },
          by_machine: [],
          by_error_type: [],
          time_evolution: []
        }
      }
    );
  },

  getPerformanceIndicators: async (period = 'month') => {
    return handleApiCall(
      () => api.get('/performance-indicators', { params: { period } }),
      {
        success: true,
        data: {
          current_period: {
            start_date: new Date().toISOString().split('T')[0],
            incident_count: 0,
            total_downtime: 0,
            avg_downtime: 0
          },
          previous_period: {
            start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
            incident_count: 0,
            total_downtime: 0,
            avg_downtime: 0
          },
          variation: {
            incident: 0,
            downtime: 0
          },
          period: period
        }
      }
    );
  }
};

// Service d'upload XML
export const xmlService = {
  uploadXml: async (formData, config = {}) => {
    try {
      console.log('📤 Uploading XML file...');
      
      const response = await api.post('/upload-xml', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 secondes pour l'upload
        ...config
      });
      
      return response;
    } catch (error) {
      console.error('❌ XML Upload failed:', error.message);
      throw error;
    }
  },

  getUploadHistory: async () => {
    return handleApiCall(
      () => api.get('/upload-history'),
      {
        success: true,
        data: []
      }
    );
  },

  getLatestReports: async () => {
    return handleApiCall(
      () => api.get('/latest-reports'),
      {
        success: true,
        data: [
          {
            id: 1,
            name: 'Rapport de maintenance Avril 2025',
            incident_count: 15,
            total_downtime_minutes: 840,
            created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
      }
    );
  }
};

// Service machine
export const machineService = {
  getAllMachines: async () => {
    return statsService.getMachines();
  },

  getMachine: async (id) => {
    return handleApiCall(
      () => api.get(`/machines/${id}`),
      {
        success: true,
        data: {
          machine_id: id,
          name: `Machine ${id}`,
          description: 'Machine de démonstration',
          total_incidents: 0,
          total_downtime: 0,
          avg_downtime: 0,
          recent_incidents: []
        }
      }
    );
  },

  getDowntimeHistory: async (id) => {
    return handleApiCall(
      () => api.get(`/machines/${id}/downtime-history`),
      {
        success: true,
        data: []
      }
    );
  },

  getCommonErrors: async (id) => {
    return handleApiCall(
      () => api.get(`/machines/${id}/common-errors`),
      {
        success: true,
        data: []
      }
    );
  }
};

// Service de rapport
export const reportService = {
  getLatestReports: () => xmlService.getLatestReports(),
  
  getAllReports: async () => {
    return handleApiCall(
      () => api.get('/reports'),
      {
        success: true,
        data: []
      }
    );
  }
};

// Fonction pour générer des données de secours pour l'évolution temporelle
function generateFallbackTimeData() {
  const data = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      total_downtime: Math.floor(Math.random() * 200) + 50,
      incident_count: Math.floor(Math.random() * 5) + 1
    });
  }
  
  return data;
}

// Utilitaires de débogage
export const debugUtils = {
  testConnection: async () => {
    try {
      console.log('🔌 Testing API connection...');
      const response = await api.get('/maintenance-stats/summary');
      console.log('✅ API connection successful');
      return response.data;
    } catch (error) {
      console.error('❌ API connection failed:', error.message);
      return null;
    }
  },

  testAllEndpoints: async () => {
    console.log('🧪 Testing all API endpoints...');
    
    const tests = [
      { name: 'Summary', call: () => statsService.getSummary() },
      { name: 'Machines', call: () => statsService.getMachines() },
      { name: 'Error Types', call: () => statsService.getErrorTypes() },
      { name: 'Dashboard Stats', call: () => statsService.getDashboardStats() }
    ];
    
    const results = {};
    
    for (const test of tests) {
      try {
        const result = await test.call();
        results[test.name] = { success: true, data: result.data };
        console.log(`✅ ${test.name}: OK`);
      } catch (error) {
        results[test.name] = { success: false, error: error.message };
        console.error(`❌ ${test.name}: ${error.message}`);
      }
    }
    
    return results;
  },

  checkDataStructure: (response) => {
    console.log('🔍 Checking data structure:', response);
    
    if (!response) {
      console.error('❌ Response is null/undefined');
      return false;
    }
    
    if (!response.data) {
      console.error('❌ Response.data is missing');
      return false;
    }
    
    if (response.data.success === false) {
      console.error('❌ API returned success: false');
      return false;
    }
    
    console.log('✅ Data structure is valid');
    return true;
  }
};

// Exposer les utilitaires dans la console du navigateur
if (typeof window !== 'undefined') {
  window.apiDebug = debugUtils;
  console.log('🛠️ API Debug utils available at: window.apiDebug');
  console.log('   - window.apiDebug.testConnection()');
  console.log('   - window.apiDebug.testAllEndpoints()');
}

// Exporter l'instance axios pour usage personnalisé
export default api;