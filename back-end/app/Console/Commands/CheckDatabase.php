<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CheckDatabase extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:check';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check database tables and connection';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking database connection and tables...');
        
        try {
            // Test de connexion à la base de données
            DB::connection()->getPdo();
            $this->info('✓ Database connection successful');
            
            // Vérification des tables principales
            $tables = [
                'migrations',
                'users',
                'machines',
                'downtimes',
                'error_codes',
                'xml_reports'
            ];
            
            $missingTables = [];
            
            foreach ($tables as $table) {
                if (Schema::hasTable($table)) {
                    $count = DB::table($table)->count();
                    $this->info("✓ Table '$table' exists with $count records");
                } else {
                    $missingTables[] = $table;
                    $this->error("✗ Table '$table' does not exist");
                }
            }
            
            if (!empty($missingTables)) {
                $this->warn('Missing tables detected. Run the following commands:');
                $this->line('php artisan migrate');
                return 1;
            }
            
            // Vérification des colonnes critiques
            $this->checkTableStructure();
            
            $this->info('✓ All database checks passed!');
            return 0;
            
        } catch (\Exception $e) {
            $this->error('✗ Database connection failed: ' . $e->getMessage());
            return 1;
        }
    }
    
    /**
     * Vérifier la structure des tables critiques
     */
    private function checkTableStructure()
    {
        $this->info('Checking table structures...');
        
        // Vérification de la table machines
        if (Schema::hasTable('machines')) {
            $columns = ['id', 'machine_id', 'name', 'created_at', 'updated_at'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('machines', $column)) {
                    $this->info("  ✓ machines.$column exists");
                } else {
                    $this->warn("  ⚠ machines.$column missing");
                }
            }
        }
        
        // Vérification de la table downtimes
        if (Schema::hasTable('downtimes')) {
            $columns = ['id', 'downtime_id', 'machine_id', 'start_time', 'end_time', 'duration_minutes', 'error_code', 'error_type'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('downtimes', $column)) {
                    $this->info("  ✓ downtimes.$column exists");
                } else {
                    $this->warn("  ⚠ downtimes.$column missing");
                }
            }
        }
        
        // Vérification de la table xml_reports
        if (Schema::hasTable('xml_reports')) {
            $columns = ['id', 'name', 'file_path', 'file_name', 'incident_count', 'total_downtime_minutes'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('xml_reports', $column)) {
                    $this->info("  ✓ xml_reports.$column exists");
                } else {
                    $this->warn("  ⚠ xml_reports.$column missing");
                }
            }
        }
    }
}