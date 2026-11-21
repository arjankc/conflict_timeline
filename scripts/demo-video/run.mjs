/**
 * Record the featured walkthrough: serves dist/, drives Chromium with the
 * demo overlay (big cursor, focus glow, spotlights, click-SFX timing),
 * saves one continuous video.
 *
 *   cmd /c "npm run demo:video"            # full ~4.5 min, 1920x1080
 *   cmd /c "npm run demo:video -- --fast"  # ~45s smoke test (dwells / 8)
 *   cmd /c "npm run demo:video -- --no-build --scene=search"
 *
 * Output: scripts/demo-video/out/main.webm (+ captions.srt + title/outro PNGs).
 * Then:   cmd /c "npm run demo:assemble"
 */
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { SCENES } from './scenes.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const outDir = path.join(here, 'out');
const args = new Set(process.argv.slice(2));
const FAST = args.has('--fast');
const NO_BUILD = args.has('--no-build');
const onlyScene = (process.argv.find((a) => a.startsWith('--scene=')) || '').split('=')[1];
const PORT_HINT = 4173;
let PORT = PORT_HINT;
let ORIGIN = `http://127.0.0.1:${PORT}`;

fs.mkdirSync(outDir, { recursive: true });

// Click-SFX timing: seconds since the recording started (video clock).
// assemble.mjs mixes a click blip at each mark (offset by the title card).
const clickTimes = [];
let videoT0 = 0;
function markClick() {
  if (videoT0 > 0) clickTimes.push((Date.now() - videoT0) / 1000);
}

function sh(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn('cmd', ['/c', cmd], { cwd: root, stdio: 'inherit', ...opts });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function waitForServer(urls, tries = 60) {
  const list = Array.isArray(urls) ? urls : [urls];
  for (let i = 0; i < tries; i++) {
    for (const url of list) {
      try {
        const r = await fetch(url);
        if (r.ok) return;
      } catch { /* retry */ }
    }
    await sleep(1000);
  }
  throw new Error(`Server never came up: ${list.join(' / ')}`);
}

async function moveTo(page, selector) {
  const box = await page.locator(selector).first().boundingBox().catch(() => null);
  if (!box) { console.warn(`  [warn] move: no box for ${selector}`); return; }
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  // Glide in steps so the injected cursor visibly travels.
  const cur = await page.evaluate(() => ({ x: window.__mx ?? innerWidth / 2, y: window.__my ?? 120 }));
  const steps = 24;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(
      cur.x + ((x - cur.x) * i) / steps,
      cur.y + ((y - cur.y) * i) / steps,
      { steps: 1 },
    );
    await sleep(25);
  }
  await page.evaluate(([x, y]) => { window.__mx = x; window.__my = y; }, [x, y]);
}

