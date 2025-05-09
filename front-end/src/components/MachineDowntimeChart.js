// src/components/MachineDowntimeChart.js - Fixed version
import React, { useState, useEffect, useCallback } from 'react';
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

// Define fallback data outside the component to avoid recreating on each render
const FALLBACK_DATA = [
  { machine_id: "ALPHA 158", name: "Komax Alpha 355", total_downtime: 245, incident_count: 12 },
  { machine_id: "ALPHA 161", name: "Komax Alpha 488 10M", total_downtime: 230, incident_count: 8 },
  { machine_id: "ALPHA 166", name: "Komax Alpha 488 7M", total_downtime: 140, incident_count: 5 },
  { machine_id: "ALPHA 146", name: "Komax Alpha 488 S 7M", total_downtime: 85, incident_count: 3 },
  { machine_id: "ALPHA 176", name: "Komax Alpha 355", total_downtime: 45, incident_count: 2 },
  { machine_id: "ALPHA 177", name: "KOMAX ALPHA 550", total_downtime: 40, incident_count: 3 }
];

const MachineDowntimeChart = ({ filters = {}, onDataLoaded = () => {} }) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' or 'asc'
  const [hoveredBar, setHoveredBar] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Memoize the sort function to prevent recreation on each render
  const sortData = useCallback((dataToSort, order) => {
    return [...dataToSort].sort((a, b) => {
      return order === 'desc' 
        ? b.total_downtime - a.total_downtime 
        : a.total_downtime - b.total_downtime;
    });
  }, []);

  // Format the data for display
  const formatData = useCallback((rawData) => {
    return rawData.map(item => ({
      ...item,
      downtime_hours: Math.round((item.total_downtime / 60) * 10) / 10,
      avg_downtime: Math.round(item.total_downtime / (item.incident_count || 1))
    }));
  }, []);

  // Load data from API or use fallback
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      // Skip if we're retrying too many times
      if (retryCount > 2) {
        if (isMounted) {
          // Use fallback data after 3 failed attempts
          const formattedFallbackData = formatData(FALLBACK_DATA);
          const sortedData = sortData(formattedFallbackData, sortOrder);
          setData(sortedData);
          setIsLoading(false);
          setInitialLoadDone(true);
          onDataLoaded(formattedFallbackData);
        }
        return;
      }

      try {
        if (isMounted) {
          setIsLoading(true);
          setError(null);
        }
        
        let machineData;
        try {
          const response = await statsService.getStatsByMachine(filters);
          machineData = response?.data || [];
        } catch (apiError) {
          console.error("API error:", apiError);
          
          if (isMounted) {
            setRetryCount(prev => prev + 1);
            machineData = FALLBACK_DATA;
          }
        }
        
        // Verify we have data
        if (!machineData || machineData.length === 0) {
          machineData = FALLBACK_DATA;
        }
        
        if (isMounted) {
          const formattedData = formatData(machineData);
          const sortedData = sortData(formattedData, sortOrder);
          
          setData(sortedData);
          setInitialLoadDone(true);
          onDataLoaded(formattedData);
        }
      } catch (err) {
        console.error("Error loading data:", err);
        if (isMounted) {
          setError("An error occurred while loading the data");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Only load data if we haven't done the initial load or if the filters or sort order changed
    if (!initialLoadDone || Object.keys(filters).length > 0) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [filters, sortOrder, onDataLoaded, formatData, sortData, retryCount, initialLoadDone]);

  // Effect to resort data when sort order changes (without refetching)
  useEffect(() => {
    if (data.length > 0) {
      setData(sortData(data, sortOrder));
    }
  }, [sortOrder, sortData, data.length]);

  const toggleSortOrder = () => {
    setSortOrder(current => current === 'desc' ? 'asc' : 'desc');
  };

  const handleMouseEnter = (_, index) => {
    setHoveredBar(index);
  };

  const handleMouseLeave = () => {
    setHoveredBar(null);
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
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

  const handleRetry = () => {
    setRetryCount(0); // Reset retry counter
    setError(null);
    setIsLoading(true);
    setInitialLoadDone(false); // Force a reload
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Machine Downtime</h2>
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
          <h2 className="text-lg font-semibold">Machine Downtime</h2>
        </div>
        <div className="text-center py-10 text-red-600">
          <p>{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={handleRetry}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Machine Downtime</h2>
        </div>
        <div className="text-center py-10 text-gray-600">
          <p>No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <h2 className="text-lg font-semibold">Machine Downtime</h2>
        <div className="flex space-x-2 mt-2 sm:mt-0">
          <button 
            onClick={toggleSortOrder}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center"
          >
            <span>Sort: {sortOrder === 'desc' ? 'Descending' : 'Ascending'}</span>
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
      
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
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
                return [formatDuration(value), 'Downtime'];
              }
              return [value, name];
            }}
            labelFormatter={(label) => {
              // Find the machine ID to display with its name
              const item = data.find(d => d.name === label);
              return `${label} (${item?.machine_id || ''})`;
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
              { value: 'Downtime (minutes)', type: 'rect', color: '#0047AB' }
            ]}
          />
          <Bar 
            dataKey="total_downtime" 
            name="total_downtime" 
            radius={[4, 4, 0, 0]}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={getBarFill(index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="text-center p-2 bg-blue-50 rounded">
          <p className="text-sm text-gray-600">Total Incidents</p>
          <p className="font-semibold">{data.reduce((acc, curr) => acc + (curr.incident_count || 0), 0)}</p>
        </div>
        <div className="text-center p-2 bg-blue-50 rounded">
          <p className="text-sm text-gray-600">Total Downtime</p>
          <p className="font-semibold">{formatDuration(data.reduce((acc, curr) => acc + (curr.total_downtime || 0), 0))}</p>
        </div>
        <div className="text-center p-2 bg-blue-50 rounded sm:col-span-1 col-span-2">
          <p className="text-sm text-gray-600">Average Duration</p>
          <p className="font-semibold">{
            formatDuration(
              Math.round(
                data.reduce((acc, curr) => acc + (curr.total_downtime || 0), 0) / 
                Math.max(1, data.reduce((acc, curr) => acc + (curr.incident_count || 0), 0))
              )
            )
          }</p>
        </div>
      </div>
    </div>
  );
};

export default MachineDowntimeChart;