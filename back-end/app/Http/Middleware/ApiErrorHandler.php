<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class ApiErrorHandler
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        try {
            $response = $next($request);
            
            // Si la réponse est déjà une erreur, la laisser passer
            if ($response->getStatusCode() >= 400) {
                return $response;
            }
            
            return $response;
        } catch (Throwable $e) {
            // Log l'erreur pour le debugging
            Log::error('API Error: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'url' => $request->fullUrl(),
                'method' => $request->method(),
                'params' => $request->all()
            ]);
            
            // Retourner une réponse JSON appropriée
            $statusCode = $this->getStatusCode($e);
            $message = $this->getMessage($e);
            
            return response()->json([
                'success' => false,
                'message' => $message,
                'error_code' => $statusCode,
                'timestamp' => now()->toISOString()
            ], $statusCode);
        }
    }
    
    /**
     * Déterminer le code de statut HTTP approprié
     */
    private function getStatusCode(Throwable $e): int
    {
        if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) {
            return $e->getStatusCode();
        }
        
        if ($e instanceof \Illuminate\Database\QueryException) {
            return 500;
        }
        
        if ($e instanceof \Illuminate\Validation\ValidationException) {
            return 422;
        }
        
        if ($e instanceof \Illuminate\Database\Eloquent\ModelNotFoundException) {
            return 404;
        }
        
        if ($e instanceof \Illuminate\Auth\AuthenticationException) {
            return 401;
        }
        
        if ($e instanceof \Illuminate\Auth\Access\AuthorizationException) {
            return 403;
        }
        
        return 500;
    }
    
    /**
     * Déterminer le message d'erreur approprié
     */
    private function getMessage(Throwable $e): string
    {
        if ($e instanceof \Illuminate\Database\QueryException) {
            return 'Database error occurred. Please try again later.';
        }
        
        if ($e instanceof \Illuminate\Validation\ValidationException) {
            return 'Validation failed.';
        }
        
        if ($e instanceof \Illuminate\Database\Eloquent\ModelNotFoundException) {
            return 'Resource not found.';
        }
        
        if ($e instanceof \Illuminate\Auth\AuthenticationException) {
            return 'Authentication required.';
        }
        
        if ($e instanceof \Illuminate\Auth\Access\AuthorizationException) {
            return 'Access denied.';
        }
        
        // En production, ne pas exposer les détails de l'erreur
        if (app()->environment('production')) {
            return 'An internal server error occurred.';
        }
        
        return $e->getMessage();
    }
}