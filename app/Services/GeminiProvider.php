<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class GeminiProvider implements AiProvider
{
    /** Ordered fallback chain for the intent-classification call. */
    private const INTENT_FALLBACK_MODELS = [
        'gemini-3.5-flash',
        'gemini-3.1-flash-lite',
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash-lite-001',
    ];

    /** Ordered fallback chain for the customer-facing streamed reply. */
    private const REPLY_FALLBACK_MODELS = [
        'gemini-3.5-flash',
        'gemini-3.1-flash-lite',
        'gemini-2.5-flash',
        'gemini-2.0-flash',
    ];

    /** Statuses worth retrying the next model for — overload/rate-limit, not real errors. */
    private const RETRYABLE_STATUSES = [503, 429];

    private function modelUrl(string $model, string $method, string $key): string
    {
        return "https://generativelanguage.googleapis.com/v1beta/models/{$model}:{$method}?key={$key}";
    }

    private function logFallback(string $model, ?string $next, string $error): void
    {
        if ($next) {
            Log::warning("[Gemini] {$model} unavailable, falling back to {$next}", ['error' => $error]);
        }
    }

    public function chat(string $system, array $messages, int $maxTokens = 1024, bool $thinking = false, ?array $responseSchema = null): string
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

        // Force valid JSON output (e.g. for the scanning-phase classifier call) instead of
        // relying on regex-scraping possibly-fenced free text out of the response.
        if ($responseSchema !== null) {
            $body['generationConfig']['responseMimeType'] = 'application/json';
        }

        $models    = self::INTENT_FALLBACK_MODELS;
        $lastError = 'unknown';
        $data      = null;

        foreach ($models as $i => $model) {
            $next = $models[$i + 1] ?? null;

            try {
                $res = Http::withHeaders(['content-type' => 'application/json'])
                    ->connectTimeout(10)
                    ->timeout(20)
                    ->post($this->modelUrl($model, 'generateContent', $key), $body);
            } catch (\Illuminate\Http\Client\ConnectionException $e) {
                // Timeout / connection failure — not an HTTP status, but still retryable.
                $lastError = $e->getMessage();
                $this->logFallback($model, $next, $lastError);
                continue;
            }

            if ($res->successful()) {
                $data = $res->json();
                break;
            }

            $lastError = $res->json('error.message') ?? 'unknown';

            // Only retry on overload/rate-limit; surface all other errors immediately.
            if (!in_array($res->status(), self::RETRYABLE_STATUSES, true)) {
                throw new RuntimeException('Gemini error: ' . $lastError);
            }

            $this->logFallback($model, $next, $lastError);
        }

        if ($data === null) {
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
            // thinkingBudget: 0 — without this, thinking-capable models in the fallback
            // chain (gemini-3.5-flash, gemini-3.1-flash-lite, gemini-2.5-flash) silently
            // spend part of maxOutputTokens on invisible reasoning tokens before the
            // visible reply even starts, which was cutting replies short once the budget
            // ran out. The execution prompt follows a fixed template — it doesn't need
            // extended reasoning, so the full budget should go to the visible reply.
            'generationConfig'   => [
                'maxOutputTokens' => $maxTokens,
                'temperature'     => 0.3,
                'thinkingConfig'  => ['thinkingBudget' => 0],
            ],
        ]);

        $models    = self::REPLY_FALLBACK_MODELS;
        $lastError = 'unknown';
        $success   = false;

        foreach ($models as $i => $model) {
            $next         = $models[$i + 1] ?? null;
            $url          = $this->modelUrl($model, 'streamGenerateContent', $key) . '&alt=sse';
            $buffer       = '';
            $rawBody      = '';
            $finishReason = null;

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
                CURLOPT_WRITEFUNCTION  => function ($ch, $chunk) use (&$buffer, &$rawBody, &$finishReason, $onChunk) {
                    $rawBody .= $chunk;
                    $buffer  .= $chunk;

                    while (($pos = strpos($buffer, "\n")) !== false) {
                        $line   = trim(substr($buffer, 0, $pos));
                        $buffer = substr($buffer, $pos + 1);

                        if (!str_starts_with($line, 'data: ')) continue;

                        $payload = json_decode(substr($line, 6), true);

                        if (!empty($payload['candidates'][0]['finishReason'])) {
                            $finishReason = $payload['candidates'][0]['finishReason'];
                        }

                        $parts = $payload['candidates'][0]['content']['parts'] ?? [];
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

                // "STOP" means the model finished naturally; anything else (most notably
                // "MAX_TOKENS") means the reply was cut off — surface it so truncated
                // replies are diagnosable instead of silently looking like a short answer.
                if ($finishReason && $finishReason !== 'STOP') {
                    Log::warning("[Gemini] {$model} stream ended with finishReason={$finishReason} (reply may be truncated)");
                }

                break;
            }

            $decoded   = json_decode($rawBody, true);
            $lastError = $curlError ?: ($decoded['error']['message'] ?? "HTTP {$statusCode}");

            // A connection-level failure (timeout, refused, etc.) has no HTTP status at
            // all — treat it as retryable the same as overload/rate-limit statuses.
            $isConnectionFailure = $statusCode === 0 && $curlError !== '';
            if (!$isConnectionFailure && !in_array($statusCode, self::RETRYABLE_STATUSES, true)) {
                throw new RuntimeException('Gemini stream error: ' . $lastError);
            }

            $this->logFallback($model, $next, $lastError);
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
