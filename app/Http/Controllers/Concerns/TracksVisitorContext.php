<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\Request;
use Illuminate\Support\Str;

trait TracksVisitorContext
{
    /** Classifies a User-Agent into the three device buckets the analytics widgets assume. */
    private function detectDevice(?string $userAgent): string
    {
        $userAgent ??= '';

        return match (true) {
            (bool) preg_match('/iPad|Tablet/i', $userAgent) => 'Tablet',
            (bool) preg_match('/Mobi|Android|iPhone/i', $userAgent) => 'Mobile',
            default => 'Desktop',
        };
    }

    /** Extracts just the path from a Referer header, e.g. "https://site.com/looks?x=1" -> "/looks". */
    private function pathFromReferer(?string $referer): ?string
    {
        if (! $referer) {
            return null;
        }

        return parse_url($referer, PHP_URL_PATH) ?: null;
    }

    /** Exclude known automated clients from customer-facing analytics. */
    private function isBot(?string $userAgent): bool
    {
        if (blank($userAgent)) {
            return true;
        }

        return (bool) preg_match('/bot|crawler|spider|slurp|archiver|facebookexternalhit|embedly|preview|prerender|headless|lighthouse|pagespeed|pingdom|uptime|monitoring/i', $userAgent);
    }

    /** A readable bot label for operational logs; no raw user-agent is retained. */
    private function botName(?string $userAgent): string
    {
        return match (true) {
            (bool) preg_match('/googlebot/i', (string) $userAgent) => 'Googlebot',
            (bool) preg_match('/bingbot|msnbot/i', (string) $userAgent) => 'Bingbot',
            (bool) preg_match('/yandex/i', (string) $userAgent) => 'YandexBot',
            (bool) preg_match('/facebookexternalhit/i', (string) $userAgent) => 'Facebook crawler',
            (bool) preg_match('/ahrefs/i', (string) $userAgent) => 'AhrefsBot',
            (bool) preg_match('/semrush/i', (string) $userAgent) => 'SemrushBot',
            default => 'Automated client',
        };
    }

    /** A random, server-stored visitor token; only its hash is saved with analytics. */
    private function visitorHash(Request $request): string
    {
        $token = $request->session()->get('analytics_visitor_token');
        if (! $token) {
            $token = (string) Str::uuid();
            $request->session()->put('analytics_visitor_token', $token);
        }

        return hash('sha256', $token);
    }
}
