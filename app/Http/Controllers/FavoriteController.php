<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    public function index(Request $request)
    {
        return response()->json([
            'productIds' => $request->user()->favoriteProducts()->pluck('products.id'),
        ]);
    }

    public function toggle(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|string|exists:products,id',
        ]);

        $user = $request->user();
        $exists = $user->favoriteProducts()->where('products.id', $data['product_id'])->exists();

        if ($exists) {
            $user->favoriteProducts()->detach($data['product_id']);
            $saved = false;
        } else {
            $user->favoriteProducts()->syncWithoutDetaching([$data['product_id']]);
            $saved = true;
        }

        return response()->json(['saved' => $saved]);
    }

    public function merge(Request $request)
    {
        $data = $request->validate([
            'product_ids'   => 'array',
            'product_ids.*' => 'string|exists:products,id',
        ]);

        $user = $request->user();
        if (!empty($data['product_ids'])) {
            $user->favoriteProducts()->syncWithoutDetaching($data['product_ids']);
        }

        return response()->json([
            'productIds' => $user->favoriteProducts()->pluck('products.id'),
        ]);
    }
}
