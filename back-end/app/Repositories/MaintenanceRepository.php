<?php
// app/Services/XmlParserService.php
namespace App\Repositories;

use App\Models\Machine;
use App\Models\Downtime;
use App\Models\ErrorCode;
use Illuminate\Support\Facades\DB;

class MaintenanceRepository
{
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
            
            // Enregistrer les temps d'arrêt
            foreach ($data['downtimes'] as $downtimeData) {
                Downtime::create([
                    'downtime_id' => $downtimeData['id'],
                    'machine_id' => $downtimeData['machine_id'],
                    'start_time' => $downtimeData['start_time'],
                    'end_time' => $downtimeData['end_time'],
                    'duration_minutes' => $downtimeData['duration_minutes'],
                    'error_code' => $downtimeData['error_code'],
                    'error_type' => $downtimeData['error_type'],
                    'description' => $downtimeData['description']
                ]);
            }
            
            return true;
        });
    }
    
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
}