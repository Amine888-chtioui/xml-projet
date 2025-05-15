<?php
namespace App\Http\Controllers;

use App\Models\Downtime;
use App\Models\Machine;
use App\Models\XmlReport;
use App\Repositories\MaintenanceRepository;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class MaintenanceStatsController extends Controller
{
    protected $maintenanceRepository;

    public function __construct(MaintenanceRepository $maintenanceRepository)
    {
        $this->maintenanceRepository = $maintenanceRepository;
    }

    /**
     * Récupérer les statistiques globales de maintenance
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getStats(Request $request)
    {
        // Récupérer les filtres de la requête
        $filters = $this->getFiltersFromRequest($request);
        
        try {
            // Utiliser le repository pour obtenir les statistiques
            $stats = $this->maintenanceRepository->getMaintenanceStats($filters);
            
            return response()->json($stats);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Récupérer un résumé des statistiques pour le dashboard
     *
     * @return \Illuminate\Http\JsonResponse
     */
    /**
 * Récupérer un résumé des statistiques pour le dashboard
 *
 * @return \Illuminate\Http\JsonResponse
 */
public function getSummary()
{
    try {
        $totalIncidents = Downtime::count();
        $totalDowntime = Downtime::sum('duration_minutes');
        $avgDowntime = $totalIncidents > 0 ? $totalDowntime / $totalIncidents : 0;
        $lastUpdated = XmlReport::max('created_at');
        
        // Si aucune donnée n'est trouvée, utiliser des données de démonstration
        if ($totalIncidents === 0) {
            $summary = [
                'total_incidents' => 42, // Exemple de données
                'total_downtime' => 2550, // 42.5 heures
                'total_machines' => 8,
                'avg_downtime' => 60.7, // ~1 heure par incident
                'last_updated' => now()->toDateTimeString(),
                'is_demo_data' => true // Indiquer que ce sont des données de démonstration
            ];
        } else {
            $summary = [
                'total_incidents' => $totalIncidents,
                'total_downtime' => $totalDowntime,
                'total_machines' => Machine::count(),
                'avg_downtime' => $avgDowntime,
                'last_updated' => $lastUpdated,
                'is_demo_data' => false
            ];
        }
        
        return response()->json($summary);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la récupération du résumé: ' . $e->getMessage()
        ], 500);
    }
}
    
    /**
     * Récupérer la liste des machines
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getMachines()
    {
        try {
            $machines = Machine::select('machine_id as id', 'name')
                ->orderBy('name')
                ->get();
                
            return response()->json($machines);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des machines: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Récupérer la liste des types d'erreur
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getErrorTypes()
    {
        try {
            $errorTypes = Downtime::select('error_type as id', 'error_type as name')
                ->distinct()
                ->orderBy('error_type')
                ->get();
                
            return response()->json($errorTypes);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des types d\'erreur: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Récupérer l'évolution temporelle des arrêts
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getTimeEvolution(Request $request)
    {
        try {
            $filters = $this->getFiltersFromRequest($request);
            
            // Construire la requête de base
            $query = Downtime::query();
            
            // Appliquer les filtres
            $this->applyFilters($query, $filters);
            
            // Regrouper par jour
            $timeEvolution = $query->select(
                    DB::raw('DATE(start_time) as date'),
                    DB::raw('SUM(duration_minutes) as total_downtime'),
                    DB::raw('COUNT(*) as incident_count')
                )
                ->groupBy(DB::raw('DATE(start_time)'))
                ->orderBy('date')
                ->get();
                
            return response()->json($timeEvolution);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de l\'évolution temporelle: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Récupérer les statistiques par machine
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getStatsByMachine(Request $request)
    {
        try {
            $filters = $this->getFiltersFromRequest($request);
            
            // Construire la requête de base
            $query = Downtime::query()
                ->join('machines', 'downtimes.machine_id', '=', 'machines.machine_id');
                
            // Appliquer les filtres
            $this->applyFilters($query, $filters);
            
            // Statistiques par machine
            $statsByMachine = $query
                ->select(
                    'machines.machine_id',
                    'machines.name',
                    DB::raw('SUM(duration_minutes) as total_downtime'),
                    DB::raw('COUNT(*) as incident_count'),
                    DB::raw('AVG(duration_minutes) as avg_downtime')
                )
                ->groupBy('machines.machine_id', 'machines.name')
                ->orderBy('total_downtime', 'desc')
                ->get();
                
            return response()->json($statsByMachine);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques par machine: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Récupérer les statistiques par type d'erreur
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getStatsByErrorType(Request $request)
    {
        try {
            $filters = $this->getFiltersFromRequest($request);
            
            // Construire la requête de base
            $query = Downtime::query();
                
            // Appliquer les filtres
            $this->applyFilters($query, $filters);
            
            // Statistiques par type d'erreur
            $statsByErrorType = $query
                ->select(
                    'error_type',
                    DB::raw('SUM(duration_minutes) as total_downtime'),
                    DB::raw('COUNT(*) as incident_count'),
                    DB::raw('AVG(duration_minutes) as avg_downtime')
                )
                ->groupBy('error_type')
                ->orderBy('total_downtime', 'desc')
                ->get();
                
            return response()->json($statsByErrorType);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques par type d\'erreur: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Récupérer les problèmes critiques
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getCriticalIssues(Request $request)
    {
        try {
            $filters = $this->getFiltersFromRequest($request);
            
            // Seuil de temps d'arrêt considéré comme critique (en minutes)
            $criticalThreshold = $request->input('threshold', 120); // 2 heures par défaut
            
            // Construire la requête de base
            $query = Downtime::query()
                ->join('machines', 'downtimes.machine_id', '=', 'machines.machine_id')
                ->where('duration_minutes', '>=', $criticalThreshold);
                
            // Appliquer les filtres
            $this->applyFilters($query, $filters);
            
            // Récupérer les incidents critiques
            $criticalIssues = $query
                ->select(
                    'downtimes.id',
                    'downtimes.downtime_id',
                    'machines.name as machine_name',
                    'downtimes.start_time',
                    'downtimes.end_time',
                    'downtimes.duration_minutes',
                    'downtimes.error_code',
                    'downtimes.error_type',
                    'downtimes.description'
                )
                ->orderBy('duration_minutes', 'desc')
                ->limit(10)
                ->get();
                
            return response()->json($criticalIssues);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des problèmes critiques: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Récupérer les statistiques pour le tableau de bord
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getDashboardStats()
    {
        try {
            // Statistiques globales
            $summary = $this->getSummary()->original;
            
            // Top 5 machines avec le plus de temps d'arrêt
            $topMachines = Downtime::query()
                ->join('machines', 'downtimes.machine_id', '=', 'machines.machine_id')
                ->select(
                    'machines.name',
                    DB::raw('SUM(duration_minutes) as total_downtime'),
                    DB::raw('COUNT(*) as incident_count')
                )
                ->groupBy('machines.name')
                ->orderBy('total_downtime', 'desc')
                ->limit(5)
                ->get();
                
            // Top 5 types d'erreur
            $topErrorTypes = Downtime::query()
                ->select(
                    'error_type',
                    DB::raw('SUM(duration_minutes) as total_downtime'),
                    DB::raw('COUNT(*) as incident_count')
                )
                ->groupBy('error_type')
                ->orderBy('total_downtime', 'desc')
                ->limit(5)
                ->get();
                
            // Évolution des arrêts sur les 30 derniers jours
            $thirtyDaysAgo = Carbon::now()->subDays(30)->startOfDay();
            
            $timeEvolution = Downtime::where('start_time', '>=', $thirtyDaysAgo)
                ->select(
                    DB::raw('DATE(start_time) as date'),
                    DB::raw('SUM(duration_minutes) as total_downtime')
                )
                ->groupBy(DB::raw('DATE(start_time)'))
                ->orderBy('date')
                ->get();
                
            return response()->json([
                'summary' => $summary,
                'by_machine' => $topMachines,
                'by_error_type' => $topErrorTypes,
                'time_evolution' => $timeEvolution
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques du tableau de bord: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Récupérer les indicateurs de performance
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getPerformanceIndicators(Request $request)
    {
        try {
            $period = $request->input('period', 'month'); // 'week', 'month', 'quarter', 'year'
            
            // Utiliser le repository pour obtenir les tendances d'arrêt
            $trends = $this->maintenanceRepository->getDowntimeTrends($period);
            
            return response()->json($trends);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des indicateurs de performance: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Obtenir des statistiques par période temporelle (jour, semaine, mois, année)
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getStatsByPeriod(Request $request)
    {
        try {
            $period = $request->input('period', 'day'); // 'day', 'week', 'month', 'year'
            $filters = $this->getFiltersFromRequest($request);
            
            // Obtenir les statistiques par période
            $stats = $this->maintenanceRepository->getStatsByPeriod($period, $filters);
            
            return response()->json($stats);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques par période: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Extraire les filtres de la requête
     *
     * @param Request $request
     * @return array
     */
    protected function getFiltersFromRequest(Request $request)
    {
        return [
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
            'machine_id' => $request->input('machine_id'),
            'error_type' => $request->input('error_type'),
            'error_code' => $request->input('error_code'),
        ];
    }
    
    /**
     * Appliquer les filtres à la requête
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param array $filters
     * @return void
     */
    protected function applyFilters($query, $filters)
    {
        if (!empty($filters['start_date'])) {
            $query->where('start_time', '>=', $filters['start_date']);
        }
        
        if (!empty($filters['end_date'])) {
            $query->where('end_time', '<=', $filters['end_date']);
        }
        
        if (!empty($filters['machine_id'])) {
            $query->where('downtimes.machine_id', $filters['machine_id']);
        }
        
        if (!empty($filters['error_type'])) {
            $query->where('error_type', $filters['error_type']);
        }
        
        if (!empty($filters['error_code'])) {
            $query->where('error_code', $filters['error_code']);
        }
    }
}