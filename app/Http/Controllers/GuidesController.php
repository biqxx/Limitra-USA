<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Guide;
use App\Models\Video;
use Inertia\Inertia;

class GuidesController extends Controller
{
    public function index()
    {
        $guides = Guide::orderByDesc('featured')->orderBy('sort_order')->get();
        $articles = Article::orderByDesc('featured')->get();
        $videos = Video::allWithProducts();

        return Inertia::render('Guides', [
            'guides' => $guides,
            'articles' => $articles,
            'videos' => $videos,
        ]);
    }
}
