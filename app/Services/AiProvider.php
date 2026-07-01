<?php

namespace App\Services;

interface AiProvider
{
    public function chat(string $system, array $messages, int $maxTokens = 1024): string;

    /** Calls $onChunk($text) for each streamed text fragment. */
    public function stream(string $system, array $messages, callable $onChunk, int $maxTokens = 1024): void;
}
