// src/pages/Dashboard.js
import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <Link to="/upload" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Importer un nouveau fichier
        </Link>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
          <h3 className="text-sm font-medium text-blue-800">Nombre total d'incidents</h3>
          <p className="mt-1 text-3xl font-semibold text-blue-900">0</p>
        </div>
        
        <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
          <h3 className="text-sm font-medium text-red-800">Temps d'arrêt total</h3>
          <p className="mt-1 text-3xl font-semibold text-red-900">0h</p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
          <h3 className="text-sm font-medium text-green-800">Durée moyenne par incident</h3>
          <p className="mt-1 text-3xl font-semibold text-green-900">0h</p>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
          <h3 className="text-sm font-medium text-yellow-800">Coût estimé</h3>
          <p className="mt-1 text-3xl font-semibold text-yellow-900">0 €</p>
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