<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteSetting extends Model
{
    protected $fillable = ['key', 'value'];

    protected static function booted(): void
    {
        static::saved(function () {
            \Illuminate\Support\Facades\Cache::forget('inertia_shared_layout_settings');
        });

        static::deleted(function () {
            \Illuminate\Support\Facades\Cache::forget('inertia_shared_layout_settings');
        });
    }

    public static function getValue(string $key, string $default = ''): string
    {
        return static::where('key', $key)->value('value') ?? $default;
    }

    public static function setMany(array $data): void
    {
        foreach ($data as $key => $value) {
            static::updateOrCreate(['key' => $key], ['value' => $value]);
        }
    }

    public static function allAsMap(): array
    {
        return static::pluck('value', 'key')->toArray();
    }
}
