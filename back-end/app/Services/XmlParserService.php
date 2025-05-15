<?php
namespace App\Services;

use App\Models\MaintenanceReport;
use App\Repositories\MaintenanceRepository;
use Carbon\Carbon;

class XmlParserService
{
    protected $maintenanceRepository;

    public function __construct(MaintenanceRepository $maintenanceRepository)
    {
        $this->maintenanceRepository = $maintenanceRepository;
    }

    /**
     * Parse un fichier XML de rapport de maintenance
     *
     * @param string $filePath Chemin du fichier XML
     * @return array Données extraites
     */
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
            'fromDate' => $this->formatDateValue($this->getNodeValue($xml, '//ReportHeader/Section/Field[@Name="vonDate1"]/Value')),
            'toDate' => $this->formatDateValue($this->getNodeValue($xml, '//ReportHeader/Section/Field[@Name="bisDate1"]/Value')),
            'printDate' => $this->formatDateValue($this->getNodeValue($xml, '//ReportHeader/Section/Field[@Name="Field3"]/Value'))
        ];
        
        $extractedData['reportInfo'] = $reportInfo;
        
        // Traiter tous les groupes de niveau 1 (segments)
        $segments = $xml->xpath('//Group[@Level="1"]');
        foreach ($segments as $segment) {
            $segmentName = $this->getNodeValue($segment, './/GroupHeader/Section/Field[@FieldName="GroupName ({Work_history1.POS_key})"]/Value');
            if (!$segmentName) {
                $segmentName = $this->getNodeValue($segment, './/GroupHeader/Section/Field[@Name="GroupNamePoskey1"]/Value');
            }
            
            $segmentDowntime = $this->getNodeValue($segment, './/GroupFooter/Section/Field[@FieldName="{#Seg-stop-time}"]/Value');
            if (!$segmentDowntime) {
                $segmentDowntime = $this->getNodeValue($segment, './/GroupFooter/Section/Field[@Name="Segstoptime1"]/Value');
            }
            
            // Traiter tous les groupes de niveau 2 (machines)
            $machines = $segment->xpath('.//Group[@Level="2"]');
            foreach ($machines as $machine) {
                $machineId = $this->getNodeValue($machine, './/GroupFooter/Section/Field[@FieldName="GroupName ({Work_history1.MO_key})"]/Value');
                if (!$machineId) {
                    $machineId = $this->getNodeValue($machine, './/GroupFooter/Section/Field[@Name="Field6"]/Value');
                }
                
                $machineName = $this->getNodeValue($machine, './/GroupFooter/Section/Field[@FieldName="{Work_history1.MO_name}"]/Value');
                if (!$machineName) {
                    $machineName = $this->getNodeValue($machine, './/GroupFooter/Section/Field[@Name="TDatumvon2"]/Value');
                }
                
                $machineDowntime = $this->getNodeValue($machine, './/GroupFooter/Section/Field[@FieldName="{#MO-stop-tine}"]/Value');
                if (!$machineDowntime) {
                    $machineDowntime = $this->getNodeValue($machine, './/GroupFooter/Section/Field[@Name="MOstoptine1"]/Value');
                }
                
                // Ajouter la machine au tableau des machines
                $extractedData['machines'][$machineId] = $machineName;
                $extractedData['summary']['countByMachine'][$machineId] = 0;
                
                // Traiter tous les incidents pour cette machine
                $incidents = $machine->xpath('.//Details[@Level="3"]/Section');
                foreach ($incidents as $incident) {
                    $downtimeId = $this->getNodeValue($incident, './Field[@FieldName="{Work_history1.WO_key}"]/Value');
                    if (!$downtimeId) {
                        $downtimeId = $this->getNodeValue($incident, './Field[@Name="WOKey1"]/Value');
                    }
                    
                    $duration = (float)$this->getNodeValue($incident, './Field[@FieldName="{Work_history1.Stop_time}"]/Value');
                    if (!$duration) {
                        $duration = (float)$this->getNodeValue($incident, './Field[@Name="TTDebitaccountkey1"]/Value');
                    }
                    
                    $errorCode = $this->getNodeValue($incident, './Field[@FieldName="{Work_history1.Code1_key}"]/Value');
                    if (!$errorCode) {
                        $errorCode = $this->getNodeValue($incident, './Field[@Name="Code1key1"]/Value');
                    }
                    
                    $errorType = $this->getNodeValue($incident, './Field[@FieldName="{Work_history1.Code2_key}"]/Value');
                    if (!$errorType) {
                        $errorType = $this->getNodeValue($incident, './Field[@Name="Code2key1"]/Value');
                    }
                    
                    $errorLocation = $this->getNodeValue($incident, './Field[@FieldName="{Work_history1.Code3_key}"]/Value');
                    if (!$errorLocation) {
                        $errorLocation = $this->getNodeValue($incident, './Field[@Name="Code3key1"]/Value');
                    }
                    
                    $description = $this->getNodeValue($incident, './Field[@FieldName="{Work_history1.WO_name}"]/Value');
                    if (!$description) {
                        $description = $this->getNodeValue($incident, './Field[@Name="TTMOkey1"]/Value');
                    }
                    
                    // Calculer les dates de début et de fin en fonction de la période du rapport
                    $startTime = $reportInfo['fromDate'];
                    $endTime = $reportInfo['toDate'];
                    
                    $downtimeData = [
                        'id' => $downtimeId,
                        'machine_id' => $machineId,
                        'machine_name' => $machineName,
                        'segment_name' => $segmentName,
                        'start_time' => $startTime,
                        'end_time' => $endTime,
                        'duration_minutes' => $duration,
                        'error_code' => $errorCode,
                        'error_type' => $errorType,
                        'error_location' => $errorLocation,
                        'description' => $description,
                        'work_supplier' => $this->getNodeValue($incident, './Field[@FieldName="{Transactions1.Work_supplier_key}"]/Value') ?: $this->getNodeValue($incident, './Field[@Name="WorkSupplierKey1"]/Value')
                    ];
                    
                    $extractedData['downtimes'][] = $downtimeData;
                    $extractedData['summary']['totalDowntime'] += $downtimeData['duration_minutes'];
                    $extractedData['summary']['countByMachine'][$machineId]++;
                    
                    // Agréger par type d'erreur
                    if (!isset($extractedData['summary']['countByErrorType'][$errorType])) {
                        $extractedData['summary']['countByErrorType'][$errorType] = 0;
                    }
                    $extractedData['summary']['countByErrorType'][$errorType]++;
                    
                    // Collecter les codes d'erreur uniques
                    $errorCodeData = [
                        'code' => $errorCode,
                        'type' => $errorType,
                        'location' => $errorLocation
                    ];
                    
                    $errorKey = $errorCode . '-' . $errorType . '-' . $errorLocation;
                    if (!isset($extractedData['errorCodes'][$errorKey])) {
                        $extractedData['errorCodes'][$errorKey] = $errorCodeData;
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
     *
     * @param \SimpleXMLElement $xml Elément XML
     * @param string $xpath Expression XPath
     * @return string|null Valeur du nœud
     */
    private function getNodeValue($xml, $xpath)
    {
        $nodes = $xml->xpath($xpath);
        if (!empty($nodes)) {
            return (string)$nodes[0];
        }
        return null;
    }
    
    /**
     * Formate une valeur de date en format compatible avec MySQL
     *
     * @param string $dateValue Valeur de date à formater
     * @return string Date formatée (Y-m-d)
     */
    private function formatDateValue($dateValue)
    {
        if (!$dateValue) {
            return null;
        }
        
        // Si la date est déjà au format YYYY-MM-DD
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateValue)) {
            return $dateValue;
        }
        
        // Si la date est au format MM/DD/YYYY
        if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $dateValue, $matches)) {
            $month = str_pad($matches[1], 2, '0', STR_PAD_LEFT);
            $day = str_pad($matches[2], 2, '0', STR_PAD_LEFT);
            $year = $matches[3];
            return "$year-$month-$day";
        }
        
        // Tenter de parser la date avec Carbon
        try {
            return Carbon::parse($dateValue)->format('Y-m-d');
        } catch (\Exception $e) {
            // En cas d'échec, retourner la date telle quelle
            return $dateValue;
        }
    }
}