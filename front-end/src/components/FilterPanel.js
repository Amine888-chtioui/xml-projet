// src/components/FilterPanel.js
import React, { useState, useEffect } from 'react';
import { statsService } from '../services/api';

const FilterPanel = ({ onFilterChange, isCollapsed, onToggleCollapse }) => {
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [machineFilter, setMachineFilter] = useState('');
  const [errorTypeFilter, setErrorTypeFilter] = useState('');
  const [machines, setMachines] = useState([]);
  const [errorTypes, setErrorTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFilterOptions = async () => {
      setIsLoading(true);
      
      // Données de démonstration pour les machines
      const defaultMachines = [
        { id: 'ALPHA 158', name: 'Komax Alpha 355' },
        { id: 'ALPHA 61', name: 'Komax Alpha 355' },
        { id: 'ALPHA 23', name: 'Komax Alpha 550' },
        { id: 'ALPHA 22', name: 'Komax Alpha 550' },
        { id: 'ALPHA 149', name: 'Komax Alpha 355' },
        { id: 'ALPHA 62', name: 'Komax Alpha 355' },
        { id: 'ALPHA 133', name: 'Komax Alpha 355' },
        { id: 'KAPPA03', name: 'Komax Kappa 330' }
      ];
      
      // Données de démonstration pour les types d'erreur
      const defaultErrorTypes = [
        { id: '1 Mechanical', name: 'Mécanique' },
        { id: '2 Electrical', name: 'Électrique' },
        { id: '3 Pneumatic', name: 'Pneumatique' },
        { id: '6 Maintenance', name: 'Maintenance' },
        { id: '7 Inspection', name: 'Inspection' }
      ];
      
      try {
        // Charger les machines
        try {
          const machinesResponse = await statsService.getMachines();
          if (machinesResponse?.data && machinesResponse.data.length > 0) {
            setMachines(machinesResponse.data);
          } else {
            setMachines(defaultMachines);
          }
        } catch (machineError) {
          console.error('Erreur lors du chargement des machines:', machineError);
          setMachines(defaultMachines);
        }

        // Charger les types d'erreur
        try {
          const errorTypesResponse = await statsService.getErrorTypes();
          if (errorTypesResponse?.data && errorTypesResponse.data.length > 0) {
            setErrorTypes(errorTypesResponse.data);
          } else {
            setErrorTypes(defaultErrorTypes);
          }
        } catch (errorTypeError) {
          console.error('Erreur lors du chargement des types d\'erreur:', errorTypeError);
          setErrorTypes(defaultErrorTypes);
        }
      } catch (error) {
        console.error('Erreur générale lors du chargement des options de filtre:', error);
        // Utiliser les données par défaut
        setMachines(defaultMachines);
        setErrorTypes(defaultErrorTypes);
      } finally {
        setIsLoading(false);
      }
    };

    loadFilterOptions();

    // Initialiser les dates par défaut (7 derniers jours)
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    
    setDateRange({
      startDate: weekAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    });

  }, []);

  const handleFilterApply = () => {
    const filters = {
      start_date: dateRange.startDate || undefined,
      end_date: dateRange.endDate || undefined,
      machine_id: machineFilter || undefined,
      error_type: errorTypeFilter || undefined
    };

    onFilterChange(filters);
  };

  const handleReset = () => {
    // Réinitialiser les filtres
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    
    setDateRange({
      startDate: weekAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    });
    setMachineFilter('');
    setErrorTypeFilter('');

    // Appliquer les filtres réinitialisés
    onFilterChange({
      start_date: weekAgo.toISOString().split('T')[0],
      end_date: today.toISOString().split('T')[0]
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Filtres</h2>
        <button 
          className="text-blue-600 hover:text-blue-800 focus:outline-none"
          onClick={onToggleCollapse}
        >
          {isCollapsed ? 'Développer' : 'Réduire'}
        </button>
      </div>

      {!isCollapsed && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Filtre de plage de dates */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            />
          </div>

          {/* Filtre de machine */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Machine</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={machineFilter}
              onChange={(e) => setMachineFilter(e.target.value)}
            >
              <option value="">Toutes les machines</option>
              {machines.map((machine) => (
                <option key={machine.id} value={machine.id}>
                  {machine.name} ({machine.id})
                </option>
              ))}
            </select>
          </div>

          {/* Filtre de type d'erreur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type d'erreur</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={errorTypeFilter}
              onChange={(e) => setErrorTypeFilter(e.target.value)}
            >
              <option value="">Tous les types</option>
              {errorTypes.map((errorType) => (
                <option key={errorType.id} value={errorType.id}>
                  {errorType.name || errorType.id}
                </option>
              ))}
            </select>
          </div>

          {/* Boutons d'action */}
          <div className="md:col-span-2 lg:col-span-4 flex justify-end gap-2 mt-2">
            <button
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              onClick={handleReset}
            >
              Réinitialiser
            </button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={handleFilterApply}
              disabled={isLoading}
            >
              {isLoading ? 'Chargement...' : 'Appliquer les filtres'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;