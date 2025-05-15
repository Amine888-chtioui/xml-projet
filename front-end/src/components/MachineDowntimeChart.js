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

// Default fallback data if API fails
const FALLBACK_DATA = [
  { machine_id: "ALPHA 169", name: "HBQ-922", total_downtime: 300, incident_count: 1, avg_downtime: 300 },
  { machine_id: "ALPHA 162", name: "Komax Alpha 488 10M", total_downtime: 240, incident_count: 1, avg_downtime: 240 },
  { machine_id: "ALPHA 166", name: "Komax Alpha 488 7M", total_downtime: 240, incident_count: 1, avg_downtime: 240 },
  { machine_id: "ALPHA 146", name: "Komax Alpha 488 S 7M", total_downtime: 210, incident_count: 1, avg_downtime: 210 },
  { machine_id: "ALPHA 76", name: "Komax Alpha 355", total_downtime: 180, incident_count: 1, avg_downtime: 180 },
  { machine_id: "ALPHA 91", name: "Komax Alpha 488 S 7M", total_downtime: 75, incident_count: 1, avg_downtime: 75 }
];

// Color scheme for chart
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#4CAF50', '#9C27B0', '#F44336'];

const MachineDowntimeChart = ({ filters = {}, height = 300 }) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' or 'asc'
  const [sortBy, setSortBy] = useState('total_downtime'); // 'total_downtime', 'incident_count', or 'avg_downtime'
  const [hoveredBar, setHoveredBar] = useState(null);

  // Memoized sort function
  const sortData = useCallback((dataToSort, order, sortField) => {
    return [...dataToSort].sort((a, b) => {
      return order === 'desc' 
        ? b[sortField] - a[sortField] 
        : a[sortField] - b[sortField];
    });
  }, []);

  // Load data from API
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get machine statistics based on filters
      const response = await statsService.getStatsByMachine(filters);
      
      if (response?.data?.data && response.data.data.length > 0) {
        // Sort data based on current sort settings
        const sortedData = sortData(response.data.data, sortOrder, sortBy);
        setData(sortedData);
      } else {
        // Use fallback data if no data received
        const sortedFallbackData = sortData(FALLBACK_DATA, sortOrder, sortBy);
        setData(sortedFallbackData);
      }
    } catch (err) {
      console.error("Error loading machine data:", err);
      setError("Failed to load machine downtime data");
      
      // Use fallback data on error
      const sortedFallbackData = sortData(FALLBACK_DATA, sortOrder, sortBy);
      setData(sortedFallbackData);
    } finally {
      setIsLoading(false);
    }
  }, [filters, sortOrder, sortBy, sortData]);

  // Load data when component mounts or dependencies change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle sort order change
  const toggleSortOrder = () => {
    setSortOrder(current => current === 'desc' ? 'asc' : 'desc');
  };

  // Handle sort field change
  const handleSortByChange = (field) => {
    setSortBy(field);
  };

  // Handle bar hover
  const handleMouseEnter = (_, index) => {
    setHoveredBar(index);
  };

  const handleMouseLeave = () => {
    setHoveredBar(null);
  };

  // Format duration for display
  const formatDuration = (minutes) => {
    if (!minutes && minutes !== 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Get color for bar based on index and hover state
  const getBarFill = (index) => {
    // Base color from predefined array
    const baseColor = COLORS[index % COLORS.length];
    
    // Highlight hovered bar
    if (hoveredBar === index) {
      return COLORS[(index + 4) % COLORS.length]; // Different color for highlighting
    }
    
    return baseColor;
  };

  // Handle retry button click
  const handleRetry = () => {
    loadData();
  };

  // Custom tooltip component
  const renderCustomTooltip = (props) => {
    const { active, payload } = props;
    
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-sm">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-gray-600">ID: {data.machine_id}</p>
          <p className="text-sm text-gray-600">Downtime: {formatDuration(data.total_downtime)}</p>
          <p className="text-sm text-gray-600">Incidents: {data.incident_count}</p>
          <p className="text-sm text-gray-600">Average: {formatDuration(data.avg_downtime)}</p>
        </div>
      );
    }
    
    return null;
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Machine Downtime</h2>
        </div>
        <div className="flex justify-center items-center" style={{ height: `${height}px` }}>
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

  // Calculate totals for summary
  const totalDowntime = data.reduce((sum, item) => sum + item.total_downtime, 0);
  const totalIncidents = data.reduce((sum, item) => sum + item.incident_count, 0);
  const avgDowntime = totalIncidents > 0 ? totalDowntime / totalIncidents : 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <h2 className="text-lg font-semibold">Machine Downtime</h2>
        <div className="flex space-x-4 mt-2 sm:mt-0">
          <div className="flex space-x-1">
            <button
              className={`px-2 py-1 text-xs rounded ${sortBy === 'total_downtime' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              onClick={() => handleSortByChange('total_downtime')}
            >
              Total
            </button>
            <button
              className={`px-2 py-1 text-xs rounded ${sortBy === 'incident_count' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              onClick={() => handleSortByChange('incident_count')}
            >
              Incidents
            </button>
            <button
              className={`px-2 py-1 text-xs rounded ${sortBy === 'avg_downtime' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              onClick={() => handleSortByChange('avg_downtime')}
            >
              Average
            </button>
          </div>
          <button 
            onClick={toggleSortOrder}
            className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 flex items-center"
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
      
      <div style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" />
            <YAxis 
              type="category" 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              width={120}
            />
            <Tooltip content={renderCustomTooltip} />
            <Legend />
            <Bar 
              dataKey={sortBy}
              name={sortBy === 'total_downtime' ? 'Total Downtime (min)' : sortBy === 'incident_count' ? 'Incidents' : 'Average Downtime (min)'}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarFill(index)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="text-center p-2 bg-blue-50 rounded">
          <p className="text-sm text-gray-600">Total Downtime</p>
          <p className="font-semibold">{formatDuration(totalDowntime)}</p>
        </div>
        <div className="text-center p-2 bg-blue-50 rounded">
          <p className="text-sm text-gray-600">Total Incidents</p>
          <p className="font-semibold">{totalIncidents}</p>
        </div>
        <div className="text-center p-2 bg-blue-50 rounded">
          <p className="text-sm text-gray-600">Average per Incident</p>
          <p className="font-semibold">{formatDuration(avgDowntime)}</p>
        </div>
      </div>
    </div>
  );
};

export default MachineDowntimeChart;