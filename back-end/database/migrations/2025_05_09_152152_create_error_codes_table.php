<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('error_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('type');
            $table->string('category')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_critical')->default(false);
            $table->timestamps();
            
            $table->index('type');
        });
    }

    public function down()
    {
        Schema::dropIfExists('error_codes');
    }
};