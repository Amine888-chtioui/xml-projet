<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * The path to the "home" route for your application.
     *
     * Typically, users are redirected here after authentication.
     *
     * @var string
     */
    public const HOME = '/home';

    /**
     * Define your route model bindings, pattern filters, and other route configuration.
     */
    public function boot(): void
    {
        $this->configureRateLimiting();

        $this->routes(function () {
            // API routes configuration
            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('routes/api.php'));

            // Web routes configuration
            Route::middleware('web')
                ->group(base_path('routes/web.php'));
            
            // Désactiver les limitations CORS pour les requêtes API pendant le développement
            // if (app()->environment('local')) {
            //     header('Access-Control-Allow-Origin: *');
            //     header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            //     header('Access-Control-Allow-Headers: Origin, Content-Type, Accept, Authorization, X-Request-With');
            //     header('Access-Control-Allow-Credentials: true');
            // }
        });
    }

    /**
     * Configure the rate limiters for the application.
     */
    protected function configureRateLimiting(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });
    }
}