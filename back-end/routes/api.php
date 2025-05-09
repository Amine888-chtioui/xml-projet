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
    Route::post('/upload-xml', [XmlUploadController::class, 'upload']);
    Route::get('/maintenance-stats', [MaintenanceStatsController::class, 'getStats']);
    Route::get('/maintenance-stats/machines', [MaintenanceStatsController::class, 'getMachines']);
    Route::get('/maintenance-stats/error-types', [MaintenanceStatsController::class, 'getErrorTypes']);
});
