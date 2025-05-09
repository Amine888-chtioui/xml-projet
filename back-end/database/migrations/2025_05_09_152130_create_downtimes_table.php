<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('downtimes', function (Blueprint $table) {
            $table->id();
            $table->string('downtime_id')->unique();
            $table->string('machine_id');
            $table->dateTime('start_time');
            $table->dateTime('end_time');
            $table->integer('duration_minutes');
            $table->string('error_code');
            $table->string('error_type');
            $table->text('description')->nullable();
            $table->timestamps();
            
            $table->foreign('machine_id')
                  ->references('machine_id')
                  ->on('machines')
                  ->onDelete('cascade');
                  
            $table->index(['machine_id', 'error_type']);
            $table->index('start_time');
            $table->index('end_time');
        });
    }

    public function down()
    {
        Schema::dropIfExists('downtimes');
    }
};