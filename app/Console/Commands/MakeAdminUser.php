<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class MakeAdminUser extends Command
{
    protected $signature   = 'admin:create {email?} {--name=} {--password=}';
    protected $description = 'Create a new admin user, or promote an existing user to admin';

    public function handle(): int
    {
        $email = $this->argument('email') ?? $this->ask('Email address');
        $user  = User::where('email', $email)->first();

        if ($user) {
            $user->update(['is_admin' => true]);
            $this->info("✓ {$user->name} ({$email}) is now an admin.");
            return 0;
        }

        $name     = $this->option('name')     ?? $this->ask('Name');
        $password = $this->option('password') ?? $this->secret('Password');

        User::create([
            'name'     => $name,
            'email'    => $email,
            'password' => Hash::make($password),
            'is_admin' => true,
        ]);

        $this->info("✓ Admin user created: {$email}");
        return 0;
    }
}
