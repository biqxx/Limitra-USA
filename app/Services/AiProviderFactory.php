<?php

namespace App\Services;

class AiProviderFactory
{
    public static function make(): AiProvider
    {
        return match (config('services.ai.provider', 'claude')) {
            'gemini' => new GeminiProvider(),
            default  => new ClaudeProvider(),
        };
    }
}
