<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ErrorCode extends Model
{
    protected $fillable = [
        'code',
        'type',
        'category',
        'description',
        'is_critical'
    ];
    
    public function downtimes()
    {
        return $this->hasMany(Downtime::class, 'error_code', 'code');
    }
}