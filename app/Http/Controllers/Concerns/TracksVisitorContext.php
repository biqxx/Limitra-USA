<?php

namespace App\Http\Controllers\Concerns;

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
}
