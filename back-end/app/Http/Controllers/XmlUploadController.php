<?php
// app/Http/Controllers/XmlUploadController.php
namespace App\Http\Controllers;

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
        $path = $file->store('xml_uploads');

        try {
            $parsedData = $this->xmlParserService->parseXmlFile(Storage::path($path));
            
            return response()->json([
                'success' => true,
                'message' => 'Fichier XML traité avec succès',
                'data' => $parsedData
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du traitement du fichier XML',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}