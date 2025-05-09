// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/UploadPage';
import AnalyticsPage from './pages/AnalyticsPage';

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Routes>
        </main>
        <ToastContainer position="bottom-right" />
      </div>
    </Router>
  );
}

export default App;

// src/components/Navbar.js
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path ? 'bg-blue-700' : '';
  };
  
  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <span className="text-xl font-bold">XML Maintenance Analyzer</span>
          </div>
          <div className="flex space-x-4">
            <Link to="/" className={`px-3 py-2 rounded hover:bg-blue-700 ${isActive('/')}`}>
              Dashboard
            </Link>
            <Link to="/upload" className={`px-3 py-2 rounded hover:bg-blue-700 ${isActive('/upload')}`}>
              Upload XML
            </Link>
            <Link to="/analytics" className={`px-3 py-2 rounded hover:bg-blue-700 ${isActive('/analytics')}`}>
              Analytics
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

// src/pages/UploadPage.js
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import UploadForm from '../components/UploadForm';
import LoadingSpinner from '../components/LoadingSpinner';

const UploadPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  const handleUpload = async (file) => {
    if (!file) {
      toast.error('Veuillez sélectionner un fichier XML');
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    setIsLoading(true);
    
    try {
      const response = await axios.post('/api/upload-xml', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        toast.success('Fichier XML traité avec succès');
        // Stocker l'ID du rapport ou des données dans sessionStorage pour y accéder
        sessionStorage.setItem('lastUploadData', JSON.stringify(response.data.data));
        // Rediriger vers la page d'analyse
        navigate('/analytics');
      } else {
        toast.error(response.data.message || 'Une erreur est survenue');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(
        error.response?.data?.message || 
        'Erreur lors de l\'upload du fichier'
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded shadow-md">
      <h1 className="text-2xl font-bold mb-6">Import de Fichier XML</h1>
      
      {isLoading ? (
        <div className="text-center py-12">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Traitement du fichier XML en cours...</p>
        </div>
      ) : (
        <div>
          <p className="mb-6 text-gray-600">
            Importez un fichier XML de rapport de maintenance pour analyser les arrêts non planifiés des machines.
          </p>
          
          <UploadForm onUpload={handleUpload} />
          
          <div className="mt-8 bg-blue-50 p-4 rounded">
            <h3 className="font-semibold text-blue-800">Format attendu :</h3>
            <p className="text-sm text-gray-600 mt-2">
              Le système attend un fichier XML contenant des données de maintenance avec des éléments tels que &lt;Machine&gt;, &lt;Downtime&gt;, 
              et des attributs comme ID, dates de début/fin, durée, codes d'erreur, etc.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPage;

// src/components/UploadForm.js
import React, { useState, useRef } from 'react';

const UploadForm = ({ onUpload }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'text/xml') {
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
      alert('Veuillez sélectionner un fichier XML valide');
      fileInputRef.current.value = '';
    }
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/xml') {
      setSelectedFile(file);
    } else {
      alert('Veuillez déposer un fichier XML valide');
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onUpload(selectedFile);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div 
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        
        <p className="mt-2 text-sm text-gray-600">
          {selectedFile ? selectedFile.name : 'Cliquez ou glissez-déposez un fichier XML ici'}
        </p>
        
        <input 
          type="file" 
          className="hidden" 
          accept=".xml" 
          onChange={handleFileChange}
          ref={fileInputRef}
        />
      </div>
      
      <div className="mt-6">
        <button 
          type="submit" 
          className={`w-full py-2 px-4 rounded font-medium ${
            selectedFile 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          disabled={!selectedFile}
        >
          Importer et Analyser
        </button>
      </div>
    </form>
  );
};

export default UploadForm;

// src/pages/AnalyticsPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

import DowntimeBarChart from '../components/charts/DowntimeBarChart';
import ErrorTypePieChart from '../components/charts/ErrorTypePieChart';
import TimelineChart from '../components/charts/TimelineChart';
import FiltersPanel from '../components/FiltersPanel';
import StatsCards from '../components/StatsCards';
import NoDataMessage from '../components/NoDataMessage';
import LoadingSpinner from '../components/LoadingSpinner';

const AnalyticsPage = () => {
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    machineId: '',
    errorType: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [machines, setMachines] = useState([]);
  const [errorTypes, setErrorTypes] = useState([]);
  
  // Charger les données initiales
  useEffect(() => {
    // Vérifier d'abord si des données viennent d'être uploadées
    const lastUploadData = sessionStorage.getItem('lastUploadData');
    
    if (lastUploadData) {
      try {
        const parsedData = JSON.parse(lastUploadData);
        // Initialiser avec les données de la session
        setStats({
          by_machine: Object.entries(parsedData.summary.countByMachine).map(([id, count]) => ({
            name: parsedData.machines[id],
            total_downtime: 0, // À calculer
            incident_count: count
          })),
          by_error_type: Object.entries(parsedData.summary.countByErrorType).map(([type, count]) => ({
            error_type: type,
            total_downtime: 0, // À calculer
            incident_count: count
          })),
          time_evolution: [], // Nécessite un traitement supplémentaire
          total_incidents: parsedData.downtimes.length,
          total_downtime: parsedData.summary.totalDowntime
        });
        
        // Extraire les machines et types d'erreur
        setMachines(Object.entries(parsedData.machines).map(([id, name]) => ({ id, name })));
        setErrorTypes([...new Set(parsedData.downtimes.map(d => d.error_type))].map(type => ({ id: type, name: type })));
        
        setIsLoading(false);
        // Effacer les données temporaires
        sessionStorage.removeItem('lastUploadData');
      } catch (error) {
        console.error('Error parsing session data:', error);
        // Continuer pour charger depuis l'API
        fetchData();
      }
    } else {
      fetchData();
    }
  }, []);
  
  // Surveiller les changements de filtre
  useEffect(() => {
    if (!isLoading) {
      fetchData();
    }
  }, [filters]);
  
  const fetchData = async () => {
    setIsLoading(true);
    
    try {
      // Charger les machines et types d'erreur si pas encore chargés
      if (machines.length === 0) {
        const machinesResponse = await axios.get('/api/maintenance-stats/machines');
        setMachines(machinesResponse.data);
      }
      
      if (errorTypes.length === 0) {
        const errorTypesResponse = await axios.get('/api/maintenance-stats/error-types');
        setErrorTypes(errorTypesResponse.data);
      }
      
      // Construire les paramètres de requête à partir des filtres
      const params = {};
      if (filters.startDate) params.start_date = filters.startDate;
      if (filters.endDate) params.end_date = filters.endDate;
      if (filters.machineId) params.machine_id = filters.machineId;
      if (filters.errorType) params.error_type = filters.errorType;
      
      const response = await axios.get('/api/maintenance-stats', { params });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters });
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }
  
  if (!stats || !stats.by_machine || stats.by_machine.length === 0) {
    return <NoDataMessage />;
  }
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Analyse des arrêts de machines</h1>
      
      <FiltersPanel 
        filters={filters} 
        onFilterChange={handleFilterChange}
        machines={machines}
        errorTypes={errorTypes}
      />
      
      <StatsCards stats={stats} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Temps d'arrêt par machine</h2>
          <DowntimeBarChart data={stats.by_machine} />
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Répartition par type d'erreur</h2>
          <ErrorTypePieChart data={stats.by_error_type} />
        </div>
      </div>
      
      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Évolution temporelle des arrêts</h2>
        <TimelineChart data={stats.time_evolution} />
      </div>
    </div>
  );
};

export default AnalyticsPage;

// src/components/charts/DowntimeBarChart.js
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const DowntimeBarChart = ({ data }) => {
  // Trier les données par temps d'arrêt décroissant
  const sortedData = [...data].sort((a, b) => b.total_downtime - a.total_downtime);
  
  // Convertir les minutes en heures pour l'affichage
  const formattedData = sortedData.map(item => ({
    ...item,
    downtime_hours: (item.total_downtime / 60).toFixed(1)
  }));
  
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={formattedData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis 
          yAxisId="left"
          label={{ value: 'Heures', angle: -90, position: 'insideLeft' }} 
        />
        <YAxis 
          yAxisId="right" 
          orientation="right" 
          dataKey="incident_count"
          label={{ value: 'Incidents', angle: 90, position: 'insideRight' }} 
        />
        <Tooltip formatter={(value, name) => {
          if (name === 'downtime_hours') return [`${value} heures`, 'Temps d\'arrêt'];
          if (name === 'incident_count') return [`${value}`, 'Nombre d\'incidents'];
          return [value, name];
        }} />
        <Legend />
        <Bar yAxisId="left" dataKey="downtime_hours" name="Temps d'arrêt (h)" fill="#3b82f6" />
        <Bar yAxisId="right" dataKey="incident_count" name="Nombre d'incidents" fill="#ef4444" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default DowntimeBarChart;

// src/components/charts/ErrorTypePieChart.js
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

const ErrorTypePieChart = ({ data }) => {
  // Trier les types d'erreur par temps d'arrêt décroissant
  const sortedData = [...data].sort((a, b) => b.total_downtime - a.total_downtime);
  
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
  
    return percent > 0.05 ? (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null;
  };
  
  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={sortedData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={130}
          fill="#8884d8"
          dataKey="total_downtime"
          nameKey="error_type"
        >
          {sortedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [`${Math.round(value / 60)} heures`, 'Temps d\'arrêt']} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default ErrorTypePieChart;

// src/components/charts/TimelineChart.js
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TimelineChart = ({ data }) => {
  // Formater les données pour afficher les heures
  const formattedData = data.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString(),
    downtime_hours: (item.total_downtime / 60).toFixed(1)
  }));
  
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart
        data={formattedData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis 
          label={{ value: 'Heures d\'arrêt', angle: -90, position: 'insideLeft' }} 
        />
        <Tooltip formatter={(value) => [`${value} heures`, 'Temps d\'arrêt']} />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="downtime_hours" 
          name="Temps d'arrêt (h)" 
          stroke="#3b82f6" 
          activeDot={{ r: 8 }} 
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default TimelineChart;

// src/components/FiltersPanel.js
import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const FiltersPanel = ({ filters, onFilterChange, machines, errorTypes }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleStartDateChange = (date) => {
    onFilterChange({ startDate: date });
  };
  
  const handleEndDateChange = (date) => {
    onFilterChange({ endDate: date });
  };
  
  const handleMachineChange = (e) => {
    onFilterChange({ machineId: e.target.value });
  };
  
  const handleErrorTypeChange = (e) => {
    onFilterChange({ errorType: e.target.value });
  };
  
  const handleReset = () => {
    onFilterChange({
      startDate: null,
      endDate: null,
      machineId: '',
      errorType: ''
    });
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Filtres</h2>
        <button 
          className="text-blue-600 hover:text-blue-800"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Réduire' : 'Développer'}
        </button>
      </div>
      
      {isExpanded && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de début
            </label>
            <DatePicker
              selected={filters.startDate}
              onChange={handleStartDateChange}
              selectsStart
              startDate={filters.startDate}
              endDate={filters.endDate}
              className="w-full p-2 border border-gray-300 rounded"
              placeholderText="Sélectionner une date"
              dateFormat="dd/MM/yyyy"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de fin
            </label>
            <DatePicker
              selected={filters.endDate}
              onChange={handleEndDateChange}
              selectsEnd
              startDate={filters.startDate}
              endDate={filters.endDate}
              minDate={filters.startDate}
              className="w-full p-2 border border-gray-300 rounded"
              placeholderText="Sélectionner une date"
              dateFormat="dd/MM/yyyy"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Machine
            </label>
            <select
              value={filters.machineId}
              onChange={handleMachineChange}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="">Toutes les machines</option>
              {machines.map(machine => (
                <option key={machine.id} value={machine.id}>
                  {machine.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type d'erreur
            </label>
            <select
              value={filters.errorType}
              onChange={handleErrorTypeChange}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="">Tous les types</option>
              {errorTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="md:col-span-2 lg:col-span-4 flex justify-end">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Réinitialiser les filtres
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiltersPanel;

// src/components/StatsCards.js
import React from 'react';

const StatsCards = ({ stats }) => {
  // Convertir les minutes en heures et jours pour l'affichage
  const totalDowntimeHours = Math.floor(stats.total_downtime / 60);
  const totalDowntimeDays = Math.floor(totalDowntimeHours / 24);
  const remainingHours = totalDowntimeHours % 24;
  
  // Calculer le coût moyen (exemple fictif)
  const averageCostPerHour = 1000; // € par heure
  const estimatedCost = totalDowntimeHours * averageCostPerHour;
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
      <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
        <h3 className="text-sm font-medium text-blue-800">Nombre total d'incidents</h3>
        <p className="mt-1 text-3xl font-semibold text-blue-900">{stats.total_incidents}</p>
      </div>
      
      <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
        <h3 className="text-sm font-medium text-red-800">Temps d'arrêt total</h3>
        <p className="mt-1 text-3xl font-semibold text-red-900">
          {totalDowntimeDays > 0 ? `${totalDowntimeDays}j ${remainingHours}h` : `${totalDowntimeHours}h`}
        </p>
      </div>
      
      <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
        <h3 className="text-sm font-medium text-green-800">Durée moyenne par incident</h3>
        <p className="mt-1 text-3xl font-semibold text-green-900">
          {stats.total_incidents > 0 
            ? `${Math.round((stats.total_downtime / stats.total_incidents) / 60 * 10) / 10}h` 
            : '0h'}
        </p>
      </div>
      
      <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
        <h3 className="text-sm font-medium text-yellow-800">Coût estimé</h3>
        <p className="mt-1 text-3xl font-semibold text-yellow-900">
          {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(estimatedCost)}
        </p>
      </div>
    </div>
  );
};

export default StatsCards;

// src/components/NoDataMessage.js
import React from 'react';
import { Link } from 'react-router-dom';

const NoDataMessage = () => {
  return (
    <div className="text-center py-12">
      <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      
      <h2 className="mt-4 text-lg font-semibold text-gray-900">Aucune donnée disponible</h2>
      
      <p className="mt-2 text-gray-600">
        Aucune donnée d'analyse n'a été trouvée. Veuillez importer un fichier XML pour commencer.
      </p>
      
      <Link to="/upload" className="mt-6 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Importer un fichier XML
      </Link>
    </div>
  );
};

export default NoDataMessage;

// src/components/LoadingSpinner.js
import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="flex justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>
  );
};

export default LoadingSpinner;

// src/pages/Dashboard.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

import StatsCards from '../components/StatsCards';
import DowntimeBarChart from '../components/charts/DowntimeBarChart';
import NoDataMessage from '../components/NoDataMessage';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [latestReports, setLatestReports] = useState([]);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Récupérer les statistiques globales
        const statsResponse = await axios.get('/api/maintenance-stats');
        setStats(statsResponse.data);
        
        // Récupérer les derniers rapports importés
        // Cette API est à implémenter côté backend
        const reportsResponse = await axios.get('/api/latest-reports');
        setLatestReports(reportsResponse.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }
  
  if (!stats) {
    return <NoDataMessage />;
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <Link to="/upload" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Importer un nouveau fichier
        </Link>
      </div>
      
      <StatsCards stats={stats} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Top machines par temps d'arrêt</h2>
          <DowntimeBarChart data={stats.by_machine.slice(0, 5)} />
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Derniers rapports importés</h2>
          
          {latestReports.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Incidents</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {latestReports.map(report => (
                    <tr key={report.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{report.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(report.imported_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{report.incident_count}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link to={`/analytics?report_id=${report.id}`} className="text-blue-600 hover:text-blue-900">
                          Voir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Aucun rapport récent</p>
          )}
        </div>
      </div>
      
      <div className="mt-8 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Accès rapide</h2>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        <Link to="/analytics" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <h3 className="font-medium text-blue-600">Analyse complète</h3>
          <p className="mt-2 text-gray-600">Accéder à l'analyse détaillée de tous les arrêts machines.</p>
        </Link>
        
        <Link to="/upload" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <h3 className="font-medium text-blue-600">Importer un fichier</h3>
          <p className="mt-2 text-gray-600">Importer un nouveau fichier XML pour analyse.</p>
        </Link>
        
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <h3 className="font-medium text-blue-600">Exporter des données</h3>
          <p className="mt-2 text-gray-600">Exporter les analyses en format CSV, Excel ou PDF.</p>
          <span className="inline-block mt-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">Bientôt disponible</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;