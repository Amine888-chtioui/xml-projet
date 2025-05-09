<?php
// app/Http/Controllers/XmlUploadController.php
namespace App\Http\Controllers;

use App\Models\XmlReport;
use App\Services\XmlParserService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class XmlUploadController extends Controller
{
    protected $xmlParserService;

    public function __construct(XmlParserService $xmlParserService)
    {
        $this->xmlParserService = $xmlParserService;
    }

    public function upload(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:xml|max:10240', // max 10MB
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation échouée',
                'errors' => $validator->errors()
            ], 422);
        }

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $path = $file->store('xml_uploads');

        try {
            $parsedData = $this->xmlParserService->parseXmlFile(Storage::path($path));
            
            // Sauvegarder l'entrée dans la table des rapports
            $report = XmlReport::create([
                'name' => $originalName,
                'file_path' => $path,
                'file_name' => $originalName,
                'file_size' => $file->getSize(),
                'incident_count' => count($parsedData['downtimes'] ?? []),
                'total_downtime_minutes' => $parsedData['summary']['totalDowntime'] ?? 0,
                'summary_data' => json_encode($parsedData['summary'] ?? [])
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Fichier XML traité avec succès',
                'data' => $parsedData,
                'report_id' => $report->id
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du traitement du fichier XML',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Récupérer l'historique des uploads
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getUploadHistory()
    {
        try {
            $reports = XmlReport::select(
                    'id', 
                    'name', 
                    'file_name', 
                    'incident_count', 
                    'total_downtime_minutes', 
                    'created_at'
                )
                ->orderBy('created_at', 'desc')
                ->get();
                
            return response()->json($reports);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de l\'historique des uploads: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Récupérer les rapports récents
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getLatestReports()
    {
        try {
            $reports = XmlReport::select(
                    'id', 
                    'name', 
                    'incident_count', 
                    'total_downtime_minutes', 
                    'created_at'
                )
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get();
                
            return response()->json($reports);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des rapports récents: ' . $e->getMessage()
            ], 500);
        }
    }
}