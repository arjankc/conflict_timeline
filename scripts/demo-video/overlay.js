/**
 * In-page overlay for the programmatic featured-video walkthrough.
 * Injected via run.mjs with page.addScriptTag(). No build step, no app changes.
 *
 * Exposes window.__demo:
 *   focus(on) — cursor-following spotlight: dims everything outside a
 *     soft circle around the cursor so the action stays readable
 *   zoom(selector, scale) / unzoom()
 *   spotlight(selector) / unspotlight()
 *   pulse(selector)
 *   say(text)  — small toast-style callout near cursor
 *
 * The big cursor follows the REAL mouse (playwright mouse.move drives it),
 * so cursor motion in the video is smooth without extra animation code.
 */
(function () {
  if (window.__demo) return;

  const CSS = `
    * { cursor: none !important; }
    #demo-cursor { position: fixed; left: 0; top: 0; z-index: 2147483646;
      width: 44px; height: 44px; margin: -8px 0 0 -8px; pointer-events: none;
      transition: transform 60ms linear; }
    #demo-cursor .dot { position: absolute; left: 14px; top: 14px; width: 16px; height: 16px;
      border-radius: 50%; background: #8b1e12; border: 3px solid #fff;
      box-shadow: 0 1px 8px rgba(0,0,0,.45); }
    #demo-cursor .ring { position: absolute; left: 4px; top: 4px; width: 36px; height: 36px;
      border-radius: 50%; border: 2px solid rgba(139,30,18,.85); }
    #demo-ripple { position: fixed; z-index: 2147483646; pointer-events: none;
      width: 54px; height: 54px; margin: -27px 0 0 -27px; border-radius: 50%;
      border: 3px solid #8b1e12; opacity: 0; }
    #demo-ripple.go { animation: demoRipple .55s ease-out; }
    @keyframes demoRipple { 0% { transform: scale(.4); opacity: 1; }
      100% { transform: scale(1.4); opacity: 0; } }
    #demo-focus { position: fixed; inset: 0; z-index: 2147483638;
      pointer-events: none; opacity: 0; transition: opacity .5s;
      background: radial-gradient(circle 300px at var(--fx, 50vw) var(--fy, 200px),
        rgba(0,0,0,0) 0, rgba(0,0,0,0) 170px, rgba(12,10,8,.40) 300px); }
    #demo-focus.on { opacity: 1; }
    .demo-spot-target { position: relative; z-index: 2147483640 !important;
      box-shadow: 0 0 0 9999px rgba(10,8,7,.55), 0 0 0 3px #8b1e12 !important;
      border-radius: 8px; }
    .demo-zoom { transition: transform 1.1s cubic-bezier(.25,.7,.25,1) !important;
      transform-origin: center center; will-change: transform; }
    .demo-pulse { animation: demoPulse 1s ease-in-out 2; }
    @keyframes demoPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(139,30,18,0); }
      50% { box-shadow: 0 0 0 5px rgba(139,30,18,.65); } }
    #demo-say { position: fixed; z-index: 2147483647; pointer-events: none;
      background: #8b1e12; color: #fff; font: 600 14px/1.3 system-ui, sans-serif;
      padding: 7px 12px; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,.35);
      opacity: 0; transition: opacity .25s; max-width: 320px; }
  `;
  const style = document.createElement('style');
  style.id = 'demo-overlay-style';
  style.textContent = CSS;
  document.documentElement.appendChild(style);

  const cursor = document.createElement('div');
  cursor.id = 'demo-cursor';
  cursor.innerHTML = '<div class="ring"></div><div class="dot"></div>';
  document.documentElement.appendChild(cursor);

  const ripple = document.createElement('div');
  ripple.id = 'demo-ripple';
  document.documentElement.appendChild(ripple);

  const focus = document.createElement('div');
  focus.id = 'demo-focus';
  focus.className = 'on'; // glow follows every navigation; scenes turn it off only to end
  document.documentElement.appendChild(focus);

  const say = document.createElement('div');
  say.id = 'demo-say';
  document.documentElement.appendChild(say);

  let mx = innerWidth / 2, my = 200;
  cursor.style.transform = `translate(${mx}px, ${my}px)`;
  focus.style.setProperty('--fx', `${mx}px`);
  focus.style.setProperty('--fy', `${my}px`);
  addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    cursor.style.transform = `translate(${mx}px, ${my}px)`;
    focus.style.setProperty('--fx', `${mx}px`);
    focus.style.setProperty('--fy', `${my}px`);
  }, { passive: true });
  addEventListener('mousedown', (e) => {
    ripple.style.left = e.clientX + 'px';
    ripple.style.top = e.clientY + 'px';
    ripple.classList.remove('go');
    void ripple.offsetWidth;
    ripple.classList.add('go');
  }, { passive: true });

  // `:visible` is a Playwright locator pseudo-class, not valid in
  // querySelector. Strip it and prefer the rendered (non-hidden) match,
  // so the same selector works in Playwright locators and here.
  function q(selector) {
    const clean = String(selector).replace(/:visible/g, '') || 'body';
    const nodes = [...document.querySelectorAll(clean)];
    return nodes.find((n) => n.offsetParent !== null) || nodes[0] || null;
  }

  // Subtle "focus" zoom: small enough to avoid layout overlap, slow
  // enough to read as a camera move. Scroll settles first, then scale.
  let zoomed = null;
  function zoom(selector, scale = 1.5) {
    unzoom(true);
    const el = q(selector);
    if (!el) return false;
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    el.classList.add('demo-zoom');
    setTimeout(() => {
      el.style.transform = `scale(${scale})`;
    }, 900);
    zoomed = el;
    return true;
  }
  function unzoom(instant) {
    const el = zoomed;
    zoomed = null;
    if (!el) return;
    if (instant) {
      el.style.transform = '';
      el.classList.remove('demo-zoom');
      return;
    }
    // Ease back (transition still applies), then drop the class.
    el.style.transform = '';
    setTimeout(() => el.classList.remove('demo-zoom'), 1150);
  }
  function spotlight(selector) {
    unspotlight();
    const el = selector ? q(selector) : null;
    if (!el) return false;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(() => el.classList.add('demo-spot-target'), 350);
    return true;
  }
  function unspotlight() {
    document.querySelectorAll('.demo-spot-target')
      .forEach((el) => el.classList.remove('demo-spot-target'));
  }
  function pulse(selector) {
    const el = q(selector);
    if (!el) return false;
    el.classList.remove('demo-pulse');
    void el.offsetWidth;
    el.classList.add('demo-pulse');
    return true;
  }

  window.__demo = {
    focus(on) {
      focus.classList.toggle('on', on !== false);
    },
    zoom, unzoom, spotlight, unspotlight, pulse,
    say(text, ms = 2200) {
      if (!text) { say.style.opacity = '0'; return; }
      say.textContent = text;
      say.style.left = Math.min(mx + 28, innerWidth - 340) + 'px';
      say.style.top = Math.max(my - 70, 10) + 'px';
      say.style.opacity = '1';
      clearTimeout(say._t);
      say._t = setTimeout(() => { say.style.opacity = '0'; }, ms);
    },
  };
})();
