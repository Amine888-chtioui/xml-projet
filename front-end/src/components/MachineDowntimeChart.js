// src/components/MachineDowntimeChart.js
import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { statsService } from '../services/api';

const MachineDowntimeChart = ({ filters = {}, onDataLoaded = () => {} }) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' ou 'asc'
  const [hoveredBar, setHoveredBar] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Appel API réel - décommentez cette section en production
        // const response = await statsService.getStatsByMachine(filters);
        // let machineData = response.data;
        
        // Pour la démonstration, utilisons des données statiques
        let machineData = [
          { name: "Machine A", total_downtime: 245, incident_count: 12 },
          { name: "Machine B", total_downtime: 230, incident_count: 8 },
          { name: "Machine C", total_downtime: 140, incident_count: 5 },
          { name: "Machine D", total_downtime: 85, incident_count: 3 },
          { name: "Machine E", total_downtime: 45, incident_count: 2 },
          { name: "Machine F", total_downtime: 40, incident_count: 1 }
        ];
        
        // Trier les données
        machineData = sortData(machineData, sortOrder);
        
        // Ajouter les données formatées pour l'affichage (temps en heures)
        machineData = machineData.map(item => ({
          ...item,
          downtime_hours: Math.round((item.total_downtime / 60) * 10) / 10,
          avg_downtime: Math.round(item.total_downtime / item.incident_count)
        }));
        
        setData(machineData);
        
        // Informer le composant parent que les données sont chargées
        onDataLoaded(machineData);
      } catch (err) {
        console.error("Erreur lors du chargement des données:", err);
        setError("Une erreur est survenue lors du chargement des données");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [filters, sortOrder, onDataLoaded]);

  const sortData = (dataToSort, order) => {
    return [...dataToSort].sort((a, b) => {
      return order === 'desc' 
        ? b.total_downtime - a.total_downtime 
        : a.total_downtime - b.total_downtime;
    });
  };

  const toggleSortOrder = () => {
    setSortOrder(current => current === 'desc' ? 'asc' : 'desc');
  };

  const handleMouseEnter = (data, index) => {
    setHoveredBar(index);
  };

  const handleMouseLeave = () => {
    setHoveredBar(null);
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getBarFill = (index) => {
    // Base color
    const baseColor = '#0047AB';
    
    // Highlighted color for hovered bar
    if (hoveredBar === index) {
      return '#1565C0';
    }
    
    // Create a gradient effect based on index
    // First item is the darkest, gradually getting lighter
    const opacity = 1 - (index * 0.1);
    return baseColor + (opacity < 0.5 ? '80' : ''); // Add 80 for 50% opacity
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Temps d'arrêt par machine</h2>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Temps d'arrêt par machine</h2>
        </div>
        <div className="text-center py-10 text-red-600">
          <p>{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => window.location.reload()}
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Temps d'arrêt par machine</h2>
        </div>
        <div className="text-center py-10 text-gray-600">
          <p>Aucune donnée disponible</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <h2 className="text-lg font-semibold">Temps d'arrêt par machine</h2>
        <div className="flex space-x-2 mt-2 sm:mt-0">
          <button 
            onClick={toggleSortOrder}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center"
          >
            <span>Trier: {sortOrder === 'desc' ? 'Décroissant' : 'Croissant'}</span>
            <svg 
              className="w-4 h-4 ml-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {sortOrder === 'desc' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              )}
            </svg>
          </button>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
          barSize={45}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="name" 
            angle={-45} 
            textAnchor="end" 
            height={70} 
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#E0E0E0' }}
            axisLine={{ stroke: '#E0E0E0' }}
          />
          <YAxis 
            label={{ 
              value: 'Minutes', 
              angle: -90, 
              position: 'insideLeft', 
              style: { textAnchor: 'middle' } 
            }}
            tickLine={{ stroke: '#E0E0E0' }}
            axisLine={{ stroke: '#E0E0E0' }}
          />
          <Tooltip 
            formatter={(value, name) => {
              if (name === 'total_downtime') {
                return [formatDuration(value), 'Temps d\'arrêt'];
              }
              return [value, name];
            }}
            cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #E0E0E0',
              borderRadius: '4px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
            }}
            itemStyle={{ padding: '2px 0' }}
            labelStyle={{ fontWeight: 'bold', marginBottom: '5px' }}
          />
          <Legend 
            wrapperStyle={{ bottom: 0 }}
            payload={[
              { value: 'Temps d\'arrêt (minutes)', type: 'rect', color: '#0047AB' }
            ]}
          />
          <Bar 
            dataKey="total_downtime" 
            name="total_downtime" 
            radius={[4, 4, 0, 0]}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarFill(index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="text-center p-2 bg-blue-50 rounded">
          <p className="text-sm text-gray-600">Incidents totaux</p>
          <p className="font-semibold">{data.reduce((acc, curr) => acc + curr.incident_count, 0)}</p>
        </div>
        <div className="text-center p-2 bg-blue-50 rounded">
          <p className="text-sm text-gray-600">Temps d'arrêt total</p>
          <p className="font-semibold">{formatDuration(data.reduce((acc, curr) => acc + curr.total_downtime, 0))}</p>
        </div>
        <div className="text-center p-2 bg-blue-50 rounded sm:col-span-1 col-span-2">
          <p className="text-sm text-gray-600">Durée moyenne</p>
          <p className="font-semibold">{
            formatDuration(
              Math.round(
                data.reduce((acc, curr) => acc + curr.total_downtime, 0) / 
                data.reduce((acc, curr) => acc + curr.incident_count, 0)
              )
            )
          }</p>
        </div>
      </div>
    </div>
  );
};

export default MachineDowntimeChart;