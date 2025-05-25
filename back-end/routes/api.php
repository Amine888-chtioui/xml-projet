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
    Route::get('/upload-history', [XmlUploadController::class, 'getUploadHistory']);
    Route::get('/latest-reports', [XmlUploadController::class, 'getLatestReports']);
    Route::get('/reports/{id}', [XmlUploadController::class, 'getReportDetails']);
    Route::delete('/reports/{id}', [XmlUploadController::class, 'deleteReport']);
    
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
    
    // Nouvelle route pour les statistiques temporelles
    Route::get('/maintenance-stats/by-period', [MaintenanceStatsController::class, 'getStatsByPeriod']);
    
    // Routes pour le tableau de bord
    Route::get('/dashboard-stats', [MaintenanceStatsController::class, 'getDashboardStats']);
    Route::get('/performance-indicators', [MaintenanceStatsController::class, 'getPerformanceIndicators']);
    
    // Routes pour les machines
    Route::get('/machines', [MaintenanceStatsController::class, 'getMachines']);
    Route::get('/machines/{id}', [MaintenanceStatsController::class, 'getMachineDetails']);
    Route::get('/machines/{id}/downtime-history', [MaintenanceStatsController::class, 'getMachineDowntimeHistory']);
    Route::get('/machines/{id}/common-errors', [MaintenanceStatsController::class, 'getMachineCommonErrors']);
    
    // Routes pour les codes d'erreur
    Route::get('/error-codes', [MaintenanceStatsController::class, 'getErrorCodes']);
});