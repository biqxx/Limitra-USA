<?php

namespace App\Services;

use GuzzleHttp\Client;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GeminiProvider implements AiProvider
{
    /** Ordered fallback chain tried on 503 / overload responses. */
    private const FALLBACK_MODELS = [
        'gemini-3.5-flash',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
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
        foreach (self::FALLBACK_MODELS as $model) {
            $res  = Http::withHeaders(['content-type' => 'application/json'])
                ->timeout(30)
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

        $client  = new Client();
        $payload = [
            'headers' => ['content-type' => 'application/json'],
            'json'    => [
                'system_instruction' => ['parts' => [['text' => $system]]],
                'contents'           => $this->toContents($messages),
                'generationConfig'   => ['maxOutputTokens' => $maxTokens],
            ],
            'stream'  => true,
        ];

        $response  = null;
        $lastError = 'unknown';
        foreach (self::FALLBACK_MODELS as $model) {
            $url = $this->modelUrl($model, 'streamGenerateContent', $key) . '&alt=sse';
            try {
                $response = $client->post($url, $payload);
                break; // success
            } catch (\GuzzleHttp\Exception\ServerException $e) {
                // 503 — try next model in the chain
                $lastError = $e->getMessage();
                if ($e->getResponse()->getStatusCode() !== 503) {
                    throw $e;
                }
            }
        }

        if ($response === null) {
            throw new RuntimeException('Gemini stream error: ' . $lastError);
        }

        $body   = $response->getBody();
        $buffer = '';

        while (!$body->eof()) {
            $buffer .= $body->read(512);

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
