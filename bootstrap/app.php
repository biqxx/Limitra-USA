<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);
        $middleware->alias([
            'admin' => \App\Http\Middleware\EnsureIsAdmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Routes that return JSON (either api/* or admin upload endpoints)
        $isJsonEndpoint = fn (Request $r) =>
            $r->is('api/*') || $r->is('admin/*/upload') || $r->is('admin/*/bulk-import') || $r->is('newsletter/*') || $r->is('videos/*/track-view');

        $exceptions->shouldRenderJsonWhen($isJsonEndpoint);

        $exceptions->report(function (\Throwable $e) use ($isJsonEndpoint) {
            $request = request();
            if ($isJsonEndpoint($request)) {
                Log::error('[API] ' . get_class($e) . ': ' . $e->getMessage(), [
                    'path'   => $request->path(),
                    'method' => $request->method(),
                    'file'   => $e->getFile() . ':' . $e->getLine(),
                    'trace'  => collect($e->getTrace())->take(5)->map(
                        fn ($f) => ($f['file'] ?? '') . ':' . ($f['line'] ?? '')
                    )->values()->all(),
                ]);
            }
        });

        $exceptions->respond(function (Response $response, \Throwable $e, Request $request) use ($isJsonEndpoint) {
            if (! $isJsonEndpoint($request) && in_array($response->getStatusCode(), [404, 500, 503])) {
                return Inertia::render('Error', [
                    'status' => $response->getStatusCode(),
                ])->toResponse($request)->setStatusCode($response->getStatusCode());
            }
            return $response;
        });
    })->create();
