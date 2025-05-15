import React, { useState, useEffect, useCallback } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend, 
  Sector 
} from 'recharts';
import { statsService } from '../services/api';

// Default fallback data if API fails
const FALLBACK_DATA = [
  { error_type: "6 Maintenance - 02 Wear", total_downtime: 300, incident_count: 1, avg_downtime: 300 },
  { error_type: "1 Mechanical - 02 Wear", total_downtime: 240, incident_count: 1, avg_downtime: 240 },
  { error_type: "1 Mechanical - 01 Breakage", total_downtime: 240, incident_count: 1, avg_downtime: 240 },
  { error_type: "2 Electrical - 02 Wear", total_downtime: 210, incident_count: 2, avg_downtime: 105 },
  { error_type: "7 Inspection - Preventive", total_downtime: 180, incident_count: 3, avg_downtime: 60 }
];

// Color scheme for chart
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#4CAF50', '#9C27B0', '#F44336'];

const ErrorTypePieChart = ({ filters = {}, height = 300 }) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [displayMode, setDisplayMode] = useState('downtime'); // 'downtime', 'incidents', or 'average'

  // Load data from API
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get error type statistics based on filters
      const response = await statsService.getStatsByErrorType(filters);
      
      if (response?.data?.data && response.data.data.length > 0) {
        // Format data for display
        const formattedData = response.data.data.map(item => ({
          name: item.error_type,
          value: displayMode === 'downtime' ? item.total_downtime : 
                 displayMode === 'incidents' ? item.incident_count : 
                 item.avg_downtime,
          total_downtime: item.total_downtime,
          incident_count: item.incident_count,
          avg_downtime: item.avg_downtime
        })).sort((a, b) => b.value - a.value);
        
        setData(formattedData);
      } else {
        // Use fallback data if no data received
        const formattedFallbackData = FALLBACK_DATA.map(item => ({
          name: item.error_type,
          value: displayMode === 'downtime' ? item.total_downtime : 
                 displayMode === 'incidents' ? item.incident_count : 
                 item.avg_downtime,
          total_downtime: item.total_downtime,
          incident_count: item.incident_count,
          avg_downtime: item.avg_downtime
        })).sort((a, b) => b.value - a.value);
        
        setData(formattedFallbackData);
      }
    } catch (err) {
      console.error("Error loading error type data:", err);
      setError("Failed to load error type data");
      
      // Use fallback data on error
      const formattedFallbackData = FALLBACK_DATA.map(item => ({
        name: item.error_type,
        value: displayMode === 'downtime' ? item.total_downtime : 
               displayMode === 'incidents' ? item.incident_count : 
               item.avg_downtime,
        total_downtime: item.total_downtime,
        incident_count: item.incident_count,
        avg_downtime: item.avg_downtime
      })).sort((a, b) => b.value - a.value);
      
      setData(formattedFallbackData);
    } finally {
      setIsLoading(false);
    }
  }, [filters, displayMode]);

  // Load data when component mounts or dependencies change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle pie section click
  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  // Format duration for display
  const formatDuration = (minutes) => {
    if (!minutes && minutes !== 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Handle display mode change
  const handleDisplayModeChange = (mode) => {
    setDisplayMode(mode);
  };

  // Handle retry button click
  const handleRetry = () => {
    loadData();
  };

  // Render active shape with additional details
  const renderActiveShape = (props) => {
    const RADIAN = Math.PI / 180;
    const { 
      cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
      fill, payload, percent, value 
    } = props;
    
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
          {payload.name.length > 20 ? payload.name.substring(0, 17) + '...' : payload.name}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">
          {displayMode === 'downtime' 
            ? formatDuration(value) 
            : displayMode === 'incidents' 
              ? `${value} incident${value !== 1 ? 's' : ''}` 
              : formatDuration(value)}
        </text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
          {`(${(percent * 100).toFixed(0)}%)`}
        </text>
      </g>
    );
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-sm">
          <p className="font-medium">{data.name}</p>
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
          <h2 className="text-lg font-semibold">Error Type Distribution</h2>
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
          <h2 className="text-lg font-semibold">Error Type Distribution</h2>
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
          <h2 className="text-lg font-semibold">Error Type Distribution</h2>
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
        <h2 className="text-lg font-semibold">Error Type Distribution</h2>
        <div className="flex space-x-1 mt-2 sm:mt-0">
          <button
            className={`px-2 py-1 text-xs rounded ${displayMode === 'downtime' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            onClick={() => handleDisplayModeChange('downtime')}
          >
            Downtime
          </button>
          <button
            className={`px-2 py-1 text-xs rounded ${displayMode === 'incidents' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            onClick={() => handleDisplayModeChange('incidents')}
          >
            Incidents
          </button>
          <button
            className={`px-2 py-1 text-xs rounded ${displayMode === 'average' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            onClick={() => handleDisplayModeChange('average')}
          >
            Average
          </button>
        </div>
      </div>
      
      <div style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              onMouseEnter={onPieEnter}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
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
      
      <div className="mt-4 overflow-auto max-h-48">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error Type</th>
              <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Downtime</th>
              <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Incidents</th>
              <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Average</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr key={index} className={activeIndex === index ? 'bg-blue-50' : 'hover:bg-gray-50'} 
                  onMouseEnter={() => setActiveIndex(index)}
              >
                <td className="px-3 py-2 whitespace-nowrap text-xs">
                  <div className="flex items-center">
                    <span className="h-3 w-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    <span className="font-medium">{item.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatDuration(item.total_downtime)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{item.incident_count}</td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatDuration(item.avg_downtime)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ErrorTypePieChart;