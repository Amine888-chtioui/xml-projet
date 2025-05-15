// src/components/ComparisonChart.js
import React, { useState, useEffect } from 'react';
import { statsService } from '../services/api';

const ComparisonChart = () => {
  const [performanceData, setPerformanceData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    const loadPerformanceData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await statsService.getPerformanceIndicators(period);
        
        if (response?.data) {
          setPerformanceData(response.data);
        } else {
          setError('Impossible de charger les données de comparaison');
        }
      } catch (err) {
        console.error('Erreur lors du chargement des indicateurs de performance:', err);
        setError('Une erreur est survenue lors du chargement des données');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPerformanceData();
  }, [period]);
  
  const handlePeriodChange = (e) => {
    setPeriod(e.target.value);
  };
  
  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };
  
  const getArrowIcon = (variation) => {
    if (variation > 0) {
      return (
        <span className="text-red-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          +{Math.abs(variation)}%
        </span>
      );
    } else if (variation < 0) {
      return (
        <span className="text-green-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          {Math.abs(variation)}%
        </span>
      );
    } else {
      return <span className="text-gray-500">0%</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Comparaison de périodes</h2>
        </div>
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !performanceData) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Comparaison de périodes</h2>
        </div>
        <div className="text-center py-10 text-red-600">
          <p>{error || 'Aucune donnée disponible'}</p>
        </div>
      </div>
    );
  }

  const periodLabels = {
    'week': 'la semaine',
    'month': 'le mois',
    'quarter': 'le trimestre',
    'year': 'l\'année'
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <h2 className="text-lg font-semibold">Comparaison avec {periodLabels[period]} précédent</h2>
        <div className="mt-2 sm:mt-0">
          <select 
            className="border border-gray-300 rounded px-3 py-2"
            value={period}
            onChange={handlePeriodChange}
          >
            <option value="week">Semaine</option>
            <option value="month">Mois</option>
            <option value="quarter">Trimestre</option>
            <option value="year">Année</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
        <div className="p-4 border rounded-lg">
          <div className="flex justify-between mb-2">
            <h3 className="font-medium">Incidents</h3>
            {getArrowIcon(performanceData.variation.incident)}
          </div>
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Actuel</p>
              <p className="text-2xl font-bold">{performanceData.current_period.incident_count}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Précédent</p>
              <p className="text-xl">{performanceData.previous_period.incident_count}</p>
            </div>
          </div>
        </div>
        
        <div className="p-4 border rounded-lg">
          <div className="flex justify-between mb-2">
            <h3 className="font-medium">Temps d'arrêt</h3>
            {getArrowIcon(performanceData.variation.downtime)}
          </div>
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Actuel</p>
              <p className="text-2xl font-bold">{formatDuration(performanceData.current_period.total_downtime)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Précédent</p>
              <p className="text-xl">{formatDuration(performanceData.previous_period.total_downtime)}</p>
            </div>
          </div>
        </div>
        
        <div className="p-4 border rounded-lg">
          <div className="flex justify-between mb-2">
            <h3 className="font-medium">Durée moyenne</h3>
            {getArrowIcon(performanceData.variation.downtime - performanceData.variation.incident)}
          </div>
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Actuel</p>
              <p className="text-2xl font-bold">{formatDuration(performanceData.current_period.avg_downtime)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Précédent</p>
              <p className="text-xl">{formatDuration(performanceData.previous_period.avg_downtime)}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="text-sm text-gray-500 mt-2">
        <p>Période actuelle: du {new Date(performanceData.current_period.start_date).toLocaleDateString('fr-FR')} à aujourd'hui</p>
        <p>Période précédente: du {new Date(performanceData.previous_period.start_date).toLocaleDateString('fr-FR')} au {new Date(performanceData.previous_period.end_date).toLocaleDateString('fr-FR')}</p>
      </div>
    </div>
  );
};

export default ComparisonChart;