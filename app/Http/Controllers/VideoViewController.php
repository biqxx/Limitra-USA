<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\TracksVisitorContext;
use App\Models\Video;
use App\Models\VideoView;
use Illuminate\Http\Request;

class VideoViewController extends Controller
{
    use TracksVisitorContext;

    public function store(Request $request, string $id)
    {
        $video = Video::where('id', $id)->orWhere('vid_id', $id)->firstOrFail();

        $request->validate([
            'source_page' => 'nullable|string|max:255',
        ]);

        if ($this->isBot($request->userAgent())) {
            return response()->json(['ok' => true, 'ignored' => 'bot']);
        }

        $visitorHash = $this->visitorHash($request);
        $viewDate = now()->toDateString();

        VideoView::firstOrCreate(
            ['dedupe_key' => hash('sha256', implode('|', ['video', $video->id, $visitorHash, $viewDate]))],
            [
                'video_id' => $video->id,
                'source_page' => $request->input('source_page'),
                'device' => $this->detectDevice($request->userAgent()),
                'visitor_hash' => $visitorHash,
                'view_date' => $viewDate,
            ]
        );

        return response()->json(['ok' => true]);
    }
}
