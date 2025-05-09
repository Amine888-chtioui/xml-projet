<?php
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
        
        // Utiliser libxml pour préserver les espaces CDATA
        $previousValue = libxml_use_internal_errors(true);
        $xml = simplexml_load_string($xmlContent);
        libxml_use_internal_errors($previousValue);

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
        
        // Extraire les informations générales du rapport
        $reportInfo = [
            'title' => $this->getNodeValue($xml, '//ReportHeader/Section/Text[@Name="Text3"]/TextValue'),
            'fromDate' => $this->getNodeValue($xml, '//ReportHeader/Section/Field[@Name="vonDate1"]/Value'),
            'toDate' => $this->getNodeValue($xml, '//ReportHeader/Section/Field[@Name="bisDate1"]/Value'),
            'printDate' => $this->getNodeValue($xml, '//ReportHeader/Section/Field[@Name="Field3"]/Value')
        ];
        
        $extractedData['reportInfo'] = $reportInfo;
        
        // Traiter tous les groupes de niveau 1 (segments)
        $segments = $xml->xpath('//Group[@Level="1"]');
        foreach ($segments as $segment) {
            $segmentName = $this->getNodeValue($segment, './/GroupHeader/Section/Field[@FieldName="GroupName ({Work_history1.POS_key})"]/Value');
            $segmentDowntime = $this->getNodeValue($segment, './/GroupFooter/Section/Field[@FieldName="{#Seg-stop-time}"]/Value');
            
            // Traiter tous les groupes de niveau 2 (machines)
            $machines = $segment->xpath('.//Group[@Level="2"]');
            foreach ($machines as $machine) {
                $machineId = $this->getNodeValue($machine, './/GroupFooter/Section/Field[@FieldName="GroupName ({Work_history1.MO_key})"]/Value');
                $machineName = $this->getNodeValue($machine, './/GroupFooter/Section/Field[@FieldName="{Work_history1.MO_name}"]/Value');
                $machineDowntime = $this->getNodeValue($machine, './/GroupFooter/Section/Field[@FieldName="{#MO-stop-tine}"]/Value');
                
                // Ajouter la machine au tableau des machines
                $extractedData['machines'][$machineId] = $machineName;
                $extractedData['summary']['countByMachine'][$machineId] = 0;
                
                // Traiter tous les incidents pour cette machine
                $incidents = $machine->xpath('.//Details[@Level="3"]/Section');
                foreach ($incidents as $incident) {
                    $downtimeData = [
                        'id' => $this->getNodeValue($incident, './Field[@FieldName="{Work_history1.WO_key}"]/Value'),
                        'machine_id' => $machineId,
                        'machine_name' => $machineName,
                        'segment_name' => $segmentName,
                        'start_time' => null, // Ces données ne sont pas présentes dans l'exemple
                        'end_time' => null,   // Ces données ne sont pas présentes dans l'exemple
                        'duration_minutes' => (float)$this->getNodeValue($incident, './Field[@FieldName="{Work_history1.Stop_time}"]/Value'),
                        'error_code' => $this->getNodeValue($incident, './Field[@FieldName="{Work_history1.Code1_key}"]/Value'),
                        'error_type' => $this->getNodeValue($incident, './Field[@FieldName="{Work_history1.Code2_key}"]/Value'),
                        'error_location' => $this->getNodeValue($incident, './Field[@FieldName="{Work_history1.Code3_key}"]/Value'),
                        'description' => $this->getNodeValue($incident, './Field[@FieldName="{Work_history1.WO_name}"]/Value'),
                        'work_supplier' => $this->getNodeValue($incident, './Field[@FieldName="{Transactions1.Work_supplier_key}"]/Value')
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
                    $errorCode = [
                        'code' => $downtimeData['error_code'],
                        'type' => $downtimeData['error_type'],
                        'location' => $downtimeData['error_location']
                    ];
                    
                    $errorKey = $errorCode['code'] . '-' . $errorCode['type'] . '-' . $errorCode['location'];
                    if (!isset($extractedData['errorCodes'][$errorKey])) {
                        $extractedData['errorCodes'][$errorKey] = $errorCode;
                    }
                }
            }
        }

        // Sauvegarder les données dans la base de données
        $this->maintenanceRepository->saveMaintenanceData($extractedData);

        return $extractedData;
    }
    
    /**
     * Récupère la valeur d'un nœud XML à partir d'une expression XPath
     */
    private function getNodeValue($xml, $xpath)
    {
        $nodes = $xml->xpath($xpath);
        if (!empty($nodes)) {
            return (string)$nodes[0];
        }
        return null;
    }
}