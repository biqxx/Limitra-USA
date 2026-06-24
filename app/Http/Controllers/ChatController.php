<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ChatController extends Controller
{
    public function message(Request $request)
    {
        $request->validate(['messages' => 'required|array']);

        $apiKey = config('services.anthropic.key');
        if (!$apiKey) {
            return response()->json(['error' => 'Anthropic API key not configured'], 500);
        }

        $response = Http::withHeaders([
            'x-api-key' => $apiKey,
            'anthropic-version' => '2023-06-01',
            'content-type' => 'application/json',
        ])->post('https://api.anthropic.com/v1/messages', [
            'model' => 'claude-haiku-4-5-20251001',
            'max_tokens' => 1024,
            'system' => 'You are a helpful shopping assistant for Limitra USA, a curated product discovery platform. Help users find fashion, beauty, home, and lifestyle products. Be warm, editorial, and concise.',
            'messages' => $request->input('messages'),
        ]);

        return response()->json($response->json());
    }
}
