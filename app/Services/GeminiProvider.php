<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class GeminiProvider implements AiProvider
{
    /** Ordered fallback chain for the intent-classification call. */
    private const INTENT_FALLBACK_MODELS = [
        'gemini-3.5-flash-lite',
        'gemini-3.5-flash',
    ];

    /** Ordered fallback chain for the customer-facing streamed reply. */
    private const REPLY_FALLBACK_MODELS = [
        'gemini-3.5-flash-lite',
        'gemini-3.5-flash',
    ];

    /** Statuses worth retrying the next model for — overload/rate-limit, not real errors. */
    private const RETRYABLE_STATUSES = [503, 429];

    /** Gemini's own default cache lifetime is 60 min; ours is a little shorter so we never hand out a name it has just expired. */
    private const CACHE_TTL_SECONDS = 3540;

    /** How long to remember "this prompt isn't cacheable / creation failed" before retrying — avoids hammering the create endpoint every message. */
    private const CACHE_NEGATIVE_TTL_MINUTES = 10;

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

    // ── Explicit context caching ────────────────────────────────────────────────
    //
    // The chat system prompts (elo-core-rules + elo-scanning-prompt / elo-system-prompt,
    // placeholder-resolved) are effectively constant across every request — they only
    // change when an admin edits a site setting the prompts reference. Rather than
    // resend and reprocess that full text on every single message (it's sent twice per
    // turn: once for scanning, once for the reply), we cache it server-side with Gemini
    // and reference it by name. This is a pure cost/latency optimization — if caching is
    // disabled, fails, or a cached reference goes stale, everything falls back to sending
    // the system prompt inline exactly as before.

    private function cacheStoreKey(string $model, string $system): string
    {
        return 'gemini_context_cache:' . $model . ':' . md5($system);
    }

    /** Returns a `cachedContents/...` name for this exact (model, system prompt) pair, or null if unavailable/disabled. */
    private function getOrCreateCache(string $model, string $system): ?string
    {
        if (!config('services.gemini.context_caching', true)) return null;

        $key = config('services.gemini.key');
        if (!$key) return null;

        $cacheKey = $this->cacheStoreKey($model, $system);
        $cached   = Cache::get($cacheKey);

        if ($cached === 'unavailable') return null;
        if (is_string($cached)) return $cached;

        try {
            $res = Http::withHeaders(['content-type' => 'application/json'])
                ->connectTimeout(10)
                ->timeout(15)
                ->post("https://generativelanguage.googleapis.com/v1beta/cachedContents?key={$key}", [
                    'model'              => "models/{$model}",
                    'system_instruction' => ['parts' => [['text' => $system]]],
                    'ttl'                => self::CACHE_TTL_SECONDS . 's',
                ]);
        } catch (\Throwable $e) {
            Log::warning('[Gemini] Cache create request failed', ['model' => $model, 'error' => $e->getMessage()]);
            Cache::put($cacheKey, 'unavailable', now()->addMinutes(self::CACHE_NEGATIVE_TTL_MINUTES));
            return null;
        }

        $name = $res->successful() ? $res->json('name') : null;

        if (!$name) {
            Log::warning('[Gemini] Cache create rejected', [
                'model'  => $model,
                'status' => $res->status(),
                'error'  => $res->json('error.message') ?? $res->body(),
            ]);
            Cache::put($cacheKey, 'unavailable', now()->addMinutes(self::CACHE_NEGATIVE_TTL_MINUTES));
            return null;
        }

        Cache::put($cacheKey, $name, now()->addSeconds(self::CACHE_TTL_SECONDS));
        return $name;
    }

    /** Forgets a cache mapping — used when a cached reference turns out to be stale server-side. */
    private function invalidateCache(string $model, string $system): void
    {
        Cache::forget($this->cacheStoreKey($model, $system));
    }

    /**
     * Sends a generateContent request for $model, preferring a cached system prompt when
     * available. If that attempt fails, invalidates the cache and retries once with the
     * system prompt sent inline — a cached reference can go stale between our TTL
     * bookkeeping and Gemini's own expiry, and this keeps that self-healing rather than
     * fatal. $body must NOT already include a system field.
     */
    private function sendWithCacheFallback(string $model, string $key, array $body, string $system): \Illuminate\Http\Client\Response
    {
        $cacheName = $this->getOrCreateCache($model, $system);
        $url       = $this->modelUrl($model, 'generateContent', $key);
        $inline    = ['system_instruction' => ['parts' => [['text' => $system]]]];

        $res = Http::withHeaders(['content-type' => 'application/json'])
            ->connectTimeout(10)->timeout(20)
            ->post($url, $body + ($cacheName ? ['cachedContent' => $cacheName] : $inline));

        if (!$res->successful() && $cacheName) {
            $this->invalidateCache($model, $system);
            $res = Http::withHeaders(['content-type' => 'application/json'])
                ->connectTimeout(10)->timeout(20)
                ->post($url, $body + $inline);
        }

        return $res;
    }

    public function chat(string $system, array $messages, int $maxTokens = 1024, bool $thinking = false, ?array $responseSchema = null): string
    {
        $key = config('services.gemini.key');
        if (!$key) throw new RuntimeException('GEMINI_API_KEY not set');

        $body = [
            'contents'         => $this->toContents($messages),
            'generationConfig' => ['maxOutputTokens' => $maxTokens],
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
                $res = $this->sendWithCacheFallback($model, $key, $body, $system);
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

    /** One raw-cURL streamGenerateContent attempt. Returns ['statusCode', 'curlError', 'rawBody', 'finishReason']. */
    private function curlStreamAttempt(string $url, string $bodyJson, callable $onChunk): array
    {
        $buffer       = '';
        $rawBody      = '';
        $finishReason = null;

        // Raw cURL (not Guzzle's 'stream' option) — Guzzle's stream option routes
        // through PHP's fopen-based StreamHandler instead of cURL, which fails to
        // connect in this environment even though cURL itself works fine.
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $bodyJson,
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

        return compact('statusCode', 'curlError', 'rawBody', 'finishReason');
    }

    public function stream(string $system, array $messages, callable $onChunk, int $maxTokens = 1024): void
    {
        $key = config('services.gemini.key');
        if (!$key) throw new RuntimeException('GEMINI_API_KEY not set');

        // thinkingBudget: 0 — without this, thinking-capable models in the fallback
        // chain (gemini-3.5-flash, gemini-3.1-flash-lite, gemini-2.5-flash) silently
        // spend part of maxOutputTokens on invisible reasoning tokens before the
        // visible reply even starts, which was cutting replies short once the budget
        // ran out. The execution prompt follows a fixed template — it doesn't need
        // extended reasoning, so the full budget should go to the visible reply.
        $baseBody = [
            'contents'         => $this->toContents($messages),
            'generationConfig' => [
                'maxOutputTokens' => $maxTokens,
                'temperature'     => 0.3,
                'thinkingConfig'  => ['thinkingBudget' => 0],
            ],
        ];
        $inline = ['system_instruction' => ['parts' => [['text' => $system]]]];

        $models    = self::REPLY_FALLBACK_MODELS;
        $lastError = 'unknown';
        $success   = false;

        foreach ($models as $i => $model) {
            $next = $models[$i + 1] ?? null;
            $url  = $this->modelUrl($model, 'streamGenerateContent', $key) . '&alt=sse';

            $cacheName = $this->getOrCreateCache($model, $system);
            $bodyJson  = json_encode($baseBody + ($cacheName ? ['cachedContent' => $cacheName] : $inline));

            $attempt = $this->curlStreamAttempt($url, $bodyJson, $onChunk);

            // A cached reference can go stale server-side between our TTL bookkeeping and
            // Gemini's own expiry — if the request fails while using one, invalidate it and
            // retry this same model once with the system prompt sent inline before giving up.
            if (!($attempt['statusCode'] >= 200 && $attempt['statusCode'] < 300 && !$attempt['curlError']) && $cacheName) {
                $this->invalidateCache($model, $system);
                $bodyJson = json_encode($baseBody + $inline);
                $attempt  = $this->curlStreamAttempt($url, $bodyJson, $onChunk);
            }

            $statusCode   = $attempt['statusCode'];
            $curlError    = $attempt['curlError'];
            $rawBody      = $attempt['rawBody'];
            $finishReason = $attempt['finishReason'];

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
