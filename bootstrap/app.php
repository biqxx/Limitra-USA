<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
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
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
        // Error page temporarily disabled — restore after debugging
        // $exceptions->respond(function (Response $response, \Throwable $e, Request $request) {
        //     if (! $request->is('api/*') && in_array($response->getStatusCode(), [404, 500, 503])) {
        //         return Inertia::render('Error', [
        //             'status' => $response->getStatusCode(),
        //         ])->toResponse($request)->setStatusCode($response->getStatusCode());
        //     }
        //     return $response;
        // });
    })->create();
