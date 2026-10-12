/*
  motion.js — shared motion layer for every page (pairs with motion.css).

  Loaded in <head> next to support.js. It never touches React-owned markup
  except through inline styles React doesn't manage, or by filling elements
  that are left empty in the templates. Effects are opted into per element:

    data-tilt            3D tilt toward the cursor + teal glare
    data-magnetic        element drifts toward the cursor (uses `translate`)
    data-preview="url"   floating image preview trailing the cursor on hover
    data-cursor="LABEL"  cursor ring grows and shows LABEL over the element
    data-scramble        text decodes from random glyphs when scrolled into view
    data-timecode        empty element becomes a running HH:MM:SS:FF timecode
    data-badge="TEXT"    empty element becomes a spinning circular text badge
    data-iris            empty element becomes a 3D camera aperture driven by scroll
    data-wave="N"        empty element becomes an animated N-bar waveform
    data-focus           list whose [data-focus-item] children sit slightly blurred and
                         snap into focus on hover (tap on touch screens): rack focus
    data-lens="a,b,c"    empty element becomes a lens focus ring turned by the wheel
                         (page stays still) or a sideways drag; names stay upright and
                         the one under the top index lights up

  Global extras: page-transition curtain, scroll progress bar, film grain, cursor,
  and a mail chooser — every mailto: link opens a panel to pick Gmail, Outlook,
  the device's mail app, or copy the address, instead of launching the mail app.
*/
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  const done = new WeakSet();

  if (!reduce) document.documentElement.classList.add('rs-enter');

  const el = (tag, cls, html) => { const n = document.createElement(tag); n.className = cls; if (html) n.innerHTML = html; return n; };
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- Global chrome ---------- */
  function buildChrome() {
    document.body.append(el('div', 'rs-progress'), el('div', 'rs-grain'), el('div', 'rs-curtain', '<span>RS</span>'));
    trackProgress();
    if (!reduce) wireTransitions();
    if (fine && !reduce) buildCursor();
  }

  function trackProgress() {
    const bar = document.querySelector('.rs-progress');
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? scrollY / max : 0) + ')';
    };
    addEventListener('scroll', update, { passive: true }); addEventListener('resize', update); update();
  }

  // Internal page links play the teal curtain before navigating.
  function wireTransitions() {
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      const samePage = url.pathname === location.pathname;
      if (url.origin !== location.origin || !url.pathname.endsWith('.html') || samePage) return;
      e.preventDefault();
      document.documentElement.classList.add('rs-leave');
      setTimeout(() => { location.href = url.href; }, 560);
    });
    addEventListener('pageshow', e => { if (e.persisted) document.documentElement.classList.remove('rs-leave'); });
  }

  /* ---------- Mail chooser ---------- */
  // mailto: links ask the visitor where to write from instead of launching the default mail app.
  function wireMailChooser() {
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="mailto:"]');
      if (!a || a.closest('.rs-mail') || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      openMailChooser(a.href, a);
    });
  }

  function mailLinks(href) {
    const url = new URL(href), to = decodeURIComponent(url.pathname), subject = url.searchParams.get('subject') || '';
    const enc = encodeURIComponent;
    return {
      to, mailto: href,
      gmail: 'https://mail.google.com/mail/?view=cm&fs=1&to=' + enc(to) + (subject ? '&su=' + enc(subject) : ''),
      outlook: 'https://outlook.live.com/mail/0/deeplink/compose?to=' + enc(to) + (subject ? '&subject=' + enc(subject) : '')
    };
  }

  function buildMailPanel(links) {
    const panel = el('div', 'rs-mail',
      '<div class="rs-mail-box" role="dialog" aria-modal="true" aria-labelledby="rs-mail-t">' +
        '<button class="rs-mail-x" type="button" aria-label="Chiudi">✕</button>' +
        '<p class="rs-mail-k">Scrivimi</p>' +
        '<p class="rs-mail-t" id="rs-mail-t">Da dove vuoi scrivere?</p>' +
        '<p class="rs-mail-addr"></p>' +
        '<div class="rs-mail-opts">' +
          '<a data-mail="gmail" target="_blank" rel="noopener">Gmail <span>↗</span></a>' +
          '<a data-mail="outlook" target="_blank" rel="noopener">Outlook <span>↗</span></a>' +
          '<a data-mail="mailto">App di posta <span>→</span></a>' +
          '<button type="button" data-copy>Copia indirizzo <span>⧉</span></button>' +
        '</div>' +
      '</div>');
    panel.querySelector('.rs-mail-addr').textContent = links.to;
    panel.querySelectorAll('[data-mail]').forEach(a => { a.href = links[a.dataset.mail]; });
    return panel;
  }

  function openMailChooser(href, trigger) {
    const links = mailLinks(href), panel = buildMailPanel(links);
    const onKey = e => { if (e.key === 'Escape') close(); };
    const close = () => {
      removeEventListener('keydown', onKey);
      panel.classList.remove('is-open');
      setTimeout(() => panel.remove(), 300);
      trigger.focus({ preventScroll: true });
    };
    panel.addEventListener('click', e => {
      if (e.target === panel || e.target.closest('.rs-mail-x')) return close();
      if (e.target.closest('[data-copy]')) return copyAddress(links.to, e.target.closest('[data-copy]'));
      if (e.target.closest('[data-mail]')) setTimeout(close, 150);
    });
    addEventListener('keydown', onKey);
    document.body.append(panel);
    requestAnimationFrame(() => panel.classList.add('is-open'));
    panel.querySelector('[data-mail]').focus({ preventScroll: true });
  }

  function copyAddress(address, btn) {
    const done = ok => { btn.firstChild.textContent = ok ? 'Indirizzo copiato ' : 'Copia non riuscita '; };
    if (!navigator.clipboard) return done(false);
    navigator.clipboard.writeText(address).then(() => done(true), () => done(false));
  }

  /* ---------- Cursor ---------- */
  function buildCursor() {
    const dot = el('div', 'rs-dot'), ring = el('div', 'rs-ring', '<b></b>');
    document.body.append(dot, ring);
    const label = ring.querySelector('b');
    const pos = { x: mouse.x, y: mouse.y };
    addEventListener('pointermove', e => { document.documentElement.classList.add('rs-has-cursor'); });
    addEventListener('pointerdown', () => ring.classList.add('is-down'));
    addEventListener('pointerup', () => ring.classList.remove('is-down'));
    document.addEventListener('mouseleave', () => document.documentElement.classList.remove('rs-has-cursor'));
    document.addEventListener('mouseover', e => setCursorState(ring, label, e.target));
    (function loop() {
      pos.x = lerp(pos.x, mouse.x, .18); pos.y = lerp(pos.y, mouse.y, .18);
      dot.style.transform = 'translate(' + mouse.x + 'px,' + mouse.y + 'px)';
      ring.style.transform = 'translate(' + pos.x + 'px,' + pos.y + 'px)' + (ring.classList.contains('is-down') ? ' scale(.85)' : '');
      requestAnimationFrame(loop);
    })();
  }

  function setCursorState(ring, label, target) {
    const tagged = target.closest('[data-cursor]');
    const link = target.closest('a,button,[role=button]');
    ring.classList.toggle('is-label', !!tagged);
    ring.classList.toggle('is-link', !tagged && !!link);
    label.textContent = tagged ? tagged.dataset.cursor : '';
  }

  /* ---------- Per-element effects ---------- */
  function tilt(node) {
    const max = parseFloat(node.dataset.tilt) || 8;
    node.addEventListener('pointermove', e => {
      const r = node.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      node.classList.add('is-tilting');
      node.style.transition = 'transform .12s ease-out';
      node.style.transform = 'perspective(900px) rotateX(' + ((.5 - y) * max).toFixed(2) + 'deg) rotateY(' + ((x - .5) * max).toFixed(2) + 'deg) scale(1.02)';
      node.style.setProperty('--gx', (x * 100).toFixed(1) + '%'); node.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
    });
    node.addEventListener('pointerleave', () => {
      node.classList.remove('is-tilting');
      node.style.transition = 'transform .7s cubic-bezier(.2,.7,.2,1)';
      node.style.transform = 'perspective(900px) rotateX(0) rotateY(0) scale(1)';
    });
  }

  function magnetic(node) {
    const pull = parseFloat(node.dataset.magnetic) || .3;
    node.style.transition = (node.style.transition ? node.style.transition + ',' : '') + 'translate .5s cubic-bezier(.2,.7,.2,1)';
    node.addEventListener('pointermove', e => {
      const r = node.getBoundingClientRect();
      node.style.translate = ((e.clientX - r.left - r.width / 2) * pull).toFixed(1) + 'px ' + ((e.clientY - r.top - r.height / 2) * pull).toFixed(1) + 'px';
    });
    node.addEventListener('pointerleave', () => { node.style.translate = '0 0'; });
  }

  let previewBox = null;
  function preview(node) {
    if (!fine) return;
    if (!previewBox) previewBox = buildPreview();
    node.addEventListener('pointerenter', () => { previewBox.img.src = node.dataset.preview; previewBox.box.classList.add('is-on'); });
    node.addEventListener('pointerleave', () => previewBox.box.classList.remove('is-on'));
  }

  function buildPreview() {
    const box = el('div', 'rs-preview', '<img alt="">'); document.body.append(box);
    const p = { x: mouse.x, y: mouse.y }, img = box.querySelector('img');
    (function loop() {
      const vx = mouse.x - p.x; p.x = lerp(p.x, mouse.x, .12); p.y = lerp(p.y, mouse.y, .12);
      box.style.left = p.x + 'px'; box.style.top = p.y + 'px'; box.style.rotate = Math.max(-12, Math.min(12, vx * .06)) + 'deg';
      requestAnimationFrame(loop);
    })();
    return { box, img };
  }

  const GLYPHS = '!<>-_\\/[]{}=+*^?#01ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const scrambleIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; scrambleIO.unobserve(e.target); runScramble(e.target.firstChild);
  }), { threshold: .6 });
  function scramble(node) {
    if (reduce || node.childNodes.length !== 1 || node.firstChild.nodeType !== 3) return;
    scrambleIO.observe(node);
  }
  // Mutates the existing text node in place so React keeps its reference.
  function runScramble(text) {
    const final = text.nodeValue, start = performance.now(), dur = 900;
    (function step(now) {
      const t = Math.min(1, (now - start) / dur), shown = Math.floor(final.length * t);
      text.nodeValue = final.slice(0, shown) + [...final.slice(shown)].map(c => c === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0]).join('');
      if (t < 1) requestAnimationFrame(step); else text.nodeValue = final;
    })(start);
  }

  const t0 = performance.now(), clocks = [];
  function timecode(node) { clocks.push(node); if (clocks.length === 1) tickClocks(); }
  function tickClocks() {
    const pad = n => String(n).padStart(2, '0');
    setInterval(() => {
      const f = Math.floor((performance.now() - t0) / 40), s = Math.floor(f / 25);
      const tc = pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60) + ':' + pad(f % 25);
      clocks.forEach(c => { c.textContent = tc; });
    }, 40);
  }

  let badgeN = 0;
  function badge(node) {
    const id = 'rs-badge-' + (badgeN++), txt = node.dataset.badge;
    node.classList.add('rs-badge');
    node.innerHTML = '<svg viewBox="0 0 100 100"><defs><path id="' + id + '" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0"/></defs>' +
      '<text><textPath href="#' + id + '">' + txt + '</textPath></text></svg><span style="color:#4ecdc0;font-size:20px">↓</span>';
  }

  function wave(node) {
    const n = parseInt(node.dataset.wave, 10) || 48;
    node.classList.add('rs-wave');
    let html = '';
    for (let i = 0; i < n; i++) html += '<i style="animation-delay:' + (-Math.random() * 1.1).toFixed(2) + 's;animation-duration:' + (.6 + Math.random() * .9).toFixed(2) + 's"></i>';
    node.innerHTML = html;
  }

  /* 3D aperture: each blade's straight edge is tangent to an inner circle of radius `a`,
     so the 8 blades leave a regular octagon open. Scrolling grows/shrinks `a`. */
  const bladePath = a => 'M' + a + ' -34 L260 -34 L260 260 L' + a + ' 260 Z';
  /* ---------- Rack focus list ---------- */
  // Mouse: CSS :hover does the focusing. Touch has no hover, so a tap puts that item in focus (data-on).
  function focusList(node) {
    node.addEventListener('pointerup', e => {
      if (e.pointerType === 'mouse') return;
      const hit = e.target.closest('[data-focus-item]');
      node.querySelectorAll('[data-focus-item]').forEach(it => it.toggleAttribute('data-on', it === hit));
    });
  }

  /* ---------- Lens focus ring ---------- */
  // Turned by the wheel while the pointer is over it (the page stays still) or by a sideways drag;
  // it eases toward the target angle and snaps so one name sits under the top index.
  function lens(node) {
    const names = node.dataset.lens.split(',').map(s => s.trim()).filter(Boolean);
    node.classList.add('rs-lens');
    node.innerHTML = lensMarkup(names.length);
    node.querySelectorAll('.rs-lens-name').forEach((lb, i) => { lb.textContent = names[i]; });
    node.querySelector('.rs-lens-hint').textContent = fine ? '↻ scorri sulla ghiera' : '↔ trascina per ruotare';
    const step = 360 / names.length, draw = lensDrawer(node, names, step);
    const state = { rot: 0, target: 0, stop: 0, moving: false, snapTimer: 0 };
    const turnTo = deg => { state.target = deg; if (!state.moving) { state.moving = true; requestAnimationFrame(follow); } };
    // A small nudge (one wheel notch is ~25°) already moves to the next name in that direction.
    const snap = () => {
      const moved = state.target - state.stop, notches = Math.abs(moved) < step * .15 ? 0 : Math.max(1, Math.round(Math.abs(moved) / step));
      state.stop += Math.sign(moved) * notches * step;
      turnTo(state.stop);
    };
    const snapSoon = () => { clearTimeout(state.snapTimer); state.snapTimer = setTimeout(snap, 160); };
    const follow = () => {
      state.rot = lerp(state.rot, state.target, .16); draw(state.rot);
      if (Math.abs(state.target - state.rot) > .05) requestAnimationFrame(follow); else { state.rot = state.target; draw(state.rot); state.moving = false; }
    };
    wireLensWheel(node, by => { turnTo(state.target + by); snapSoon(); });
    wireLensDrag(node, by => { turnTo(state.target + by); }, snapSoon);
    draw(0);
  }

  // Returns draw(rot): spins the tick scale, keeps names upright around the ring, lights the one at the top.
  function lensDrawer(node, names, step) {
    const ring = node.querySelector('.rs-lens-scale'), labels = [...node.querySelectorAll('.rs-lens-name')];
    const readout = node.querySelector('.rs-lens-readout b');
    return rot => {
      ring.style.transform = 'rotate(' + rot.toFixed(2) + 'deg)';
      let active = 0, bestGap = 360;
      labels.forEach((lb, i) => {
        const deg = i * step + rot, rad = (deg - 90) * Math.PI / 180;
        lb.style.left = (50 + 40 * Math.cos(rad)).toFixed(2) + '%';
        lb.style.top = (50 + 40 * Math.sin(rad)).toFixed(2) + '%';
        const gap = Math.abs(((deg % 360) + 540) % 360 - 180); // distance from the top index, in degrees
        if (gap < bestGap) { bestGap = gap; active = i; }
      });
      labels.forEach((lb, i) => lb.toggleAttribute('data-on', i === active));
      if (readout.textContent !== names[active]) readout.textContent = names[active];
    };
  }

  // Wheel over the ring turns it instead of scrolling the page (passive:false so preventDefault works).
  function wireLensWheel(node, turnBy) {
    node.addEventListener('wheel', e => {
      e.preventDefault();
      const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      turnBy(-px * .25);
    }, { passive: false });
  }

  // Horizontal drag turns the ring; vertical finger moves still scroll the page (touch-action: pan-y in CSS).
  function wireLensDrag(node, turnBy, onEnd) {
    let lastX = null;
    node.addEventListener('pointerdown', e => { lastX = e.clientX; node.setPointerCapture(e.pointerId); node.classList.add('is-turning'); });
    node.addEventListener('pointermove', e => { if (lastX === null) return; turnBy((e.clientX - lastX) * .6); lastX = e.clientX; });
    const end = () => { if (lastX === null) return; lastX = null; node.classList.remove('is-turning'); onEnd(); };
    node.addEventListener('pointerup', end); node.addEventListener('pointercancel', end);
  }

  function lensMarkup(count) {
    let ticks = '';
    for (let i = 0; i < 72; i++) {
      const long = i % 6 === 0;
      ticks += '<line x1="200" y1="' + (long ? 14 : 20) + '" x2="200" y2="30" transform="rotate(' + i * 5 + ' 200 200)"' + (long ? ' class="is-long"' : '') + '/>';
    }
    return '<svg class="rs-lens-scale" viewBox="0 0 400 400" aria-hidden="true">' +
        '<circle cx="200" cy="200" r="196"/><circle cx="200" cy="200" r="150" class="is-inner"/>' + ticks + '</svg>' +
      '<span class="rs-lens-index" aria-hidden="true"></span>' +
      '<div class="rs-lens-core"><span class="rs-lens-readout"><i>▲ in uso</i><b></b></span></div>' +
      '<ul class="rs-lens-names">' + '<li class="rs-lens-name"></li>'.repeat(count) + '</ul>' +
      '<span class="rs-lens-hint"></span>';
  }

  function iris(node) {
    const N = 8, R = 90;
    let blades = '';
    for (let i = 0; i < N; i++) blades += '<path class="rs-blade" data-blade transform="rotate(' + (i * 360 / N) + ')" d="' + bladePath(30) + '"/>';
    node.classList.add('rs-iris');
    node.innerHTML = '<div class="rs-iris-3d">' +
      '<div class="rs-ring3d" style="transform:translateZ(-60px) scale(1.18)"></div>' +
      '<div class="rs-ring3d" style="transform:translateZ(-120px) scale(1.34);border-style:dashed;border-color:rgba(78,205,192,.3)"></div>' +
      '<svg viewBox="-110 -110 220 220"><defs><clipPath id="rs-iris-clip"><circle r="' + R + '"/></clipPath></defs>' +
      '<circle r="' + (R + 6) + '" fill="none" stroke="rgba(236,233,226,.25)" stroke-width=".6"/>' +
      '<circle r="' + (R + 12) + '" fill="none" stroke="#4ecdc0" stroke-width=".5" stroke-dasharray="1 5"/>' +
      '<g clip-path="url(#rs-iris-clip)"><circle r="' + R + '" fill="rgba(78,205,192,.12)"/>' + blades + '</g></svg>' +
      '<div class="rs-ring3d" style="transform:translateZ(50px) scale(.5);border-color:rgba(78,205,192,.5)"></div></div>';
    const paths = [...node.querySelectorAll('[data-blade]')], stage = node.firstChild;
    const update = () => {
      const r = node.getBoundingClientRect(), p = Math.max(0, Math.min(1, 1 - (r.top + r.height / 2) / innerHeight));
      const a = (14 + p * 58).toFixed(2); // aperture inradius: nearly closed -> wide open
      paths.forEach(b => b.setAttribute('d', bladePath(a)));
      stage.style.rotate = (p * 60).toFixed(1) + 'deg';
    };
    addEventListener('scroll', update, { passive: true }); update();
    if (fine && !reduce) addEventListener('pointermove', () => {
      const r = node.getBoundingClientRect(), x = (mouse.x - (r.left + r.width / 2)) / innerWidth, y = (mouse.y - (r.top + r.height / 2)) / innerHeight;
      stage.style.transform = 'rotateX(' + (-y * 40).toFixed(1) + 'deg) rotateY(' + (x * 40).toFixed(1) + 'deg)';
    });
  }

  /* ---------- Wiring ---------- */
  const EFFECTS = [
    ['[data-tilt]', tilt, true], ['[data-magnetic]', magnetic, true], ['[data-preview]', preview, false],
    ['[data-scramble]', scramble, false], ['[data-timecode]', timecode, false], ['[data-badge]', badge, false],
    ['[data-iris]', iris, false], ['[data-wave]', wave, false], ['[data-focus]', focusList, false], ['[data-lens]', lens, false]
  ];
  // Nodes still inside <x-dc> are the raw template the runtime has yet to read:
  // touching them would leak injected markup into React's own render.
  function scan() {
    EFFECTS.forEach(([sel, fn, needsMotion]) => document.querySelectorAll(sel).forEach(n => {
      if (done.has(n) || n.closest('x-dc') || (needsMotion && (reduce || !fine))) return; done.add(n); fn(n);
    }));
  }

  let queued = false;
  const queueScan = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; scan(); }); };

  addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });

  function start() {
    buildChrome(); wireMailChooser(); scan();
    // React renders after the CDN loads; watch for new nodes (childList only — cheap on re-renders).
    new MutationObserver(queueScan).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
