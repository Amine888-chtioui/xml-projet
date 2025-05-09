// src/pages/AnalyticsPage.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const AnalyticsPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simuler un chargement de données
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Analyse des arrêts de machines</h1>
      
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Filtres</h2>
          <button className="text-blue-600 hover:text-blue-800">
            Développer
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
          <h3 className="text-sm font-medium text-blue-800">Nombre total d'incidents</h3>
          <p className="mt-1 text-3xl font-semibold text-blue-900">5</p>
        </div>
        
        <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
          <h3 className="text-sm font-medium text-red-800">Temps d'arrêt total</h3>
          <p className="mt-1 text-3xl font-semibold text-red-900">7h 25m</p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
          <h3 className="text-sm font-medium text-green-800">Durée moyenne par incident</h3>
          <p className="mt-1 text-3xl font-semibold text-green-900">1h 29m</p>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
          <h3 className="text-sm font-medium text-yellow-800">Coût estimé</h3>
          <p className="mt-1 text-3xl font-semibold text-yellow-900">7 450 €</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Temps d'arrêt par machine</h2>
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">Graphique à barres sera affiché ici</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Répartition par type d'erreur</h2>
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">Graphique camembert sera affiché ici</p>
          </div>
        </div>
      </div>
      
      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Évolution temporelle des arrêts</h2>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500">Graphique d'évolution sera affiché ici</p>
        </div>
      </div>
      
      <div className="mt-8">
        <p className="text-gray-600 text-sm">
          Note: Ces données sont des exemples. Pour voir des données réelles, importez un fichier XML de maintenance.
        </p>
      </div>
    </div>
  );
};

export default AnalyticsPage;