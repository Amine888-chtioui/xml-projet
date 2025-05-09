// src/pages/AnalyticsPage.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import MachineDowntimeChart from '../components/MachineDowntimeChart';
import ErrorTypePieChart from '../components/ErrorTypePieChart';
import TimeEvolutionChart from '../components/TimeEvolutionChart';
import FilterPanel from '../components/FilterPanel';
import { statsService } from '../services/api';

const AnalyticsPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [summaryData, setSummaryData] = useState({
    total_incidents: 0,
    total_downtime: 0,
    avg_downtime: 0,
    estimated_cost: 0
  });
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

  useEffect(() => {
    loadSummaryData();
  }, [filters]);

  const loadSummaryData = async () => {
    try {
      setIsLoading(true);
      
      // Charger les données de résumé
      const response = await statsService.getSummary();
      if (response?.data) {
        // Calculer le coût estimé (exemple: 100€ par heure d'arrêt)
        const costPerHour = 100;
        const totalDowntimeHours = response.data.total_downtime / 60;
        const estimatedCost = Math.round(totalDowntimeHours * costPerHour);
        
        setSummaryData({
          total_incidents: response.data.total_incidents || 0,
          total_downtime: response.data.total_downtime || 0,
          avg_downtime: response.data.total_incidents ? 
            Math.round(response.data.total_downtime / response.data.total_incidents) : 0,
          estimated_cost: estimatedCost
        });
      } else {
        // Données de démonstration
        setSummaryData({
          total_incidents: 42,
          total_downtime: 2550, // 42.5 heures
          avg_downtime: 61, // ~1 heure par incident
          estimated_cost: 4250 // 42.5 * 100€
        });
      }
    } catch (error) {
      console.error("Erreur lors du chargement des données de résumé:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    console.log("Filtres appliqués:", newFilters);
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const toggleFilterCollapse = () => {
    setIsFilterCollapsed(!isFilterCollapsed);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Analyse des arrêts de machines</h1>
      
      <FilterPanel 
        onFilterChange={handleFilterChange}
        isCollapsed={isFilterCollapsed}
        onToggleCollapse={toggleFilterCollapse}
      />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
          <h3 className="text-sm font-medium text-blue-800">Nombre total d'incidents</h3>
          <p className="mt-1 text-3xl font-semibold text-blue-900">
            {isLoading ? (
              <div className="animate-pulse h-8 w-16 bg-blue-200 rounded"></div>
            ) : (
              summaryData.total_incidents
            )}
          </p>
        </div>
        
        <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
          <h3 className="text-sm font-medium text-red-800">Temps d'arrêt total</h3>
          <p className="mt-1 text-3xl font-semibold text-red-900">
            {isLoading ? (
              <div className="animate-pulse h-8 w-24 bg-red-200 rounded"></div>
            ) : (
              formatDuration(summaryData.total_downtime)
            )}
          </p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
          <h3 className="text-sm font-medium text-green-800">Durée moyenne par incident</h3>
          <p className="mt-1 text-3xl font-semibold text-green-900">
            {isLoading ? (
              <div className="animate-pulse h-8 w-16 bg-green-200 rounded"></div>
            ) : (
              formatDuration(summaryData.avg_downtime)
            )}
          </p>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
          <h3 className="text-sm font-medium text-yellow-800">Coût estimé</h3>
          <p className="mt-1 text-3xl font-semibold text-yellow-900">
            {isLoading ? (
              <div className="animate-pulse h-8 w-20 bg-yellow-200 rounded"></div>
            ) : (
              `${summaryData.estimated_cost.toLocaleString()} €`
            )}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <MachineDowntimeChart filters={filters} />
        <ErrorTypePieChart filters={filters} />
      </div>
      
      <div className="mb-6">
        <TimeEvolutionChart filters={filters} />
      </div>
      
      <div className="mt-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Incidents critiques</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type d'erreur</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durée</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Incidents critiques seraient normalement chargés depuis l'API */}
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">ALPHA 169 (HBQ-922)</td>
                  <td className="px-6 py-4">PB MACHINE +CHGT ELECTROVANNE</td>
                  <td className="px-6 py-4">6 Maintenance - 02 Wear</td>
                  <td className="px-6 py-4">5h 00m</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">ALPHA 162 (Komax Alpha 488 10M)</td>
                  <td className="px-6 py-4">chgt guide de fixation de torsadage libérer le torsadage</td>
                  <td className="px-6 py-4">1 Mechanical - 02 Wear</td>
                  <td className="px-6 py-4">4h 00m</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">ALPHA 166 (Komax Alpha 488 7M)</td>
                  <td className="px-6 py-4">PB PONT DE TRANSFERT</td>
                  <td className="px-6 py-4">1 Mechanical - 01 Breakage</td>
                  <td className="px-6 py-4">4h 00m</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {!isLoading && (
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Période analysée: {filters.start_date || 'Toutes dates'} à {filters.end_date || 'aujourd\'hui'}</p>
          <p className="mt-2">
            Ces données sont basées sur les fichiers XML importés. Pour voir des données à jour, importez de nouveaux fichiers XML de maintenance.
          </p>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;