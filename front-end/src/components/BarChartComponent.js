// src/components/BarChartComponent.js
import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { statsService } from '../services/api';

const BarChartComponent = ({ title, endpoint, dataKey, nameKey, valueKey, color = '#0047AB' }) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Utiliser la fonction appropriée du service API en fonction de l'endpoint
        let response;
        switch (endpoint) {
          case 'machines':
            response = await statsService.getStatsByMachine();
            break;
          case 'errorTypes':
            response = await statsService.getStatsByErrorType();
            break;
          case 'timeEvolution':
            response = await statsService.getTimeEvolution();
            break;
          default:
            response = await statsService.getStats();
        }
        
        const formattedData = response.data.map(item => ({
          name: item[nameKey || 'name'],
          value: item[valueKey || 'total_downtime'],
        })).sort((a, b) => b.value - a.value);
        
        setData(formattedData);
      } catch (err) {
        console.error('Erreur lors du chargement des données:', err);
        setError('Impossible de charger les données. Veuillez réessayer plus tard.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [endpoint, dataKey, nameKey, valueKey]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-4 text-center text-gray-600">
        <p>Aucune donnée disponible pour ce graphique.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white p-4 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="name" 
            angle={-45} 
            textAnchor="end" 
            height={70} 
            tick={{ fontSize: 12 }}
          />
          <YAxis />
          <Tooltip 
            formatter={(value) => [
              `${value} ${valueKey === 'duration_minutes' ? 'minutes' : ''}`, 
              'Valeur'
            ]}
          />
          <Legend />
          <Bar 
            dataKey="value" 
            fill={color} 
            name={dataKey || 'Valeur'} 
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChartComponent;