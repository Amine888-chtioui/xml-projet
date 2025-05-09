// src/components/FilterPanel.js - Version finale corrigée
import React, { useState, useEffect, useRef } from 'react';
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
  const [apiError, setApiError] = useState(false);
  
  // Important : utiliser useRef pour éviter la boucle infinie
  const initialFilterApplied = useRef(false);

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

  // Initialiser les dates par défaut (7 derniers jours)
  useEffect(() => {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    
    const startDateStr = weekAgo.toISOString().split('T')[0];
    const endDateStr = today.toISOString().split('T')[0];
    
    setDateRange({
      startDate: startDateStr,
      endDate: endDateStr
    });
    
    // Appliquer les filtres initiaux une seule fois
    if (!initialFilterApplied.current) {
      onFilterChange({
        start_date: startDateStr,
        end_date: endDateStr
      });
      initialFilterApplied.current = true;
    }
  }, [onFilterChange]); // onFilterChange est une dépendance stable

  // Chargement des options de filtre
  useEffect(() => {
    const loadFilterOptions = async () => {
      setIsLoading(true);
      setApiError(false);
      
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
        setApiError(true);
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
        setApiError(true);
      }
      
      setIsLoading(false);
    };

    loadFilterOptions();
  }, []); // Ne pas inclure onFilterChange dans les dépendances ici

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
    
    const startDateStr = weekAgo.toISOString().split('T')[0];
    const endDateStr = today.toISOString().split('T')[0];
    
    setDateRange({
      startDate: startDateStr,
      endDate: endDateStr
    });
    setMachineFilter('');
    setErrorTypeFilter('');

    // Appliquer les filtres réinitialisés
    onFilterChange({
      start_date: startDateStr,
      end_date: endDateStr
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
              disabled={isLoading}
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
              disabled={isLoading}
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
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              onClick={handleReset}
              disabled={isLoading}
            >
              Réinitialiser
            </button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
              onClick={handleFilterApply}
              disabled={isLoading}
            >
              {isLoading ? 'Chargement...' : 'Appliquer les filtres'}
            </button>
          </div>
          
          {apiError && (
            <div className="col-span-full mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm">
              <p className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                Impossible de charger certaines options de filtre. Des valeurs par défaut sont utilisées.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterPanel;