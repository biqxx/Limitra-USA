<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class StaticPageController extends Controller
{
    public function show(string $page)
    {
        return Inertia::render('StaticPage', [
            'page' => $page,
        ]);
    }
}
