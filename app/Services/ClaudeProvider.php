<?php

namespace App\Services;

use GuzzleHttp\Client;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class ClaudeProvider implements AiProvider
{
    public function chat(string $system, array $messages, int $maxTokens = 1024): string
    {
        $key = config('services.anthropic.key');
        if (!$key) throw new RuntimeException('ANTHROPIC_API_KEY not set');

        $res = Http::withHeaders([
            'x-api-key'         => $key,
            'anthropic-version' => '2023-06-01',
        ])->timeout(30)->post('https://api.anthropic.com/v1/messages', [
            'model'      => 'claude-haiku-4-5-20251001',
            'max_tokens' => $maxTokens,
            'system'     => $system,
            'messages'   => $messages,
        ]);

        $data = $res->json();
        if (!$res->successful() || empty($data['content'][0]['text'])) {
            throw new RuntimeException('Claude error: ' . ($data['error']['message'] ?? 'unknown'));
        }

        return $data['content'][0]['text'];
    }

    public function stream(string $system, array $messages, callable $onChunk, int $maxTokens = 1024): void
    {
        $key = config('services.anthropic.key');
        if (!$key) throw new RuntimeException('ANTHROPIC_API_KEY not set');

        $client = new Client();
        $response = $client->post('https://api.anthropic.com/v1/messages', [
            'headers' => [
                'x-api-key'         => $key,
                'anthropic-version' => '2023-06-01',
                'content-type'      => 'application/json',
            ],
            'json' => [
                'model'      => 'claude-haiku-4-5-20251001',
                'max_tokens' => $maxTokens,
                'system'     => $system,
                'messages'   => $messages,
                'stream'     => true,
            ],
            'stream' => true,
        ]);

        $body   = $response->getBody();
        $buffer = '';

        while (!$body->eof()) {
            $buffer .= $body->read(512);

            while (($pos = strpos($buffer, "\n")) !== false) {
                $line   = trim(substr($buffer, 0, $pos));
                $buffer = substr($buffer, $pos + 1);

                if (!str_starts_with($line, 'data: ')) continue;

                $payload = json_decode(substr($line, 6), true);
                if (
                    isset($payload['type']) &&
                    $payload['type'] === 'content_block_delta' &&
                    ($payload['delta']['type'] ?? '') === 'text_delta'
                ) {
                    $onChunk($payload['delta']['text']);
                }
            }
        }
    }
}
