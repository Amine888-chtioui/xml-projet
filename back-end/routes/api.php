<?php

use App\Http\Controllers\XmlUploadController;
use App\Http\Controllers\MaintenanceStatsController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('api')->group(function () {
    // Routes d'upload XML
    Route::post('/upload-xml', [XmlUploadController::class, 'upload']);
    
    // Routes de statistiques générales
    Route::get('/maintenance-stats', [MaintenanceStatsController::class, 'getStats']);
    Route::get('/maintenance-stats/summary', [MaintenanceStatsController::class, 'getSummary']);
    Route::get('/maintenance-stats/machines', [MaintenanceStatsController::class, 'getMachines']);
    Route::get('/maintenance-stats/error-types', [MaintenanceStatsController::class, 'getErrorTypes']);
    
    // Routes pour les données spécifiques
    Route::get('/maintenance-stats/time-evolution', [MaintenanceStatsController::class, 'getTimeEvolution']);
    Route::get('/maintenance-stats/by-machine', [MaintenanceStatsController::class, 'getStatsByMachine']);
    Route::get('/maintenance-stats/by-error-type', [MaintenanceStatsController::class, 'getStatsByErrorType']);
    Route::get('/maintenance-stats/critical-issues', [MaintenanceStatsController::class, 'getCriticalIssues']);
    
    // Routes pour le tableau de bord
    Route::get('/dashboard-stats', [MaintenanceStatsController::class, 'getDashboardStats']);
    Route::get('/performance-indicators', [MaintenanceStatsController::class, 'getPerformanceIndicators']);
    
    // Routes pour l'historique des rapports
    Route::get('/upload-history', [XmlUploadController::class, 'getUploadHistory']);
    Route::get('/latest-reports', [XmlUploadController::class, 'getLatestReports']);
});