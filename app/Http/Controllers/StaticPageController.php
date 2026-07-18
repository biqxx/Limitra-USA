<?php

namespace App\Http\Controllers;

use App\Models\StaticPage;
use Inertia\Inertia;

class StaticPageController extends Controller
{
    public function show(string $page)
    {
        $staticPage = StaticPage::where('key', $page)->firstOrFail();

        return Inertia::render('StaticPage', [
            'page' => $staticPage,
        ]);
    }
}
