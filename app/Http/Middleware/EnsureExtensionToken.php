<?php

namespace App\Http\Middleware;

use App\Models\SiteSetting;
use Closure;
use Illuminate\Http\Request;

class EnsureExtensionToken
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();
        $expected = SiteSetting::getValue('extension_api_token', '');

        if (!$expected || !$token || !hash_equals($expected, $token)) {
            abort(401, 'Invalid or missing extension token.');
        }

        return $next($request);
    }
}
