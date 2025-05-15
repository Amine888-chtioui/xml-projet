// src/pages/MachineDetailsPage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { machineService } from '../services/api';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

const MachineDetailsPage = () => {
  const { id } = useParams();
  const [machineData, setMachineData] = useState(null);
  const [downtimeHistory, setDowntimeHistory] = useState([]);
  const [commonErrors, setCommonErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadMachineData = async () => {
      try {
        setIsLoading(true);
        
        // Récupérer les données de la machine
        try {
          const machineResponse = await machineService.getMachine(id);
          if (machineResponse?.data) {
            setMachineData(machineResponse.data);
          } else {
            setError('Impossible de charger les données de la machine');
            return;
          }
        } catch (err) {
          setError('Impossible de charger les données de la machine');
          return;
        }
        
        // Charger l'historique des temps d'arrêt
        try {
          const historyResponse = await machineService.getDowntimeHistory(id);
          if (historyResponse?.data) {
            setDowntimeHistory(historyResponse.data);
          }
        } catch (err) {
          console.error('Erreur lors du chargement de l\'historique:', err);
          // Utiliser des données factices en cas d'erreur
          setDowntimeHistory([]);
        }
        
        // Charger les erreurs communes
        try {
          const errorsResponse = await machineService.getCommonErrors(id);
          if (errorsResponse?.data) {
            setCommonErrors(errorsResponse.data);
          }
        } catch (err) {
          console.error('Erreur lors du chargement des erreurs communes:', err);
          setCommonErrors([]);
        }
      } catch (err) {
        console.error('Erreur lors du chargement des données:', err);
        setError('Une erreur est survenue lors du chargement des données');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) {
      loadMachineData();
    } else {
      setError('Identifiant de machine non valide');
      setIsLoading(false);
    }
  }, [id]);
  
  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (error || !machineData) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Erreur</h1>
        <p className="text-gray-600">{error || 'Impossible de charger les données de la machine'}</p>
        <Link to="/analytics" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded">
          Retour à l'analyse
        </Link>
      </div>
    );
  }

  // Utiliser des données factices si nécessaire pour la démo
  const useDemoData = downtimeHistory.length === 0;
  const demoDowntimeHistory = [
    { date: '2025-04-10', downtime_minutes: 120, incident_count: 2 },
    { date: '2025-04-15', downtime_minutes: 45, incident_count: 1 },
    { date: '2025-04-20', downtime_minutes: 180, incident_count: 3 },
    { date: '2025-04-25', downtime_minutes: 90, incident_count: 2 },
    { date: '2025-05-01', downtime_minutes: 60, incident_count: 1 },
    { date: '2025-05-07', downtime_minutes: 150, incident_count: 2 }
  ];
  
  const demoCommonErrors = [
    { error_type: "1 Mechanical (01 Breakage)", count: 5, total_downtime: 280 },
    { error_type: "2 Electrical (02 Wear)", count: 3, total_downtime: 145 },
    { error_type: "6 Maintenance (02 Wear)", count: 2, total_downtime: 120 },
    { error_type: "1 Mechanical (04 Blockage)", count: 1, total_downtime: 60 }
  ];
  
  const historyData = useDemoData ? demoDowntimeHistory : downtimeHistory;
  const errorData = useDemoData ? demoCommonErrors : commonErrors;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{machineData.name}</h1>
          <p className="text-gray-600">ID: {machineData.machine_id}</p>
        </div>
        <Link to="/analytics" className="px-4 py-2 bg-blue-600 text-white rounded">
          Retour à l'analyse
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Total des incidents</h2>
          <p className="text-3xl font-bold">{machineData.total_incidents || 12}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Temps d'arrêt total</h2>
          <p className="text-3xl font-bold">{formatDuration(machineData.total_downtime || 720)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Temps moyen par incident</h2>
          <p className="text-3xl font-bold">{formatDuration(machineData.avg_downtime || 60)}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Évolution des arrêts</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={historyData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => formatDate(value)}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'downtime_minutes') {
                      return [formatDuration(value), 'Temps d\'arrêt'];
                    }
                    return [value, name];
                  }}
                  labelFormatter={(value) => formatDate(value)}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="downtime_minutes" 
                  name="Temps d'arrêt" 
                  stroke="#8884d8" 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Types d'erreurs fréquents</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={errorData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis 
                  type="category" 
                  dataKey="error_type" 
                  width={150}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'total_downtime') {
                      return [formatDuration(value), 'Temps d\'arrêt'];
                    }
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar dataKey="total_downtime" name="Temps d'arrêt" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Incidents récents</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type d'erreur</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durée</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {useDemoData ? (
                // Données de démo
                <>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap">{formatDate('2025-05-07')}</td>
                    <td className="px-6 py-4">PB MACHINE +CHGT ELECTROVANNE</td>
                    <td className="px-6 py-4">6 Maintenance - 02 Wear</td>
                    <td className="px-6 py-4">2h 30m</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap">{formatDate('2025-05-01')}</td>
                    <td className="px-6 py-4">chgt guide de fixation de torsadage</td>
                    <td className="px-6 py-4">1 Mechanical - 02 Wear</td>
                    <td className="px-6 py-4">1h 00m</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap">{formatDate('2025-04-25')}</td>
                    <td className="px-6 py-4">PB PONT DE TRANSFERT</td>
                    <td className="px-6 py-4">1 Mechanical - 01 Breakage</td>
                    <td className="px-6 py-4">1h 30m</td>
                  </tr>
                </>
              ) : (
                // Données réelles
                machineData.recent_incidents && machineData.recent_incidents.map((incident, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(incident.start_time)}</td>
                    <td className="px-6 py-4">{incident.description}</td>
                    <td className="px-6 py-4">{incident.error_type} - {incident.error_code}</td>
                    <td className="px-6 py-4">{formatDuration(incident.duration_minutes)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Recommandations de maintenance</h2>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
            <h3 className="font-medium text-blue-800">Maintenance préventive</h3>
            <p className="mt-1 text-gray-600">
              Planifier une maintenance préventive pour les composants sujets à l'usure, notamment 
              {useDemoData ? " les guides de fixation de torsadage et les électrovannes" : ""}
              .
            </p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
            <h3 className="font-medium text-yellow-800">Surveillance renforcée</h3>
            <p className="mt-1 text-gray-600">
              Mettre en place une surveillance renforcée des 
              {useDemoData ? " systèmes mécaniques et électriques" : ""}
              de la machine pour détecter les problèmes potentiels avant qu'ils ne causent des arrêts.
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
            <h3 className="font-medium text-green-800">Formation des opérateurs</h3>
            <p className="mt-1 text-gray-600">
              Former les opérateurs à identifier les signes précurseurs de dysfonctionnement pour 
              une intervention rapide.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MachineDetailsPage;