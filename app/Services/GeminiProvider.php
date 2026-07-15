<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class GeminiProvider implements AiProvider
{
    /** Ordered fallback chain tried on 503 / overload responses. */
    private const FALLBACK_MODELS = [
        'gemini-3.5-flash',
        'gemini-3.1-flash-lite',
    ];

    private function modelUrl(string $model, string $method, string $key): string
    {
        return "https://generativelanguage.googleapis.com/v1beta/models/{$model}:{$method}?key={$key}";
    }

    public function chat(string $system, array $messages, int $maxTokens = 1024, bool $thinking = false): string
    {
        $key = config('services.gemini.key');
        if (!$key) throw new RuntimeException('GEMINI_API_KEY not set');

        $body = [
            'system_instruction' => ['parts' => [['text' => $system]]],
            'contents'           => $this->toContents($messages),
            'generationConfig'   => ['maxOutputTokens' => $maxTokens],
        ];

        // Disable thinking for simple/fast calls (e.g. intent classification)
        if (!$thinking) {
            $body['generationConfig']['thinkingConfig'] = ['thinkingBudget' => 0];
        }

        $lastError = 'unknown';
        foreach (self::FALLBACK_MODELS as $i => $model) {
            $res  = Http::withHeaders(['content-type' => 'application/json'])
                ->connectTimeout(10)
                ->timeout(20)
                ->post($this->modelUrl($model, 'generateContent', $key), $body);
            $data = $res->json();

            if ($res->successful()) {
                break; // success — proceed with $data
            }

            $lastError = $data['error']['message'] ?? 'unknown';

            // Only retry on overload / unavailable; surface all other errors immediately.
            if ($res->status() !== 503) {
                throw new RuntimeException('Gemini error: ' . $lastError);
            }

            if ($next = self::FALLBACK_MODELS[$i + 1] ?? null) {
                Log::warning("[Gemini] {$model} unavailable (503), falling back to {$next}", ['error' => $lastError]);
            }
        }

        if (!$res->successful()) {
            throw new RuntimeException('Gemini error: ' . $lastError);
        }

        // Thinking models (e.g. gemini-3.5-flash) return multiple parts — the first
        // may be a "thought" with no text. Iterate all parts to find the actual reply.
        $parts = $data['candidates'][0]['content']['parts'] ?? [];
        $text  = '';
        foreach ($parts as $part) {
            if (!empty($part['text'])) {
                $text = $part['text'];
                break;
            }
        }

        if ($text === '') {
            throw new RuntimeException('Gemini error: ' . ($data['error']['message'] ?? 'empty response'));
        }

        return $text;
    }

    public function stream(string $system, array $messages, callable $onChunk, int $maxTokens = 1024): void
    {
        $key = config('services.gemini.key');
        if (!$key) throw new RuntimeException('GEMINI_API_KEY not set');

        $body = json_encode([
            'system_instruction' => ['parts' => [['text' => $system]]],
            'contents'           => $this->toContents($messages),
            'generationConfig'   => ['maxOutputTokens' => $maxTokens, 'temperature' => 0.3],
        ]);

        $lastError = 'unknown';
        $success   = false;

        foreach (self::FALLBACK_MODELS as $i => $model) {
            $url        = $this->modelUrl($model, 'streamGenerateContent', $key) . '&alt=sse';
            $buffer     = '';
            $rawBody    = '';

            // Raw cURL (not Guzzle's 'stream' option) — Guzzle's stream option routes
            // through PHP's fopen-based StreamHandler instead of cURL, which fails to
            // connect in this environment even though cURL itself works fine.
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => $body,
                CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
                CURLOPT_CONNECTTIMEOUT => 10,
                CURLOPT_TIMEOUT        => 60,
                CURLOPT_WRITEFUNCTION  => function ($ch, $chunk) use (&$buffer, &$rawBody, $onChunk) {
                    $rawBody .= $chunk;
                    $buffer  .= $chunk;

                    while (($pos = strpos($buffer, "\n")) !== false) {
                        $line   = trim(substr($buffer, 0, $pos));
                        $buffer = substr($buffer, $pos + 1);

                        if (!str_starts_with($line, 'data: ')) continue;

                        $payload = json_decode(substr($line, 6), true);
                        $parts   = $payload['candidates'][0]['content']['parts'] ?? [];
                        foreach ($parts as $part) {
                            // Skip thought parts (thinking model internal reasoning)
                            if (!empty($part['thought'])) continue;
                            if (!empty($part['text'])) {
                                $onChunk($part['text']);
                                break;
                            }
                        }
                    }

                    return strlen($chunk);
                },
            ]);

            curl_exec($ch);
            $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError  = curl_error($ch);
            curl_close($ch);

            if ($statusCode >= 200 && $statusCode < 300 && !$curlError) {
                $success = true;
                break;
            }

            $decoded   = json_decode($rawBody, true);
            $lastError = $curlError ?: ($decoded['error']['message'] ?? "HTTP {$statusCode}");

            // Only retry on overload / unavailable; surface all other errors immediately.
            if ($statusCode !== 503) {
                throw new RuntimeException('Gemini stream error: ' . $lastError);
            }

            if ($next = self::FALLBACK_MODELS[$i + 1] ?? null) {
                Log::warning("[Gemini] {$model} unavailable (503), falling back to {$next}", ['error' => $lastError]);
            }
        }

        if (!$success) {
            throw new RuntimeException('Gemini stream error: ' . $lastError);
        }
    }

    private function toContents(array $messages): array
    {
        return array_map(fn($m) => [
            'role'  => $m['role'] === 'assistant' ? 'model' : 'user',
            'parts' => [['text' => $m['content']]],
        ], $messages);
    }
}
