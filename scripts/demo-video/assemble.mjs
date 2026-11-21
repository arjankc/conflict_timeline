/**
 * Assemble the featured video from the run.mjs recording.
 *
 *   cmd /c "npm run demo:assemble"
 *
 * Inputs (scripts/demo-video/out/):
 *   main.webm      — playwright recording (whatever *.webm is newest)
 *   card.html      — title/outro card template
 * Outputs:
 *   featured-1080p.mp4 — 4s title + main + 6s outro, H.264 yuv420p 30fps
 *   captions.srt already written by run.mjs (sidecar for YouTube).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium } from 'playwright';

const sh = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, 'out');
const run = (bin, args) => sh(bin, args, { cwd: here }).then(
  (r) => { if (r.stdout?.trim()) console.log(r.stdout.trim()); },
  (e) => { console.error((e.stdout || '') + (e.stderr || e.message)); throw e; },
);

const CARDS = [
  {
    png: 'title.png',
    mp4: 'title.mp4',
    secs: 4,
    body: `<div class="kicker">DIGITAL ARCHIVE</div><h1>Nepal Conflict Timeline</h1>
      <p>A chronological record of Nepal&rsquo;s internal armed conflict<br>
      1 November 1995 &ndash; 8 September 2025 &middot; 2,112 events</p>
      <div class="meta">A 4-MINUTE GUIDED TOUR &middot; FOLLOW THE RED CURSOR</div>`,
  },
  {
    png: 'outro.png',
    mp4: 'outro.mp4',
    secs: 6,
    body: `<div class="kicker">OPEN SOURCE &middot; OPEN DATA</div><h1>Explore the archive</h1>
      <p>Shareable URLs &middot; per-card permalinks &middot; CSV / JSON export<br>
      Application code MIT &middot; event texts keep their sheet provenance</p>`,
  },
];

async function main() {
  const mains = fs.readdirSync(outDir)
    .filter((f) => /^.*\.webm$/.test(f))
    .map((f) => ({ f, t: fs.statSync(path.join(outDir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  const mainMp4 = path.join(outDir, 'main.mp4');
  if (mains.length === 0 && !fs.existsSync(mainMp4)) {
    throw new Error('No recording found in out/. Run `npm run demo:video` first.');
  }
  const mainWebm = mains.length > 0 ? path.join(outDir, mains[0].f) : null;
  console.log(mainWebm ? `> main recording: ${mains[0].f}` : '> reusing existing main.mp4');

  // Render title/outro cards with the same Chromium (no ffmpeg drawtext fonts needed).
  const template = fs.readFileSync(path.join(here, 'card.html'), 'utf8');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const card of CARDS) {
    await page.setContent(template.replace('<!--TITLE-->', card.body));
    await page.screenshot({ path: path.join(outDir, card.png) });
    console.log(`> card: ${card.png}`);
  }
  await browser.close();

  for (const card of CARDS) {
    await run('ffmpeg', ['-y', '-loop', '1', '-framerate', '30', '-i', path.join(outDir, card.png),
      '-t', String(card.secs), '-vf', 'scale=1920:1080,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', path.join(outDir, card.mp4)]);
  }
  if (mainWebm) {
    await run('ffmpeg', ['-y', '-i', mainWebm,
      '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p,fps=30',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart', mainMp4]);
  }

  fs.writeFileSync(path.join(outDir, 'concat.txt'),
    `file '${path.join(outDir, 'title.mp4')}'\nfile '${path.join(outDir, 'main.mp4')}'\nfile '${path.join(outDir, 'outro.mp4')}'\n`);
  await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', path.join(outDir, 'concat.txt'),
    '-c', 'copy', path.join(outDir, 'featured-video.mp4')]);

  // --- Click SFX: mix a UI blip at each recorded click mark ---
  // run.mjs stores click times relative to the main recording; the title
  // card shifts everything by TITLE_SECS.
  const TITLE_SECS = CARDS[0].secs, OUTRO_SECS = CARDS[1].secs;
  let clicks = [];
  try { clicks = JSON.parse(fs.readFileSync(path.join(outDir, 'clicks.json'), 'utf8')); }
  catch { console.log('> no clicks.json, shipping without SFX'); }
  if (clicks.length > 0) {
    const clickWav = path.join(outDir, 'click.wav');
    await run('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'sine=frequency=1700:duration=0.08',
      '-af', 'afade=t=out:st=0:d=0.08,volume=0.35', clickWav]);
    const { stdout: durOut } = await sh('ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1',
        path.join(outDir, 'main.mp4')]).catch(() => ({ stdout: '' }));
    const mainDur = Number.parseFloat(durOut) || 0;
    const args = [];
    const filt = [];
    clicks.forEach((t, i) => {
      const ms = Math.round((TITLE_SECS + Number(t)) * 1000);
      args.push('-i', clickWav);
      filt.push(`[${i}:a]adelay=${ms}|${ms}[c${i}]`);
    });
    const n = clicks.length;
    filt.push(`${Array.from({ length: n }, (_, i) => `[c${i}]`).join('')}amix=inputs=${n}:normalize=0,volume=${n},apad[sfx]`);
    await run('ffmpeg', ['-y', ...args,
      '-filter_complex', filt.join(';'), '-map', '[sfx]',
      '-t', String(TITLE_SECS + mainDur + OUTRO_SECS),
      path.join(outDir, 'sfx.m4a')]);
    await run('ffmpeg', ['-y', '-i', path.join(outDir, 'featured-video.mp4'), '-i', path.join(outDir, 'sfx.m4a'),
      '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart', '-shortest',
      path.join(outDir, 'featured-1080p.mp4')]);
  } else {
    fs.copyFileSync(path.join(outDir, 'featured-video.mp4'), path.join(outDir, 'featured-1080p.mp4'));
  }

  const { stdout } = await sh('ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration,size', '-of', 'default=noprint_wrappers=1',
      path.join(outDir, 'featured-1080p.mp4')]).catch(() => ({ stdout: '' }));
  console.log(`\nDone: ${path.join(outDir, 'featured-1080p.mp4')}\n${stdout}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
