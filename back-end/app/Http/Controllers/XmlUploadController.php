<?php
namespace App\Http\Controllers;

use App\Models\XmlReport;
use App\Services\XmlParserService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class XmlUploadController extends Controller
{
    protected $xmlParserService;

    public function __construct(XmlParserService $xmlParserService)
    {
        $this->xmlParserService = $xmlParserService;
    }

    /**
     * Upload and process an XML file
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function upload(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:xml|max:10240', // max 10MB
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $path = $file->store('xml_uploads');

        try {
            // Parse the XML file
            $parsedData = $this->xmlParserService->parseXmlFile(Storage::path($path));
            
            // Save report entry in the database
            $report = XmlReport::create([
                'name' => $parsedData['reportInfo']['title'] ?? $originalName,
                'file_path' => $path,
                'file_name' => $originalName,
                'file_size' => $file->getSize(),
                'incident_count' => count($parsedData['downtimes'] ?? []),
                'total_downtime_minutes' => $parsedData['summary']['totalDowntime'] ?? 0,
                'summary_data' => json_encode($parsedData['summary'] ?? [])
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'XML file processed successfully',
                'data' => [
                    'report_id' => $report->id,
                    'report_name' => $report->name,
                    'incident_count' => $report->incident_count,
                    'total_downtime_minutes' => $report->total_downtime_minutes,
                    'created_at' => $report->created_at,
                    'summary' => $parsedData['summary']
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error processing XML file: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error processing XML file',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get upload history
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
                
            return response()->json([
                'success' => true,
                'data' => $reports
            ]);
        } catch (\Exception $e) {
            Log::error('Error retrieving upload history: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving upload history: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get recent reports
     *
     * @param int $limit Number of reports to retrieve
     * @return \Illuminate\Http\JsonResponse
     */
    public function getLatestReports(Request $request)
    {
        try {
            $limit = $request->input('limit', 5);
            
            $reports = XmlReport::select(
                    'id', 
                    'name', 
                    'incident_count', 
                    'total_downtime_minutes', 
                    'created_at'
                )
                ->orderBy('created_at', 'desc')
                ->limit($limit)
                ->get();
                
            return response()->json([
                'success' => true,
                'data' => $reports
            ]);
        } catch (\Exception $e) {
            Log::error('Error retrieving latest reports: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving latest reports: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get report details
     *
     * @param int $id Report ID
     * @return \Illuminate\Http\JsonResponse
     */
    public function getReportDetails($id)
    {
        try {
            $report = XmlReport::findOrFail($id);
            
            // Parse summary data
            $summaryData = json_decode($report->summary_data, true) ?? [];
            
            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $report->id,
                    'name' => $report->name,
                    'file_name' => $report->file_name,
                    'file_size' => $report->file_size,
                    'incident_count' => $report->incident_count,
                    'total_downtime_minutes' => $report->total_downtime_minutes,
                    'created_at' => $report->created_at,
                    'summary' => $summaryData
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error retrieving report details: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving report details: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Delete a report and associated data
     *
     * @param int $id Report ID
     * @return \Illuminate\Http\JsonResponse
     */
    public function deleteReport($id)
    {
        try {
            $report = XmlReport::findOrFail($id);
            
            // Delete the file
            if (Storage::exists($report->file_path)) {
                Storage::delete($report->file_path);
            }
            
            // Delete the report
            $report->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Report deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting report: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error deleting report: ' . $e->getMessage()
            ], 500);
        }
    }
}