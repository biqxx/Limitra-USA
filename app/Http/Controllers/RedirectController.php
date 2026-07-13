<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\TracksVisitorContext;
use App\Models\Click;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RedirectController extends Controller
{
    use TracksVisitorContext;

    /**
     * Outbound "cloaked" affiliate link: logs a Click with a fresh SubID, then
     * 302s to the real retailer URL with that SubID appended so an imported
     * conversion CSV can be matched back to the click that produced it.
     */
    public function go(Request $request, string $id)
    {
        $product = Product::findOrFail($id);

        if (! $product->affiliate_url) {
            abort(404);
        }

        $subId = (string) Str::uuid();

        Click::create([
            'product_id' => $product->id,
            'source_page' => $this->pathFromReferer($request->headers->get('referer')),
            'device' => $this->detectDevice($request->userAgent()),
            'sub_id' => $subId,
        ]);

        $separator = str_contains($product->affiliate_url, '?') ? '&' : '?';

        return redirect()->away($product->affiliate_url . $separator . 'subid=' . $subId);
    }
}
