<?php

namespace App\Services;

use GuzzleHttp\Client;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GeminiProvider implements AiProvider
{
    public function chat(string $system, array $messages, int $maxTokens = 1024): string
    {
        $key = config('services.gemini.key');
        if (!$key) throw new RuntimeException('GEMINI_API_KEY not set');

        $res = Http::withHeaders(['content-type' => 'application/json'])
            ->timeout(30)
            ->post('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' . $key, [
                'system_instruction' => ['parts' => [['text' => $system]]],
                'contents'           => $this->toContents($messages),
                'generationConfig'   => ['maxOutputTokens' => $maxTokens],
            ]);

        $data = $res->json();
        if (!$res->successful() || empty($data['candidates'][0]['content']['parts'][0]['text'])) {
            throw new RuntimeException('Gemini error: ' . ($data['error']['message'] ?? 'unknown'));
        }

        return $data['candidates'][0]['content']['parts'][0]['text'];
    }

    public function stream(string $system, array $messages, callable $onChunk, int $maxTokens = 1024): void
    {
        $key = config('services.gemini.key');
        if (!$key) throw new RuntimeException('GEMINI_API_KEY not set');

        $client   = new Client();
        $url      = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=' . $key . '&alt=sse';
        $response = $client->post($url, [
            'headers' => ['content-type' => 'application/json'],
            'json'    => [
                'system_instruction' => ['parts' => [['text' => $system]]],
                'contents'           => $this->toContents($messages),
                'generationConfig'   => ['maxOutputTokens' => $maxTokens],
            ],
            'stream'  => true,
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
                $text    = $payload['candidates'][0]['content']['parts'][0]['text'] ?? null;
                if ($text !== null) $onChunk($text);
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
