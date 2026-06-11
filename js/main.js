/* ===========================================================
   Nola's Captures — main.js
   Vanilla JS + GSAP + Novatrix shader + vanilla-tilt
   =========================================================== */

// ── State ──────────────────────────────────────────────────────
const IS_MOBILE = window.innerWidth <= 768;
const MOTION_OK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ANIMATE   = MOTION_OK && !IS_MOBILE;

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const on = (el, e, fn) => el?.addEventListener(e, fn);

let GSAP_OK = typeof gsap !== 'undefined';

// ══════════════════════════════════════════════════════════════
// 1. Novatrix Background — raw WebGL shader
//    Source: black.ui / harvest/eldoraui/novatrix-background.tsx
// ══════════════════════════════════════════════════════════════
(function initNovatrix() {
  var mount = document.getElementById('novatrix-mount');
  if (!mount) return;

  // Canvas must be created here, NOT the mount div (mount is a <div>)
  var canvas = document.createElement('canvas');
  mount.appendChild(canvas);

  var gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: false,
    antialias: false
  });

  if (!gl) {
    console.warn('WebGL not supported — background disabled.');
    return;
  }

  // ── Shader source (ported from eldoraui / OGL) ─────────────
  var VERT = [
    'attribute vec2 aPos;',
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = aPos * 0.5 + 0.5;',
    '  gl_Position = vec4(aPos, 0.0, 1.0);',
    '}'
  ].join('\n');

  var FRAG = [
    'precision mediump float;',
    '',
    'uniform float uTime;',
    'uniform vec3  uColor;',         // champagne #d4c4a8
    'uniform vec3  uResolution;',
    'uniform vec2  uMouse;',
    'uniform float uAmplitude;',
    'uniform float uSpeed;',
    '',
    'varying vec2 vUv;',
    '',
    'void main() {',
    '  float mr = min(uResolution.x, uResolution.y);',
    '  vec2 uv = (vUv * 2.0 - 1.0) * uResolution.xy / mr;',
    '  uv += (uMouse - vec2(0.5)) * uAmplitude;',
    '',
    '  float d = -uTime * 0.5 * uSpeed;',
    '  float a = 0.0;',
    '  for (float i = 0.0; i < 8.0; ++i) {',
    '    a += cos(i - d - a * uv.x);',
    '    d += sin(uv.y * i + a);',
    '  }',
    '  d += uTime * 0.5 * uSpeed;',
    '',
    '  vec3 col = vec3(',
    '    cos(uv * vec2(d, a)) * 0.6 + 0.4,',
    '    cos(a + d) * 0.5 + 0.5',
    '  );',
    '  col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;',
    '',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function makeShader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Shader error:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  var vs = makeShader(gl.VERTEX_SHADER, VERT);
  var fs = makeShader(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Link error:', gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  // ── Full-screen triangle ────────────────────────────────────
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);

  var aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  // ── Uniforms ────────────────────────────────────────────────
  // Champagne #d4c4a8 as GLSL linear RGB
  // R=212/255=0.831, G=196/255=0.769, B=168/255=0.659
  var uTime  = gl.getUniformLocation(prog, 'uTime');
  var uColor = gl.getUniformLocation(prog, 'uColor');
  var uRes   = gl.getUniformLocation(prog, 'uResolution');
  var uMouse = gl.getUniformLocation(prog, 'uMouse');
  var uAmp   = gl.getUniformLocation(prog, 'uAmplitude');
  var uSpeed = gl.getUniformLocation(prog, 'uSpeed');

  gl.uniform3f(uColor, 0.831, 0.769, 0.659);
  gl.uniform1f(uSpeed, 0.7);
  gl.uniform1f(uAmp, 0.10);
  gl.uniform2f(uMouse, 0.5, 0.5);

  // ── Smoothed mouse tracking ─────────────────────────────────
  var rawX = 0.5, rawY = 0.5;
  var smoothX = 0.5, smoothY = 0.5;
  var LERP = 0.055;   // lower = smoother follow

  function onMouse(e) {
    var r = mount.getBoundingClientRect();
    rawX = (e.clientX - r.left) / r.width;
    rawY = 1.0 - (e.clientY - r.top) / r.height;
  }
  mount.addEventListener('mousemove', onMouse, { passive: true });

  // ── Resize ──────────────────────────────────────────────────
  function resize() {
    var w = mount.clientWidth  || window.innerWidth;
    var h = mount.clientHeight || window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var bw = Math.round(w * dpr);
    var bh = Math.round(h * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width  = bw;
      canvas.height = bh;
      gl.viewport(0, 0, bw, bh);
      gl.uniform3f(uRes, bw, bh, bw / bh);
    }
  }

  // ── Render loop ─────────────────────────────────────────────
  var rafId = 0;

  function tick(ts) {
    rafId = requestAnimationFrame(tick);

    // exponential lerp — eliminates cursor jitter
    smoothX += (rawX - smoothX) * LERP;
    smoothY += (rawY - smoothY) * LERP;

    resize();
    gl.uniform1f(uTime, ts * 0.001);
    gl.uniform2f(uMouse, smoothX, smoothY);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  resize();
  rafId = requestAnimationFrame(tick);

  window.addEventListener('resize', resize);

  // ── Cleanup ─────────────────────────────────────────────────
  window._novatrixCleanup = function () {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    mount.removeEventListener('mousemove', onMouse);
    if (mount.contains(canvas)) mount.removeChild(canvas);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
})();

// ══════════════════════════════════════════════════════════════
// 2. Navbar scroll state
// ══════════════════════════════════════════════════════════════
(function() {
  var navbar = $('.navbar');
  if (!navbar) return;

  function update() {
    navbar.classList.toggle('navbar--scrolled', window.scrollY > 60);
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
})();

// ══════════════════════════════════════════════════════════════
// 3. Hero GSAP entrance
// ══════════════════════════════════════════════════════════════
if (ANIMATE && GSAP_OK) {
  var heroTl = gsap.timeline({ defaults: { duration: 0.9, ease: 'power3.out' } });
  heroTl
    .to('.hero__label',    { opacity: 1, y: 0, duration: 0.7 }, 0.2)
    .to('.hero__name',     { opacity: 1, y: 0, duration: 0.9 }, 0.4)
    .to('.hero__tagline',  { opacity: 1, y: 0, duration: 0.7 }, 0.7)
    .to('.hero__cta-wrap', { opacity: 1, y: 0, duration: 0.7 }, 1.0);
}
// ══════════════════════════════════════════════════════════════
// 4. ScrollTrigger: section reveals
// ══════════════════════════════════════════════════════════════
if (MOTION_OK && GSAP_OK) {
  $$('.section-title, .about__image, .about__body').forEach(function(el) {
    gsap.from(el, {
      opacity: 0, y: 36, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 82%', once: true }
    });
  });

  gsap.from('.service-card', {
    y: 50, opacity: 0, stagger: 0.12, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '.services', start: 'top 78%', once: true }
  });
}

// ══════════════════════════════════════════════════════════════
// 5. Lightbox
(function() {
  var box       = $('.lightbox');
  var img       = $('#lightbox-img');
  var closeBtn  = $('#lightbox-close');
  var prevBtn   = $('#lightbox-prev');
  var nextBtn   = $('#lightbox-next');
  var counter   = $('#lightbox-counter');

  var items = [];
  var idx   = -1;

  function el(i) {
    return items[i];
  }

  function render() {
    if (!img) return;
    var cur = el(idx);
    if (cur) {
      img.src = cur.dataset.src || cur.querySelector('img').src;
      img.alt = cur.querySelector('img').alt;
    }
    if (counter) counter.textContent = (idx + 1) + ' / ' + items.length;
  }

  function open(list, i) {
    if (!box) return;
    items = list; idx = i;
    render();
    box.classList.add('lightbox--open');
    box.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    closeBtn?.focus();
  }

  function close() {
    if (!box) return;
    box.classList.remove('lightbox--open');
    box.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    items = []; idx = -1;
  }

  function go(dir) {
    if (!items.length) return;
    idx = (idx + dir + items.length) % items.length;
    render();
  }

  closeBtn?.addEventListener('click', close);
  prevBtn?.addEventListener('click', function() { go(-1); });
  nextBtn?.addEventListener('click', function() { go(1); });
  box?.addEventListener('click', function(e) { if (e.target === box) close(); });

  on(document, 'keydown', function(e) {
    if (!box?.classList.contains('lightbox--open')) return;
    if (e.key === 'Escape')     close();
    if (e.key === 'ArrowLeft')  go(-1);
    if (e.key === 'ArrowRight') go(1);
  });

  // Expose for gallery items to invoke
  window._openLightbox = open;
})();

// ══════════════════════════════════════════════════════════════
// 6. Gallery-3D → lightbox click wiring
// ══════════════════════════════════════════════════════════════
(function() {
  var stage = $('.gallery-3d__stage');
  if (!stage || typeof window._openLightbox !== 'function') return;

  var items = $$('.gallery-3d__item', stage);

  on(stage, 'click', function(e) {
    var item = e.target.closest('.gallery-3d__item');
    if (!item) return;

    var i = items.indexOf(item);
    if (i > -1) window._openLightbox(items, i);
  });
})();

// ══════════════════════════════════════════════════════════════
// 7. Click-to-copy email
// ══════════════════════════════════════════════════════════════
(function() {
  var emailEl  = $('.contact__email');
  var copyBtn  = $('.contact__copy-btn');
  if (!copyBtn) return;

  var timer = null;

  function flash(msg) {
    copyBtn.textContent = msg;
    clearTimeout(timer);
    timer = setTimeout(function() { copyBtn.textContent = 'Copy'; }, 1600);
  }

  copyBtn.addEventListener('click', async function() {
    var addr = (emailEl?.textContent || '').trim();
    if (!addr) return;
    try {
      await navigator.clipboard.writeText(addr);
      flash('Copied.');
    } catch {
      var ta = document.createElement('textarea');
      ta.value = addr;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      flash('Copied.');
    }
  });

  emailEl?.addEventListener('click', function() { copyBtn.click(); });
})();
