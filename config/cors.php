<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Scoped narrowly to the ProductPicker Chrome extension's own API prefix —
    | every other route in this app is same-origin (session cookie + CSRF) and
    | doesn't need CORS at all. The extension calls these routes from a
    | chrome-extension://<id> origin with a bearer token instead of a session,
    | so the real access boundary is EnsureExtensionToken, not this file.
    |
    | Pin a "key" in the extension's manifest.json so its extension ID (and
    | therefore its chrome-extension://<id> origin) is stable, then set
    | EXTENSION_ORIGIN in .env to that exact origin instead of relying on '*'.
    |
    */

    'paths' => ['api/extension/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter([env('EXTENSION_ORIGIN')]) ?: ['*'],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Authorization', 'Content-Type', 'Accept'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
