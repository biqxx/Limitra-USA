<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'bjquyum@limitra.com.ng'],
            [
                'name'     => 'Admin',
                'password' => Hash::make('changeme123'),
                'is_admin' => true,
            ]
        );
    }
}
