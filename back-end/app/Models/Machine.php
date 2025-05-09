<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Machine extends Model
{
    protected $fillable = ['machine_id', 'name', 'description'];
    
    public function downtimes()
    {
        return $this->hasMany(Downtime::class, 'machine_id', 'machine_id');
    }
}

