<?php
// app/Services/XmlParserService.php
namespace App\Services;

use App\Models\MaintenanceReport;
use App\Repositories\MaintenanceRepository;

class XmlParserService
{
    protected $maintenanceRepository;

    public function __construct(MaintenanceRepository $maintenanceRepository)
    {
        $this->maintenanceRepository = $maintenanceRepository;
    }

    public function parseXmlFile(string $filePath)
    {
        // Vérifier si le fichier existe
        if (!file_exists($filePath)) {
            throw new \Exception("Le fichier XML n'existe pas");
        }

        // Charger le fichier XML
        $xmlContent = file_get_contents($filePath);
        $xml = simplexml_load_string($xmlContent);

        if ($xml === false) {
            throw new \Exception("Impossible de parser le fichier XML");
        }

        // Structure pour stocker les données extraites
        $extractedData = [
            'machines' => [],
            'downtimes' => [],
            'errorCodes' => [],
            'summary' => [
                'totalDowntime' => 0,
                'countByMachine' => [],
                'countByErrorType' => []
            ]
        ];

        // Exemple d'extraction - à adapter selon la structure de vos fichiers XML
        foreach ($xml->Machine as $machine) {
            $machineId = (string)$machine['id'];
            $machineName = (string)$machine['name'];
            
            $extractedData['machines'][$machineId] = $machineName;
            $extractedData['summary']['countByMachine'][$machineId] = 0;
            
            foreach ($machine->Downtime as $downtime) {
                $downtimeData = [
                    'id' => (string)$downtime['id'],
                    'machine_id' => $machineId,
                    'start_time' => (string)$downtime->StartTime,
                    'end_time' => (string)$downtime->EndTime,
                    'duration_minutes' => (int)$downtime->Duration,
                    'error_code' => (string)$downtime->ErrorCode,
                    'error_type' => (string)$downtime->ErrorType,
                    'description' => (string)$downtime->Description
                ];
                
                $extractedData['downtimes'][] = $downtimeData;
                $extractedData['summary']['totalDowntime'] += $downtimeData['duration_minutes'];
                $extractedData['summary']['countByMachine'][$machineId]++;
                
                // Agréger par type d'erreur
                $errorType = $downtimeData['error_type'];
                if (!isset($extractedData['summary']['countByErrorType'][$errorType])) {
                    $extractedData['summary']['countByErrorType'][$errorType] = 0;
                }
                $extractedData['summary']['countByErrorType'][$errorType]++;
                
                // Collecter les codes d'erreur uniques
                if (!in_array($downtimeData['error_code'], $extractedData['errorCodes'])) {
                    $extractedData['errorCodes'][] = $downtimeData['error_code'];
                }
            }
        }

        // Sauvegarder les données dans la base de données
        $this->maintenanceRepository->saveMaintenanceData($extractedData);

        return $extractedData;
    }
}
