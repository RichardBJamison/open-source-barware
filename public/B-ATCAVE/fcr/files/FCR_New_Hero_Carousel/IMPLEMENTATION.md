# FCR New Hero Carousel — Web Developer Package

**Client:** Faber Capital Resources  
**Prepared by:** Resonant / Richard Jamison  
**Purpose:** Hand this package to your web company so they can implement the hero motion on the live site without redesigning the layout.

## What this is

A continuous **hero video boomerang** controller:

- Pre-baked **forward + reverse** MP4 (or bake from your current hero clip)
- Constant **0.65×** playback
- **No freeze / no end-cap hold** — when the cycle ends, it returns immediately
- Muted, playsinline, autoplay-friendly (iOS/Safari safe)

This is the motion used on the FCR mockup homepage hero.

## Files

| File | Use |
|------|-----|
| `hero-boomerang.js` | Drop into theme assets and load on the homepage |
| `hero-video-snippet.html` | Example `<video>` + script include |
| `IMPLEMENTATION.md` | This guide |

Optional asset (host on your CDN/theme):

- `hero-boomerang.mp4` — forward+reverse bake of the current FCR hero (request from Richard if not attached; ~4–10MB)

## Install (WordPress / RF Site Builder / custom)

1. Upload `hero-boomerang.js` to the theme (e.g. `assets/js/hero-boomerang.js`).
2. Upload the boomerang MP4 (or bake one — see below).
3. On the homepage hero/cover block, set the video to:

```html
<video
  id="fcr-hero-video"
  class="wp-block-cover__video-background"
  autoplay
  muted
  playsinline
  preload="auto"
  poster="/path/to/poster.jpg"
  src="/path/to/hero-boomerang.mp4"
  data-object-fit="cover"
  aria-hidden="true"
></video>
```

**Important:**

- Give the video `id="fcr-hero-video"` (required by the script).
- Remove HTML `loop` — the script owns the cycle.
- Keep `muted` + `playsinline` for mobile autoplay.

4. Before `</body>` on the homepage only:

```html
<script src="/path/to/hero-boomerang.js?v=1"></script>
```

5. Hard-refresh and confirm: video plays continuously, reverses via baked reverse half, restarts with no pause.

## Bake your own boomerang MP4 (ffmpeg)

If you keep the live site’s existing hero clip:

```bash
# forward
ffmpeg -y -i hero-source.mp4 -an -c:v libx264 -preset medium -crf 23 -movflags +faststart forward.mp4

# reverse
ffmpeg -y -i hero-source.mp4 -vf reverse -an -c:v libx264 -preset medium -crf 23 -movflags +faststart backward.mp4

# concat + moov at front (required for streaming)
printf "file 'forward.mp4'\nfile 'backward.mp4'\n" > concat.txt
ffmpeg -y -f concat -safe 0 -i concat.txt -c:v libx264 -preset medium -crf 23 -an -movflags +faststart -pix_fmt yuv420p hero-boomerang.mp4
```

**Do not** use stream-copy concat alone without a final remux that puts the `moov` atom first — browsers will stall on the poster until the full file downloads.

## Tuning (optional)

In `hero-boomerang.js`:

- `CRUISE = 0.65` — overall speed (lower = slower)

No hold / slow-zone constants: ends return immediately.

## Support notes for FCR’s web company

- Layout, copy, colors, and cover structure stay as-is — this is motion only.
- Works with standard WP cover video background CSS (`object-fit: cover`).
- Test iOS Safari (muted + playsinline required).
- Cache-bust the JS and MP4 query string after each update (`?v=YYYYMMDD`).

## Contact

Questions on implementation: Richard via FCR Capital Nexus Communications.
