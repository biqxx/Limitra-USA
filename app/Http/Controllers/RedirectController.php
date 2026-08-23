<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\TracksVisitorContext;
use App\Models\BotRedirectRequest;
use App\Models\Click;
use App\Models\Product;
use Illuminate\Http\Request;

class RedirectController extends Controller
{
    use TracksVisitorContext;

    /**
     * Outbound affiliate link: logs the click, then redirects to the retailer.
     */
    public function go(Request $request, string $id)
    {
        $product = Product::findOrFail($id);

        if (! $product->affiliate_url) {
            abort(404);
        }

        if ($this->isBot($request->userAgent())) {
            BotRedirectRequest::create([
                'product_id' => $product->id,
                'bot_name' => $this->botName($request->userAgent()),
            ]);

            return response()->noContent();
        }

        Click::create([
            'product_id' => $product->id,
            'source_page' => $this->pathFromReferer($request->headers->get('referer')),
            'device' => $this->detectDevice($request->userAgent()),
        ]);

        return redirect()->away($product->affiliate_url);
    }
}
