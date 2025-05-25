<?php
namespace App\Repositories;

use App\Models\Machine;
use App\Models\Downtime;
use App\Models\ErrorCode;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class MaintenanceRepository
{
    /**
     * Sauvegarde les données de maintenance extraites des fichiers XML.
     */
    public function saveMaintenanceData(array $data)
    {
        try {
            return DB::transaction(function () use ($data) {
                // Enregistrer ou mettre à jour les machines
                if (isset($data['machines']) && is_array($data['machines'])) {
                    foreach ($data['machines'] as $machineId => $machineName) {
                        if (!empty($machineId) && !empty($machineName)) {
                            Machine::updateOrCreate(
                                ['machine_id' => $machineId],
                                ['name' => $machineName]
                            );
                        }
                    }
                }
                
                // Enregistrer les temps d'arrêt
                if (isset($data['downtimes']) && is_array($data['downtimes'])) {
                    foreach ($data['downtimes'] as $downtimeData) {
                        if (empty($downtimeData['id'])) {
                            continue; // Ignorer si pas d'ID
                        }
                        
                        // Assurer que les dates sont correctement formatées
                        $startTime = $downtimeData['start_time'] ?? null;
                        $endTime = $downtimeData['end_time'] ?? null;
                        
                        // Si les dates ne sont pas disponibles, utiliser les dates du rapport
                        if (!$startTime && isset($data['reportInfo']['fromDate'])) {
                            $startTime = $data['reportInfo']['fromDate'];
                        }
                        
                        if (!$endTime && isset($data['reportInfo']['toDate'])) {
                            $endTime = $data['reportInfo']['toDate'];
                        }
                        
                        // Valider les données minimales requises
                        if (empty($downtimeData['machine_id']) || empty($downtimeData['duration_minutes'])) {
                            continue;
                        }
                        
                        Downtime::updateOrCreate(
                            ['downtime_id' => $downtimeData['id']],
                            [
                                'machine_id' => $downtimeData['machine_id'],
                                'start_time' => $startTime ?: now(),
                                'end_time' => $endTime ?: now(),
                                'duration_minutes' => $downtimeData['duration_minutes'],
                                'error_code' => $downtimeData['error_code'] ?? '',
                                'error_type' => $downtimeData['error_type'] ?? '',
                                'description' => $downtimeData['description'] ?? ''
                            ]
                        );
                    }
                }
                
                // Enregistrer ou mettre à jour les codes d'erreur
                if (isset($data['errorCodes']) && is_array($data['errorCodes'])) {
                    foreach ($data['errorCodes'] as $errorCodeData) {
                        if (empty($errorCodeData['code'])) {
                            continue;
                        }
                        
                        ErrorCode::updateOrCreate(
                            ['code' => $errorCodeData['code']],
                            [
                                'type' => $errorCodeData['type'] ?? '',
                                'category' => $errorCodeData['location'] ?? null,
                                'description' => $errorCodeData['description'] ?? null,
                                'is_critical' => false
                            ]
                        );
                    }
                }
                
                return true;
            });
        } catch (\Exception $e) {
            Log::error('Erreur saveMaintenanceData: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Récupère les statistiques de maintenance filtrées
     */
    public function getMaintenanceStats($filters = [])
    {
        try {
            $query = Downtime::query()
                ->join('machines', 'downtimes.machine_id', '=', 'machines.machine_id');
                
            $this->applyFilters($query, $filters);
            
            // Statistiques par machine
            $statsByMachine = $query->clone()
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
                
            // Statistiques par type d'erreur
            $statsByErrorType = Downtime::query()
                ->select(
                    'error_type', 
                    DB::raw('SUM(duration_minutes) as total_downtime'), 
                    DB::raw('COUNT(*) as incident_count'),
                    DB::raw('AVG(duration_minutes) as avg_downtime')
                )
                ->whereNotNull('error_type')
                ->where('error_type', '!=', '')
                ->groupBy('error_type')
                ->orderBy('total_downtime', 'desc')
                ->get();
                
            // Évolution temporelle
            $timeEvolution = Downtime::query()
                ->select(
                    DB::raw('DATE(start_time) as date'), 
                    DB::raw('SUM(duration_minutes) as total_downtime'),
                    DB::raw('COUNT(*) as incident_count')
                )
                ->groupBy(DB::raw('DATE(start_time)'))
                ->orderBy('date')
                ->get();
                
            $totalIncidents = Downtime::count();
            $totalDowntime = Downtime::sum('duration_minutes') ?? 0;
                
            return [
                'by_machine' => $statsByMachine,
                'by_error_type' => $statsByErrorType,
                'time_evolution' => $timeEvolution,
                'total_incidents' => $totalIncidents,
                'total_downtime' => $totalDowntime
            ];
        } catch (\Exception $e) {
            Log::error('Erreur getMaintenanceStats: ' . $e->getMessage());
            return [
                'by_machine' => collect(),
                'by_error_type' => collect(),
                'time_evolution' => collect(),
                'total_incidents' => 0,
                'total_downtime' => 0
            ];
        }
    }
    
    /**
     * Obtient des statistiques agrégées par période
     */
    public function getStatsByPeriod($period = 'day', $filters = [])
    {
        try {
            // Définir le format de regroupement en fonction de la période
            switch ($period) {
                case 'day':
                    $groupFormat = 'DATE(start_time)';
                    $labelFormat = 'DATE(start_time)';
                    break;
                case 'week':
                    $groupFormat = 'YEARWEEK(start_time, 3)';
                    $labelFormat = "CONCAT('Semaine ', WEEK(start_time, 3), ', ', YEAR(start_time))";
                    break;
                case 'month':
                    $groupFormat = 'DATE_FORMAT(start_time, "%Y-%m")';
                    $labelFormat = "DATE_FORMAT(start_time, '%M %Y')";
                    break;
                case 'year':
                    $groupFormat = 'YEAR(start_time)';
                    $labelFormat = 'YEAR(start_time)';
                    break;
                default:
                    $groupFormat = 'DATE(start_time)';
                    $labelFormat = 'DATE(start_time)';
            }
            
            $query = Downtime::query();
            $this->applyFilters($query, $filters);
            
            $stats = $query->select(
                    DB::raw($groupFormat . ' as period_value'),
                    DB::raw($labelFormat . ' as period_label'),
                    DB::raw('SUM(duration_minutes) as total_downtime'),
                    DB::raw('COUNT(*) as incident_count'),
                    DB::raw('AVG(duration_minutes) as avg_downtime')
                )
                ->groupBy(DB::raw($groupFormat))
                ->orderBy(DB::raw($groupFormat))
                ->get();
            
            $totalIncidents = $stats->sum('incident_count');
            $totalDowntime = $stats->sum('total_downtime');
            $avgDowntime = $totalIncidents > 0 ? $totalDowntime / $totalIncidents : 0;
            
            return [
                'stats' => $stats,
                'period' => $period,
                'total_incidents' => $totalIncidents,
                'total_downtime' => $totalDowntime,
                'avg_downtime' => $avgDowntime
            ];
        } catch (\Exception $e) {
            Log::error('Erreur getStatsByPeriod: ' . $e->getMessage());
            return [
                'stats' => collect(),
                'period' => $period,
                'total_incidents' => 0,
                'total_downtime' => 0,
                'avg_downtime' => 0
            ];
        }
    }
    
    /**
     * Récupère les tendances d'arrêt pour la comparaison de périodes
     */
    public function getDowntimeTrends($currentPeriod = 'month')
    {
        try {
            $now = Carbon::now();
            
            switch ($currentPeriod) {
                case 'week':
                    $currentStart = Carbon::now()->startOfWeek();
                    $previousStart = Carbon::now()->subWeek()->startOfWeek();
                    $previousEnd = $currentStart->copy()->subSecond();
                    break;
                case 'month':
                    $currentStart = Carbon::now()->startOfMonth();
                    $previousStart = Carbon::now()->subMonth()->startOfMonth();
                    $previousEnd = $currentStart->copy()->subSecond();
                    break;
                case 'quarter':
                    $currentStart = Carbon::now()->startOfQuarter();
                    $previousStart = Carbon::now()->subQuarter()->startOfQuarter();
                    $previousEnd = $currentStart->copy()->subSecond();
                    break;
                case 'year':
                    $currentStart = Carbon::now()->startOfYear();
                    $previousStart = Carbon::now()->subYear()->startOfYear();
                    $previousEnd = $currentStart->copy()->subSecond();
                    break;
                default:
                    $currentStart = Carbon::now()->startOfMonth();
                    $previousStart = Carbon::now()->subMonth()->startOfMonth();
                    $previousEnd = $currentStart->copy()->subSecond();
            }
            
            // Statistiques pour la période actuelle
            $currentStats = Downtime::where('start_time', '>=', $currentStart)
                ->select(
                    DB::raw('COUNT(*) as incident_count'),
                    DB::raw('SUM(duration_minutes) as total_downtime')
                )
                ->first();
            
            // Statistiques pour la période précédente
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
            
            return [
                'current_period' => [
                    'start_date' => $currentStart->format('Y-m-d'),
                    'incident_count' => $currentStats->incident_count ?? 0,
                    'total_downtime' => $currentStats->total_downtime ?? 0,
                    'avg_downtime' => ($currentStats->incident_count ?? 0) > 0 ? ($currentStats->total_downtime ?? 0) / ($currentStats->incident_count ?? 1) : 0
                ],
                'previous_period' => [
                    'start_date' => $previousStart->format('Y-m-d'),
                    'end_date' => $previousEnd->format('Y-m-d'),
                    'incident_count' => $previousStats->incident_count ?? 0,
                    'total_downtime' => $previousStats->total_downtime ?? 0,
                    'avg_downtime' => ($previousStats->incident_count ?? 0) > 0 ? ($previousStats->total_downtime ?? 0) / ($previousStats->incident_count ?? 1) : 0
                ],
                'variation' => [
                    'incident' => round($incidentVariation, 2),
                    'downtime' => round($downtimeVariation, 2)
                ],
                'period' => $currentPeriod
            ];
        } catch (\Exception $e) {
            Log::error('Erreur getDowntimeTrends: ' . $e->getMessage());
            return [
                'current_period' => [
                    'start_date' => Carbon::now()->startOfMonth()->format('Y-m-d'),
                    'incident_count' => 0,
                    'total_downtime' => 0,
                    'avg_downtime' => 0
                ],
                'previous_period' => [
                    'start_date' => Carbon::now()->subMonth()->startOfMonth()->format('Y-m-d'),
                    'end_date' => Carbon::now()->startOfMonth()->subDay()->format('Y-m-d'),
                    'incident_count' => 0,
                    'total_downtime' => 0,
                    'avg_downtime' => 0
                ],
                'variation' => [
                    'incident' => 0,
                    'downtime' => 0
                ],
                'period' => $currentPeriod
            ];
        }
    }
    
    /**
     * Appliquer les filtres à une requête
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