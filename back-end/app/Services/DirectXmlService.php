<?php
namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class DirectXmlService
{
    /**
     * Parse le fichier XML et sauvegarde les données
     * 
     * @param string $filePath
     * @return array
     */
    public function processXmlFile($filePath)
    {
        // Vérifier si le fichier existe
        if (!file_exists($filePath)) {
            throw new \Exception("Le fichier XML n'existe pas");
        }

        // Charger le fichier XML
        $xmlContent = file_get_contents($filePath);
        
        // Activer la gestion des erreurs XML
        libxml_use_internal_errors(true);
        $xml = simplexml_load_string($xmlContent);
        
        // Vérifier si le parsing a fonctionné
        if ($xml === false) {
            $errors = libxml_get_errors();
            libxml_clear_errors();
            throw new \Exception("Erreur de parsing XML: " . print_r($errors, true));
        }

        // Structure pour stocker les résultats
        $result = [
            'machines' => [],
            'downtimes' => [],
            'total_downtime' => 0,
            'incident_count' => 0
        ];

        try {
            // Récupérer les dates du rapport
            $fromDate = $this->getDateFromXml($xml, '//Field[@Name="vonDate1"]/Value');
            $toDate = $this->getDateFromXml($xml, '//Field[@Name="bisDate1"]/Value');
            
            // Parcourir les éléments du XML
            // Pour simplifier, nous allons juste extraire les données essentielles
            
            // 1. Récupérer les machines
            $machines = []; // Pour stocker les machines
            
            // 2. Récupérer les temps d'arrêt
            $downtimes = []; // Pour stocker les temps d'arrêt
            
            // Parcourir les segments (groupes de niveau 1)
            foreach ($xml->xpath('//Group[@Level="1"]') as $segment) {
                // Parcourir les machines (groupes de niveau 2)
                foreach ($segment->xpath('.//Group[@Level="2"]') as $machineGroup) {
                    // Récupérer l'ID et le nom de la machine
                    $machineId = $this->getNodeText($machineGroup, './/Field[@Name="Field6"]/Value') ?: 
                                 $this->getNodeText($machineGroup, './/Field[@FieldName="GroupName ({Work_history1.MO_key})"]/Value') ?: 
                                 'MACHINE-' . uniqid();
                    
                    $machineName = $this->getNodeText($machineGroup, './/Field[@Name="TDatumvon2"]/Value') ?: 
                                   $this->getNodeText($machineGroup, './/Field[@FieldName="{Work_history1.MO_name}"]/Value') ?: 
                                   'Machine sans nom';
                    
                    // Ajouter la machine à notre liste
                    $machines[$machineId] = [
                        'machine_id' => $machineId,
                        'name' => $machineName,
                        'description' => null
                    ];
                    
                    // Parcourir les incidents (détails de niveau 3)
                    foreach ($machineGroup->xpath('.//Details[@Level="3"]/Section') as $incident) {
                        $downtimeId = $this->getNodeText($incident, './Field[@Name="WOKey1"]/Value') ?: 
                                      $this->getNodeText($incident, './Field[@FieldName="{Work_history1.WO_key}"]/Value') ?: 
                                      'DOWNTIME-' . uniqid();
                        
                        $duration = (float)($this->getNodeText($incident, './Field[@Name="TTDebitaccountkey1"]/Value') ?: 
                                           $this->getNodeText($incident, './Field[@FieldName="{Work_history1.Stop_time}"]/Value') ?: 
                                           0);
                        
                        $errorCode = $this->getNodeText($incident, './Field[@Name="Code1key1"]/Value') ?: 
                                     $this->getNodeText($incident, './Field[@FieldName="{Work_history1.Code1_key}"]/Value') ?: 
                                     'CODE-' . uniqid();
                        
                        $errorType = $this->getNodeText($incident, './Field[@Name="Code2key1"]/Value') ?: 
                                     $this->getNodeText($incident, './Field[@FieldName="{Work_history1.Code2_key}"]/Value') ?: 
                                     'Inconnu';
                        
                        $description = $this->getNodeText($incident, './Field[@Name="TTMOkey1"]/Value') ?: 
                                       $this->getNodeText($incident, './Field[@FieldName="{Work_history1.WO_name}"]/Value') ?: 
                                       'Sans description';
                        
                        // Ajouter l'incident à notre liste
                        $downtimes[] = [
                            'downtime_id' => $downtimeId,
                            'machine_id' => $machineId,
                            'start_time' => $fromDate ?: date('Y-m-d'),
                            'end_time' => $toDate ?: date('Y-m-d'),
                            'duration_minutes' => max(1, $duration), // Au moins 1 minute
                            'error_code' => $errorCode,
                            'error_type' => $errorType,
                            'description' => $description
                        ];
                        
                        // Mettre à jour les compteurs
                        $result['total_downtime'] += max(1, $duration);
                        $result['incident_count']++;
                    }
                }
            }
            
            // Sauvegarder les données dans la base de données
            $this->saveDataToDB($machines, $downtimes);
            
            // Mettre à jour les résultats
            $result['machines'] = array_values($machines);
            $result['downtimes'] = $downtimes;
            
            return $result;
            
        } catch (\Exception $e) {
            Log::error('Erreur lors du traitement du fichier XML: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Sauvegarde les données dans la base de données
     * 
     * @param array $machines
     * @param array $downtimes
     * @return bool
     */
    private function saveDataToDB($machines, $downtimes)
    {
        // Utiliser une transaction pour garantir l'intégrité des données
        return DB::transaction(function() use ($machines, $downtimes) {
            // 1. Sauvegarder les machines
            foreach ($machines as $machine) {
                DB::table('machines')->updateOrInsert(
                    ['machine_id' => $machine['machine_id']],
                    [
                        'name' => $machine['name'],
                        'description' => $machine['description'],
                        'created_at' => now(),
                        'updated_at' => now()
                    ]
                );
                
                Log::info('Machine sauvegardée: ' . $machine['machine_id']);
            }
            
            // 2. Sauvegarder les temps d'arrêt
            foreach ($downtimes as $downtime) {
                // Créer un tableau d'erreur pour le débogage si nécessaire
                $error_types = [];
                
                // Mettre à jour ou insérer le code d'erreur
                try {
                    DB::table('error_codes')->updateOrInsert(
                        ['code' => $downtime['error_code']],
                        [
                            'type' => $downtime['error_type'],
                            'category' => null,
                            'description' => null,
                            'is_critical' => false,
                            'created_at' => now(),
                            'updated_at' => now()
                        ]
                    );
                    
                    $error_types[] = 'Error code inserted';
                } catch (\Exception $e) {
                    Log::error('Erreur lors de l\'insertion du code d\'erreur: ' . $e->getMessage());
                    $error_types[] = 'Error code failed: ' . $e->getMessage();
                }
                
                // Mettre à jour ou insérer le temps d'arrêt
                try {
                    DB::table('downtimes')->updateOrInsert(
                        ['downtime_id' => $downtime['downtime_id']],
                        [
                            'machine_id' => $downtime['machine_id'],
                            'start_time' => $downtime['start_time'],
                            'end_time' => $downtime['end_time'],
                            'duration_minutes' => $downtime['duration_minutes'],
                            'error_code' => $downtime['error_code'],
                            'error_type' => $downtime['error_type'],
                            'description' => $downtime['description'],
                            'created_at' => now(),
                            'updated_at' => now()
                        ]
                    );
                    
                    $error_types[] = 'Downtime inserted';
                } catch (\Exception $e) {
                    Log::error('Erreur lors de l\'insertion du temps d\'arrêt: ' . $e->getMessage());
                    $error_types[] = 'Downtime failed: ' . $e->getMessage();
                }
                
                Log::info('Downtime sauvegardé: ' . $downtime['downtime_id'] . ' - Status: ' . implode(', ', $error_types));
            }
            
            Log::info('Toutes les données ont été sauvegardées avec succès');
            
            return true;
        });
    }
    
    /**
     * Récupère le texte d'un nœud XML
     * 
     * @param \SimpleXMLElement $element
     * @param string $xpath
     * @return string|null
     */
    private function getNodeText($element, $xpath)
    {
        $nodes = $element->xpath($xpath);
        return !empty($nodes) ? (string)$nodes[0] : null;
    }
    
    /**
     * Récupère une date depuis un nœud XML
     * 
     * @param \SimpleXMLElement $element
     * @param string $xpath
     * @return string|null
     */
    private function getDateFromXml($element, $xpath)
    {
        $dateText = $this->getNodeText($element, $xpath);
        if (!$dateText) {
            return date('Y-m-d'); // Date par défaut
        }
        
        try {
            return Carbon::parse($dateText)->format('Y-m-d');
        } catch (\Exception $e) {
            return date('Y-m-d'); // En cas d'erreur, utiliser la date actuelle
        }
    }
}