<?php
namespace App\Http\Controllers;

use App\Models\Downtime;
use App\Models\Machine;
use App\Models\XmlReport;
use App\Models\ErrorCode;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class MaintenanceStatsController extends Controller
{
    /**
     * Récupérer un résumé des statistiques - TOUJOURS LES VRAIES DONNÉES
     */
    public function getSummary()
    {
        try {
            Log::info('Getting summary statistics...');
            
            // Compter directement depuis la base de données
            $totalIncidents = Downtime::count();
            $totalDowntime = Downtime::sum('duration_minutes') ?? 0;
            $totalMachines = Machine::count();
            $avgDowntime = $totalIncidents > 0 ? round($totalDowntime / $totalIncidents, 2) : 0;
            $lastUpdated = XmlReport::max('created_at') ?? now();
            
            Log::info("Summary calculated", [
                'total_incidents' => $totalIncidents,
                'total_downtime' => $totalDowntime,
                'total_machines' => $totalMachines,
                'avg_downtime' => $avgDowntime
            ]);
            
            $summary = [
                'total_incidents' => (int)$totalIncidents,
                'total_downtime' => (int)$totalDowntime,
                'total_machines' => (int)$totalMachines,
                'avg_downtime' => (float)$avgDowntime,
                'last_updated' => $lastUpdated,
                'is_demo_data' => false
            ];
            
            return response()->json([
                'success' => true,
                'data' => $summary
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error in getSummary: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération du résumé',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Récupérer la liste des machines - TOUJOURS LES VRAIES DONNÉES
     */
    public function getMachines()
    {
        try {
            Log::info('Getting machines list...');
            
            $machines = Machine::select('machine_id as id', 'name')
                ->orderBy('name')
                ->get();
                
            Log::info("Found machines", ['count' => $machines->count()]);
                
            return response()->json([
                'success' => true,
                'data' => $machines
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error in getMachines: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des machines',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Récupérer la liste des types d'erreur - TOUJOURS LES VRAIES DONNÉES
     */
    public function getErrorTypes()
    {
        try {
            Log::info('Getting error types...');
            
            $errorTypes = Downtime::select('error_type as id', 'error_type as name')
                ->distinct()
                ->whereNotNull('error_type')
                ->where('error_type', '!=', '')
                ->orderBy('error_type')
                ->get();
                
            Log::info("Found error types", ['count' => $errorTypes->count()]);
                
            return response()->json([
                'success' => true,
                'data' => $errorTypes
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error in getErrorTypes: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des types d\'erreur',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Récupérer les codes d'erreur - TOUJOURS LES VRAIES DONNÉES
     */
    public function getErrorCodes()
    {
        try {
            Log::info('Getting error codes...');
            
            // Essayer d'abord depuis la table error_codes
            $errorCodes = ErrorCode::select('code as id', 'type as name')
                ->orderBy('code')
                ->get();
                
            // Si vide, prendre depuis downtimes
            if ($errorCodes->isEmpty()) {
                $errorCodes = Downtime::select('error_code as id', 'error_code as name')
                    ->distinct()
                    ->whereNotNull('error_code')
                    ->where('error_code', '!=', '')
                    ->orderBy('error_code')
                    ->get();
            }
                
            Log::info("Found error codes", ['count' => $errorCodes->count()]);
                
            return response()->json([
                'success' => true,
                'data' => $errorCodes
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error in getErrorCodes: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des codes d\'erreur',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Récupérer l'évolution temporelle - TOUJOURS LES VRAIES DONNÉES
     */
    public function getTimeEvolution(Request $request)
    {
        try {
            Log::info('Getting time evolution...');
            
            $query = Downtime::query();
            
            // Appliquer les filtres
            $this->applyFilters($query, $request);
            
            $timeEvolution = $query->select(
                    DB::raw('DATE(start_time) as date'),
                    DB::raw('SUM(duration_minutes) as total_downtime'),
                    DB::raw('COUNT(*) as incident_count')
                )
                ->groupBy(DB::raw('DATE(start_time)'))
                ->orderBy('date')
                ->get();
                
            Log::info("Time evolution data points", ['count' => $timeEvolution->count()]);
                
            return response()->json([
                'success' => true,
                'data' => $timeEvolution
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error in getTimeEvolution: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de l\'évolution temporelle',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Récupérer les statistiques par machine - TOUJOURS LES VRAIES DONNÉES
     */
    public function getStatsByMachine(Request $request)
    {
        try {
            Log::info('Getting stats by machine...');
            
            $query = Downtime::join('machines', 'downtimes.machine_id', '=', 'machines.machine_id');
            
            // Appliquer les filtres
            $this->applyFilters($query, $request);
            
            $statsByMachine = $query->select(
                    'machines.machine_id',
                    'machines.name',
                    DB::raw('SUM(downtimes.duration_minutes) as total_downtime'),
                    DB::raw('COUNT(*) as incident_count'),
                    DB::raw('ROUND(AVG(downtimes.duration_minutes), 2) as avg_downtime')
                )
                ->groupBy('machines.machine_id', 'machines.name')
                ->orderBy('total_downtime', 'desc')
                ->get();
                
            Log::info("Stats by machine", ['count' => $statsByMachine->count()]);
                
            return response()->json([
                'success' => true,
                'data' => $statsByMachine
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error in getStatsByMachine: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques par machine',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Récupérer les statistiques par type d'erreur - TOUJOURS LES VRAIES DONNÉES
     */
    public function getStatsByErrorType(Request $request)
    {
        try {
            Log::info('Getting stats by error type...');
            
            $query = Downtime::query();
            
            // Appliquer les filtres
            $this->applyFilters($query, $request);
            
            $statsByErrorType = $query->select(
                    'error_type',
                    DB::raw('SUM(duration_minutes) as total_downtime'),
                    DB::raw('COUNT(*) as incident_count'),
                    DB::raw('ROUND(AVG(duration_minutes), 2) as avg_downtime')
                )
                ->whereNotNull('error_type')
                ->where('error_type', '!=', '')
                ->groupBy('error_type')
                ->orderBy('total_downtime', 'desc')
                ->get();
                
            Log::info("Stats by error type", ['count' => $statsByErrorType->count()]);
                
            return response()->json([
                'success' => true,
                'data' => $statsByErrorType
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error in getStatsByErrorType: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques par type d\'erreur',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Récupérer les statistiques pour le tableau de bord - TOUJOURS LES VRAIES DONNÉES
     */
    public function getDashboardStats()
    {
        try {
            Log::info('Getting dashboard stats...');
            
            // Récupérer le résumé
            $summaryResponse = $this->getSummary();
            $summary = $summaryResponse->original['data'] ?? [];
            
            // Top 5 machines
            $topMachines = Downtime::join('machines', 'downtimes.machine_id', '=', 'machines.machine_id')
                ->select(
                    'machines.name',
                    DB::raw('SUM(downtimes.duration_minutes) as total_downtime'),
                    DB::raw('COUNT(*) as incident_count')
                )
                ->groupBy('machines.name')
                ->orderBy('total_downtime', 'desc')
                ->limit(5)
                ->get();
                
            // Top 5 types d'erreur
            $topErrorTypes = Downtime::select(
                    'error_type',
                    DB::raw('SUM(duration_minutes) as total_downtime'),
                    DB::raw('COUNT(*) as incident_count')
                )
                ->whereNotNull('error_type')
                ->where('error_type', '!=', '')
                ->groupBy('error_type')
                ->orderBy('total_downtime', 'desc')
                ->limit(5)
                ->get();
                
            // Évolution temporelle (7 derniers jours)
            $timeEvolution = Downtime::where('start_time', '>=', Carbon::now()->subDays(7))
                ->select(
                    DB::raw('DATE(start_time) as date'),
                    DB::raw('SUM(duration_minutes) as total_downtime')
                )
                ->groupBy(DB::raw('DATE(start_time)'))
                ->orderBy('date')
                ->get();
                
            Log::info("Dashboard stats compiled", [
                'machines' => $topMachines->count(),
                'error_types' => $topErrorTypes->count(),
                'time_evolution' => $timeEvolution->count()
            ]);
                
            return response()->json([
                'success' => true,
                'data' => [
                    'summary' => $summary,
                    'by_machine' => $topMachines,
                    'by_error_type' => $topErrorTypes,
                    'time_evolution' => $timeEvolution
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error in getDashboardStats: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques du tableau de bord',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Récupérer les problèmes critiques
     */
    public function getCriticalIssues(Request $request)
    {
        try {
            $threshold = $request->input('threshold', 120); // 2 heures par défaut
            
            $criticalIssues = Downtime::join('machines', 'downtimes.machine_id', '=', 'machines.machine_id')
                ->where('duration_minutes', '>=', $threshold)
                ->select(
                    'downtimes.id',
                    'machines.name as machine_name',
                    'downtimes.start_time',
                    'downtimes.end_time',
                    'downtimes.duration_minutes',
                    'downtimes.error_code',
                    'downtimes.error_type',
                    'downtimes.description'
                )
                ->orderBy('duration_minutes', 'desc')
                ->limit(20)
                ->get();
                
            return response()->json([
                'success' => true,
                'data' => $criticalIssues
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error in getCriticalIssues: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des problèmes critiques',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Appliquer les filtres à une requête
     */
    private function applyFilters($query, $request)
    {
        if ($request->has('start_date') && $request->start_date) {
            $query->where('start_time', '>=', $request->start_date);
        }
        
        if ($request->has('end_date') && $request->end_date) {
            $query->where('end_time', '<=', $request->end_date);
        }
        
        if ($request->has('machine_id') && $request->machine_id) {
            $query->where('downtimes.machine_id', $request->machine_id);
        }
        
        if ($request->has('error_type') && $request->error_type) {
            $query->where('error_type', $request->error_type);
        }
        
        if ($request->has('error_code') && $request->error_code) {
            $query->where('error_code', $request->error_code);
        }
    }
    
    /**
     * Endpoint de test pour vérifier les données
     */
    public function testDatabase()
    {
        try {
            $totalDowntime = Downtime::sum('duration_minutes') ?? 0;
            $stats = [
                'machines_count' => Machine::count(),
                'downtimes_count' => Downtime::count(),
                'error_codes_count' => ErrorCode::count(),
                'xml_reports_count' => XmlReport::count(),
                'total_downtime' => $totalDowntime,
                'database_status' => 'connected',
                'timestamp' => now()->toISOString()
            ];
            
            // Quelques exemples de données
            $sampleMachine = Machine::first();
            $sampleDowntime = Downtime::first();
            
            $stats['sample_machine'] = $sampleMachine ? [
                'id' => $sampleMachine->machine_id,
                'name' => $sampleMachine->name
            ] : null;
            
            $stats['sample_downtime'] = $sampleDowntime ? [
                'id' => $sampleDowntime->downtime_id,
                'duration' => $sampleDowntime->duration_minutes,
                'error_type' => $sampleDowntime->error_type
            ] : null;
            
            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du test de la base de données',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Indicateurs de performance simplifiés
     */
    public function getPerformanceIndicators(Request $request)
    {
        try {
            $period = $request->input('period', 'month');
            
            // Période actuelle
            $currentStart = Carbon::now()->startOfMonth();
            $currentStats = Downtime::where('start_time', '>=', $currentStart)
                ->select(
                    DB::raw('COUNT(*) as incident_count'),
                    DB::raw('SUM(duration_minutes) as total_downtime')
                )
                ->first();
                
            // Période précédente
            $previousStart = Carbon::now()->subMonth()->startOfMonth();
            $previousEnd = $currentStart->copy()->subSecond();
            $previousStats = Downtime::where('start_time', '>=', $previousStart)
                ->where('start_time', '<=', $previousEnd)
                ->select(
                    DB::raw('COUNT(*) as incident_count'),
                    DB::raw('SUM(duration_minutes) as total_downtime')
                )
                ->first();
                
            // Calculer les variations
            $incidentVariation = 0;
            $downtimeVariation = 0;
            
            if ($previousStats && $previousStats->incident_count > 0) {
                $incidentVariation = (($currentStats->incident_count - $previousStats->incident_count) / $previousStats->incident_count) * 100;
            }
            
            if ($previousStats && $previousStats->total_downtime > 0) {
                $downtimeVariation = (($currentStats->total_downtime - $previousStats->total_downtime) / $previousStats->total_downtime) * 100;
            }
            
            return response()->json([
                'success' => true,
                'data' => [
                    'current_period' => [
                        'start_date' => $currentStart->format('Y-m-d'),
                        'incident_count' => $currentStats->incident_count ?? 0,
                        'total_downtime' => $currentStats->total_downtime ?? 0,
                        'avg_downtime' => ($currentStats->incident_count ?? 0) > 0 ? 
                            round(($currentStats->total_downtime ?? 0) / ($currentStats->incident_count ?? 1), 2) : 0
                    ],
                    'previous_period' => [
                        'start_date' => $previousStart->format('Y-m-d'),
                        'end_date' => $previousEnd->format('Y-m-d'),
                        'incident_count' => $previousStats->incident_count ?? 0,
                        'total_downtime' => $previousStats->total_downtime ?? 0,
                        'avg_downtime' => ($previousStats->incident_count ?? 0) > 0 ? 
                            round(($previousStats->total_downtime ?? 0) / ($previousStats->incident_count ?? 1), 2) : 0
                    ],
                    'variation' => [
                        'incident' => round($incidentVariation, 2),
                        'downtime' => round($downtimeVariation, 2)
                    ],
                    'period' => $period
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error in getPerformanceIndicators: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des indicateurs de performance',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}