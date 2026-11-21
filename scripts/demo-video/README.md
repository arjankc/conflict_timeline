# Featured video (programmatic walkthrough)

Caption-led, 1080p landscape, recorded against a local `dist/` build.
Big cursor with click ripples, a cursor-following focus glow, section
spotlights, and UI click SFX mixed in post. No baked-in text overlays —
chapter captions ship separately as `captions.srt`. No manual screen capture.

## 1. Record

```sh
# full ~4.5-minute tour (builds dist/ first)
cmd /c "npm run demo:video"

# smoke test: same scenes, ~1/8 dwell each
cmd /c "npm run demo:video -- --fast"

# iterate on one scene without rebuilding
cmd /c "npm run demo:video -- --no-build --scene=search"
```

Output: `scripts/demo-video/out/main*.webm` + `captions.srt` + `clicks.json`
(click timestamps, seconds into the main recording).

Scenes live in `scenes.mjs` (8 chapters: intro, feed, search, filters, years,
districts-share, reading, outro). Overlay primitives (cursor, ripple, caption,
spotlight, zoom, pulse) live in `overlay.js` — injected at runtime, zero app
changes.

## 2. Assemble

```sh
cmd /c "npm run demo:assemble"
```

Renders title/outro cards via Chromium, normalizes the recording to
`1920x1080 H.264`, mixes a UI click blip at each `clicks.json` mark
(synthesized with ffmpeg, offset past the 4s title card), concatenates
`title (4s) + main + outro (6s)` into `out/featured-1080p.mp4`. Upload
`captions.srt` alongside for YouTube. Re-running assemble without a fresh
recording reuses the newest `main.mp4` (handy for card/SFX tweaks).

## Notes

- Step ops are failure-tolerant: a missing selector logs `[warn]` and the
  recording continues so one flaky click never kills a 4-minute take.
- Clipboard permissions are granted so permalink/citation copies don't throw.
- Analytics requests are aborted in-page; the video shows the app only.
- If Chromium is missing: `npx playwright install chromium`.
