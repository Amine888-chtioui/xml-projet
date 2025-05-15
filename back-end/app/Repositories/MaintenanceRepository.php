<?php
namespace App\Repositories;

use App\Models\Machine;
use App\Models\Downtime;
use App\Models\ErrorCode;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class MaintenanceRepository
{
    /**
     * Sauvegarde les données de maintenance extraites des fichiers XML.
     * Utilise updateOrCreate pour éviter les doublons lors de l'importation de plusieurs fichiers.
     *
     * @param array $data Les données extraites du fichier XML
     * @return bool
     */
    public function saveMaintenanceData(array $data)
    {
        // Utiliser une transaction pour assurer l'intégrité des données
        return DB::transaction(function () use ($data) {
            // Enregistrer ou mettre à jour les machines
            foreach ($data['machines'] as $machineId => $machineName) {
                Machine::updateOrCreate(
                    ['machine_id' => $machineId],
                    ['name' => $machineName]
                );
            }
            
            // Enregistrer les temps d'arrêt - Utiliser updateOrCreate pour éviter les doublons
            foreach ($data['downtimes'] as $downtimeData) {
                // Assurer que les dates sont correctement formatées
                $startTime = isset($downtimeData['start_time']) ? $downtimeData['start_time'] : null;
                $endTime = isset($downtimeData['end_time']) ? $downtimeData['end_time'] : null;
                
                // Si les dates ne sont pas disponibles, utiliser les dates du rapport
                if (!$startTime && isset($data['reportInfo']['fromDate'])) {
                    $startTime = $data['reportInfo']['fromDate'];
                }
                
                if (!$endTime && isset($data['reportInfo']['toDate'])) {
                    $endTime = $data['reportInfo']['toDate'];
                }
                
                Downtime::updateOrCreate(
                    ['downtime_id' => $downtimeData['id']],
                    [
                        'machine_id' => $downtimeData['machine_id'],
                        'start_time' => $startTime,
                        'end_time' => $endTime,
                        'duration_minutes' => $downtimeData['duration_minutes'],
                        'error_code' => $downtimeData['error_code'],
                        'error_type' => $downtimeData['error_type'],
                        'description' => $downtimeData['description']
                    ]
                );
            }
            
            // Enregistrer ou mettre à jour les codes d'erreur
            if (isset($data['errorCodes']) && is_array($data['errorCodes'])) {
                foreach ($data['errorCodes'] as $errorCodeKey => $errorCodeData) {
                    ErrorCode::updateOrCreate(
                        ['code' => $errorCodeData['code']],
                        [
                            'type' => $errorCodeData['type'],
                            'category' => $errorCodeData['location'] ?? null,
                            'description' => null, // À compléter si disponible
                            'is_critical' => false // Valeur par défaut
                        ]
                    );
                }
            }
            
            return true;
        });
    }
    
    /**
     * Récupère les statistiques de maintenance filtrées
     * 
     * @param array $filters Filtres à appliquer aux données
     * @return array
     */
    public function getMaintenanceStats($filters = [])
    {
        // Requête de base
        $query = Downtime::query()
            ->join('machines', 'downtimes.machine_id', '=', 'machines.machine_id');
            
        // Appliquer les filtres si fournis
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
        
        // Statistiques par machine
        $statsByMachine = $query->clone()
            ->select('machines.name', DB::raw('SUM(duration_minutes) as total_downtime'), DB::raw('COUNT(*) as incident_count'))
            ->groupBy('machines.name')
            ->get();
            
        // Statistiques par type d'erreur
        $statsByErrorType = $query->clone()
            ->select('error_type', DB::raw('SUM(duration_minutes) as total_downtime'), DB::raw('COUNT(*) as incident_count'))
            ->groupBy('error_type')
            ->get();
            
        // Évolution temporelle
        $timeEvolution = $query->clone()
            ->select(DB::raw('DATE(start_time) as date'), DB::raw('SUM(duration_minutes) as total_downtime'))
            ->groupBy(DB::raw('DATE(start_time)'))
            ->orderBy('date')
            ->get();
            
        return [
            'by_machine' => $statsByMachine,
            'by_error_type' => $statsByErrorType,
            'time_evolution' => $timeEvolution,
            'total_incidents' => $query->count(),
            'total_downtime' => $query->sum('duration_minutes')
        ];
    }
    
    /**
     * Obtient des statistiques agrégées par période (jour, semaine, mois, année)
     * 
     * @param string $period Type de période (day, week, month, year)
     * @param array $filters Filtres supplémentaires
     * @return array
     */
    public function getStatsByPeriod($period = 'day', $filters = [])
    {
        // Définir le format de regroupement en fonction de la période
        switch ($period) {
            case 'day':
                $groupFormat = 'DATE(start_time)';
                $labelFormat = 'DATE(start_time)';
                break;
            case 'week':
                $groupFormat = 'YEARWEEK(start_time, 3)'; // ISO week (lundi premier jour)
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
        
        // Construire la requête de base
        $query = Downtime::query();
        
        // Appliquer les filtres si fournis
        if (!empty($filters['start_date'])) {
            $query->where('start_time', '>=', $filters['start_date']);
        }
        
        if (!empty($filters['end_date'])) {
            $query->where('end_time', '<=', $filters['end_date']);
        }
        
        if (!empty($filters['machine_id'])) {
            $query->where('machine_id', $filters['machine_id']);
        }
        
        if (!empty($filters['error_type'])) {
            $query->where('error_type', $filters['error_type']);
        }
        
        // Statistiques agrégées par période
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
        
        // Calculer les totaux
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
    }
    
    /**
     * Récupère les tendances d'arrêt pour la comparaison de périodes
     * 
     * @param string $currentPeriod Période en cours (week, month, quarter, year)
     * @return array
     */
    public function getDowntimeTrends($currentPeriod = 'month')
    {
        // Déterminer les dates de début pour la période actuelle et précédente
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
                'incident_count' => $currentStats->incident_count,
                'total_downtime' => $currentStats->total_downtime,
                'avg_downtime' => $currentStats->incident_count > 0 ? $currentStats->total_downtime / $currentStats->incident_count : 0
            ],
            'previous_period' => [
                'start_date' => $previousStart->format('Y-m-d'),
                'end_date' => $previousEnd->format('Y-m-d'),
                'incident_count' => $previousStats->incident_count,
                'total_downtime' => $previousStats->total_downtime,
                'avg_downtime' => $previousStats->incident_count > 0 ? $previousStats->total_downtime / $previousStats->incident_count : 0
            ],
            'variation' => [
                'incident' => round($incidentVariation, 2),
                'downtime' => round($downtimeVariation, 2)
            ],
            'period' => $currentPeriod
        ];
    }
}