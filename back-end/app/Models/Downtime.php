<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Downtime extends Model
{
    protected $fillable = [
        'downtime_id', 
        'machine_id', 
        'start_time', 
        'end_time', 
        'duration_minutes', 
        'error_code', 
        'error_type', 
        'description'
    ];
    
    public function machine()
    {
        return $this->belongsTo(Machine::class, 'machine_id', 'machine_id');
    }
}