async function doStep(page, step, scale) {
  const wait = (ms) => sleep(FAST ? Math.min(ms, 700) : ms);
  try {
    switch (step.op) {
      case 'goto': {
        await page.goto(ORIGIN + step.url, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => window.scrollTo(0, 0));
        await injectOverlay(page);
        // Gate on app readiness: feed renders only after the CSV parses.
        const ready = await Promise.race([
          page.locator('article.event-card').first().waitFor({ timeout: 45000 }).then(() => 'feed'),
          page.locator('[role="alert"]').first().waitFor({ timeout: 45000 }).then(() => 'error'),
        ]).catch(() => 'timeout');
        console.log(`  [ready] ${step.url} -> ${ready}`);
        const dbg = await page.evaluate(() => ({
          url: location.href,
          cards: document.querySelectorAll('article.event-card').length,
          search: document.querySelectorAll('#timeline-search').length,
          alert: document.querySelector('[role="alert"]')?.textContent?.slice(0, 120) || null,
        }));
        console.log(`  [dbg] ${JSON.stringify(dbg)}`);
        if (ready === 'error') {
          const msg = await page.locator('[role="alert"]').first().textContent().catch(() => '');
          console.log(`  [ready] error screen: ${(msg || '').slice(0, 200)}`);
        }
        await wait(1500);
        break;
      }
      case 'caption': break; // set by scene driver
      case 'move': await moveTo(page, step.selector); break;
      case 'click': {
        await moveTo(page, step.selector);
        await page.locator(step.selector).first().click({ timeout: 5000 });
        markClick();
        await wait(600);
        break;
      }
      case 'type': {
        await moveTo(page, step.selector);
        const loc = page.locator(step.selector).first();
        await loc.click({ timeout: 8000 });
        markClick();
        await loc.fill('');
        if (step.text) await loc.pressSequentially(step.text, { delay: FAST ? 20 : 90 });
        await wait(800);
        break;
      }
      case 'press': await page.keyboard.press(step.key); await wait(500); break;
      case 'scroll': await page.evaluate((y) => window.scrollBy({ top: y, behavior: 'smooth' }), step.y); await wait(1400); break;
      case 'scrollTo': {
        await page.locator(step.selector).first()
          .scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
        await page.evaluate((s) => {
          const clean = String(s).replace(/:visible/g, '') || 'body';
          const nodes = [...document.querySelectorAll(clean)];
          const el = nodes.find((n) => n.offsetParent !== null) || nodes[0];
          el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, step.selector);
        await wait(1300);
        break;
      }
      case 'zoom': await page.evaluate(([s, z]) => window.__demo?.zoom(s, z), [step.selector, step.scale ?? 1.4]); await wait(1000); break;
      case 'unzoom': await page.evaluate(() => window.__demo?.unzoom()); await wait(700); break;
      case 'focus': await page.evaluate((on) => window.__demo?.focus(on), step.on !== false); break;
      case 'spot': await page.evaluate((s) => window.__demo?.spotlight(s), step.selector); await wait(900); break;
      case 'unspot': await page.evaluate(() => window.__demo?.unspotlight()); await wait(500); break;
      case 'pulse': await page.evaluate((s) => window.__demo?.pulse(s), step.selector); await wait(1200); break;
      case 'say': await page.evaluate((t) => window.__demo?.say(t), step.text); await wait(1200); break;
      case 'wait': await wait((step.ms ?? 1000) * scale); break;
      case 'waitFor': await page.locator(step.selector).first().waitFor({ timeout: FAST ? 6000 : 30000 }).catch(() => console.warn(`  [warn] waitFor timeout: ${step.selector}`)); break;
      case 'results': {
        const n = await page.evaluate(() => document.querySelectorAll('article.event-card').length).catch(() => -1);
        console.log(`  [results] ${n} cards in feed`);
        if (n === 0) console.warn('  [warn] EMPTY FEED — a filter combination hid every event');
        break;
      }
      default: console.warn(`  [warn] unknown op ${step.op}`);
    }
  } catch (err) {
    console.warn(`  [warn] step ${step.op} ${step.selector ?? ''} failed: ${String(err).split('\n')[0]}`);
  }
}

async function injectOverlay(page) {
  await page.addScriptTag({ path: path.join(here, 'overlay.js') });
  await page.evaluate(() => {
    window.__mx = innerWidth / 2; window.__my = 140;
  });
}

function srtTime(ms) {
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  const x = String(ms % 1000).padStart(3, '0');
  return `${h}:${m}:${s},${x}`;
}

async function main() {
  console.log(`demo-video: ${FAST ? 'FAST smoke mode' : 'full take'} ${onlyScene ? `(scene=${onlyScene})` : '(all scenes)'}`);
  // A previous run can leave an orphaned preview holding the port
  // (taskkill races on Windows). Skip occupied ports instead of failing.
  for (let p = PORT_HINT; p < PORT_HINT + 20; p++) {
    try { await fetch(`http://127.0.0.1:${p}/`); console.log(`> port ${p} busy, trying next…`); }
    catch { PORT = p; break; }
  }
  ORIGIN = `http://127.0.0.1:${PORT}`;
  if (!NO_BUILD) {
    console.log('> building dist/ (skip with --no-build)…');
    await sh('npm run build');
  }

  console.log(`> starting preview on :${PORT}…`);
  // Spawn vite directly (not via cmd/npx shims) so preview.pid is the real
  // server process and preview.kill() actually ends it — no orphans.
  const preview = spawn(process.execPath, [
    'node_modules/vite/bin/vite.js', 'preview',
    '--port', String(PORT), '--strictPort', '--host', '127.0.0.1',
  ], { cwd: root, stdio: 'pipe' });
  preview.stdout?.on('data', (d) => process.stdout.write(`[preview] ${d}`));
  preview.stderr?.on('data', (d) => process.stderr.write(`[preview] ${d}`));
  await waitForServer([`${ORIGIN}/conflict_timeline/`, `http://localhost:${PORT}/conflict_timeline/`]);

  const scenes = onlyScene ? SCENES.filter((s) => s.id === onlyScene) : SCENES;
  if (scenes.length === 0) throw new Error(`Unknown --scene=${onlyScene}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: outDir, size: { width: 1920, height: 1080 } },
  });
  // Grant clipboard so permalink/citation copies don't throw mid-demo.
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await context.newPage();
  videoT0 = Date.now(); // video clock starts with the recording
  // Mute analytics noise; keep page fully functional offline of trackers.
  await page.route('https://www.googletagmanager.com/**', (r) => r.abort()).catch(() => {});
  await page.route('https://www.google-analytics.com/**', (r) => r.abort()).catch(() => {});

  const scale = FAST ? 1 / 8 : 1;
  const srt = [];
  let clock = 4000; // title card lead-in accounted in assemble

  for (const [i, scene] of scenes.entries()) {
    console.log(`\n=== scene ${i + 1}/${scenes.length}: ${scene.id} ===`);
    const t0 = Date.now();
    for (const step of scene.steps) {
      await doStep(page, step, scale);
    }
    // Hold the caption so each scene breathes (scaled in --fast).
    const elapsed = Date.now() - t0;
    const hold = Math.max(0, scene.dwell * scale - elapsed);
    if (hold > 0) await sleep(Math.min(hold, 12000));
    // Scene-boundary cleanup: unzoom/unspot so the next goto starts clean.
    await page.evaluate(() => { window.__demo?.unzoom(true); window.__demo?.unspotlight(); window.__demo?.say(''); });
    const dur = Date.now() - t0;
    srt.push({ i: i + 1, from: clock, to: clock + dur, title: scene.title, sub: scene.sub });
    clock += dur;
    console.log(`  scene wall time: ${(dur / 1000).toFixed(1)}s`);
  }

  // Title + outro stills (used by assemble.mjs).
  await page.goto(`${ORIGIN}/conflict_timeline/`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.evaluate(() => document.querySelector('#demo-caption')?.remove());
  await page.screenshot({ path: path.join(outDir, 'outro-still.png') }).catch(() => {});

  const video = page.video();
  await context.close();
  const videoPath = await video?.path().catch(() => null);
  await browser.close();
  preview.kill();

  const srtText = srt.map((e) => `${e.i}\n${srtTime(e.from)} --> ${srtTime(e.to)}\n${e.title}\n${e.sub}\n`).join('\n');
  fs.writeFileSync(path.join(outDir, 'captions.srt'), srtText);
  fs.writeFileSync(path.join(outDir, 'clicks.json'), JSON.stringify(clickTimes.map(Number)));
  console.log(`\nDone. Raw video: ${videoPath}\nCaptions: ${path.join(outDir, 'captions.srt')}\nClicks: ${clickTimes.length} marks`);
  console.log('Next: cmd /c "npm run demo:assemble"');

  // preview.pid is the real vite process (spawned directly, no shims).
  try { preview.kill(); } catch { /* already gone */ }
  try {
    spawnSync('taskkill', ['/PID', String(preview.pid), '/T', '/F'], { stdio: 'ignore' });
  } catch { /* already gone */ }
  preview.stdout?.destroy();
  preview.stderr?.destroy();
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
