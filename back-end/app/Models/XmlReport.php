<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class XmlReport extends Model
{
    protected $fillable = [
        'name',
        'file_path',
        'file_name',
        'file_size',
        'incident_count',
        'total_downtime_minutes',
        'summary_data'
    ];
    
    protected $casts = [
        'summary_data' => 'array',
    ];
}