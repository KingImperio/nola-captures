/* ── Nola's Captures — main.js ─────────────────────────────── */

// State
const MOTION_OK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, c) => (c || document).querySelector(s);
const $$ = (s, c) => [...(c || document).querySelectorAll(s)];

/* ══════════════════════════════════════════════════════════════
   1. Novatrix WebGL shader background
   ══════════════════════════════════════════════════════════════ */
(function() {
  var mount = document.getElementById('novatrix-mount');
  if (!mount) return;

  var canvas = document.createElement('canvas');
  mount.appendChild(canvas);

  var gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false });
  if (!gl) return;

  var VERT = 'attribute vec2 aPos;varying vec2 vUv;void main(){vUv=aPos*0.5+0.5;gl_Position=vec4(aPos,0.0,1.0);}';
  var FRAG = [
    'precision mediump float;',
    'uniform float uTime;uniform vec3 uColor;uniform vec3 uResolution;uniform vec2 uMouse;uniform float uAmplitude;uniform float uSpeed;',
    'varying vec2 vUv;',
    'void main(){',
    '  float mr=min(uResolution.x,uResolution.y);',
    '  vec2 uv=(vUv*2.0-1.0)*uResolution.xy/mr;',
    '  uv+=(uMouse-vec2(0.5))*uAmplitude;',
    '  float d=-uTime*0.5*uSpeed;float a=0.0;',
    '  for(float i=0.0;i<8.0;++i){a+=cos(i-d-a*uv.x);d+=sin(uv.y*i+a);}',
    '  d+=uTime*0.5*uSpeed;',
    '  vec3 col=vec3(cos(uv*vec2(d,a))*0.6+0.4,cos(a+d)*0.5+0.5);',
    '  col=cos(col*cos(vec3(d,a,2.5))*0.5+0.5)*uColor;',
    '  gl_FragColor=vec4(col,1.0);',
    '}'
  ].join('\n');

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
    return s;
  }
  var vs = shader(gl.VERTEX_SHADER, VERT);
  var fs = shader(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  var uTime = gl.getUniformLocation(prog, 'uTime');
  var uColor = gl.getUniformLocation(prog, 'uColor');
  var uRes = gl.getUniformLocation(prog, 'uResolution');
  var uMouse = gl.getUniformLocation(prog, 'uMouse');
  var uAmp = gl.getUniformLocation(prog, 'uAmplitude');
  var uSpeed = gl.getUniformLocation(prog, 'uSpeed');
  gl.uniform3f(uColor, 0.831, 0.769, 0.659);
  gl.uniform1f(uSpeed, 0.7);
  gl.uniform1f(uAmp, 0.10);
  gl.uniform2f(uMouse, 0.5, 0.5);

  var rawX = 0.5, rawY = 0.5, sx = 0.5, sy = 0.5;
  mount.addEventListener('mousemove', function(e) {
    var r = mount.getBoundingClientRect();
    rawX = (e.clientX - r.left) / r.width;
    rawY = 1.0 - (e.clientY - r.top) / r.height;
  }, { passive: true });

  function resize() {
    var w = mount.clientWidth || window.innerWidth;
    var h = mount.clientHeight || window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform3f(uRes, canvas.width, canvas.height, canvas.width / canvas.height);
  }

  function tick(ts) {
    requestAnimationFrame(tick);
    sx += (rawX - sx) * 0.055;
    sy += (rawY - sy) * 0.055;
    resize();
    gl.uniform1f(uTime, ts * 0.001);
    gl.uniform2f(uMouse, sx, sy);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  resize();
  requestAnimationFrame(tick);
  window.addEventListener('resize', resize);
})();

/* ══════════════════════════════════════════════════════════════
   2. Navbar scroll state + mobile menu toggle
   ══════════════════════════════════════════════════════════════ */
(function() {
  var nav = $('.navbar');
  if (!nav) return;
  var update = function() { nav.classList.toggle('navbar--scrolled', window.scrollY > 60); };
  window.addEventListener('scroll', update, { passive: true });
  update();

  // Mobile menu toggle
  var menuBtn = $('#menu-btn');
  if (menuBtn) {
    menuBtn.addEventListener('click', function() {
      nav.classList.toggle('navbar--menu-open');
      menuBtn.textContent = nav.classList.contains('navbar--menu-open') ? 'Close' : 'Menu';
    });
    // Close menu on link click
    nav.addEventListener('click', function(e) {
      if (e.target.closest('.navbar__link')) {
        nav.classList.remove('navbar--menu-open');
        menuBtn.textContent = 'Menu';
      }
    });
  }
})();

/* ══════════════════════════════════════════════════════════════
   3. Hero GSAP entrance
   ══════════════════════════════════════════════════════════════ */
if (MOTION_OK && typeof gsap !== 'undefined') {
  gsap.timeline({ defaults: { duration: 0.9, ease: 'power3.out' } })
    .to('.hero__label',    { opacity: 1, y: 0, duration: 0.7 }, 0.2)
    .to('.hero__name',     { opacity: 1, y: 0, duration: 0.9 }, 0.4)
    .to('.hero__tagline',  { opacity: 1, y: 0, duration: 0.7 }, 0.7)
    .to('.hero__cta-wrap', { opacity: 1, y: 0, duration: 0.7 }, 1.0);
}

/* ══════════════════════════════════════════════════════════════
   4. Scroll reveals
   ══════════════════════════════════════════════════════════════ */
if (MOTION_OK && typeof gsap !== 'undefined') {
  $$('.section-title, .about__image, .about__body').forEach(function(el) {
    gsap.from(el, {
      opacity: 0, y: 36, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 82%', once: true }
    });
  });

  /* ── Stack cards: cards pin and stack on scroll ─────────── */
  var stackItems = $$('.stack-cards__item');
  if (stackItems.length) {
    stackItems.forEach(function(card, i) {
      if (i < stackItems.length - 1) {
        gsap.to(card, {
          scale: 0.96,
          y: -20,
          scrollTrigger: {
            trigger: card,
            start: 'top 100px',
            end: 'bottom 100px',
            scrub: 0.5,
          }
        });
      }
      // entrance
      gsap.from(card, {
        opacity: 0, y: 40, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: card, start: 'top 85%', once: true }
      });
    });
  }
}

/* ══════════════════════════════════════════════════════════════
   5. Lightbox
   ══════════════════════════════════════════════════════════════ */
(function() {
  var box = $('.lightbox'), img = $('#lightbox-img');
  var close = $('#lightbox-close'), prev = $('#lightbox-prev'), next = $('#lightbox-next'), cnt = $('#lightbox-counter'), cap = $('#lightbox-caption');
  var items = [], idx = -1;

  function render() {
    if (!img || idx < 0) return;
    var cur = items[idx];
    img.src = cur.dataset.src || cur.querySelector('img').src;
    img.alt = cur.querySelector('img').alt;
    if (cnt) cnt.textContent = (idx + 1) + ' / ' + items.length;
    if (cap) cap.textContent = cur.dataset.caption || '';
  }
  function open(list, i) {
    items = list; idx = i;
    render();
    box.classList.add('lightbox--open');
    box.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (close) close.focus();
  }
  function closeBox() {
    box.classList.remove('lightbox--open');
    box.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    items = []; idx = -1;
  }

  if (close) close.addEventListener('click', closeBox);
  if (prev) prev.addEventListener('click', function() { if (items.length) { idx = (idx - 1 + items.length) % items.length; render(); } });
  if (next) next.addEventListener('click', function() { if (items.length) { idx = (idx + 1) % items.length; render(); } });
  if (box) box.addEventListener('click', function(e) { if (e.target === box) closeBox(); });

  document.addEventListener('keydown', function(e) {
    if (!box.classList.contains('lightbox--open')) return;
    if (e.key === 'Escape') closeBox();
    if (e.key === 'ArrowLeft') { idx = (idx - 1 + items.length) % items.length; render(); }
    if (e.key === 'ArrowRight') { idx = (idx + 1) % items.length; render(); }
  });

  window._openLightbox = open;
})();

/* ══════════════════════════════════════════════════════════════
   6. Gallery lightbox click + drag-to-scroll
   ══════════════════════════════════════════════════════════════ */
(function() {
  var stage = $('.gallery-3d__stage');
  if (!stage) return;

  // Click → lightbox
  var figures = $$('.gallery-3d__item', stage);
  stage.addEventListener('click', function(e) {
    var fig = e.target.closest('.gallery-3d__item');
    if (!fig) return;
    var i = figures.indexOf(fig);
    if (i > -1 && window._openLightbox) window._openLightbox(figures, i);
  });

  // Drag-to-scroll (mouse)
  var isDown = false, startX = 0, scrollLeft = 0;
  stage.addEventListener('mousedown', function(e) {
    isDown = true;
    startX = e.pageX - stage.offsetLeft;
    scrollLeft = stage.scrollLeft;
    stage.style.cursor = 'grabbing';
    paused = true;
  });
  stage.addEventListener('mouseleave', function() { isDown = false; stage.style.cursor = 'grab'; paused = false; });
  stage.addEventListener('mouseup', function() { isDown = false; stage.style.cursor = 'grab'; paused = false; });
  stage.addEventListener('mousemove', function(e) {
    if (!isDown) return;
    e.preventDefault();
    stage.scrollLeft = scrollLeft - (e.pageX - stage.offsetLeft - startX);
  });

  // Drag-to-scroll (touch)
  var touchStartX = 0, touchScrollLeft = 0;
  stage.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].pageX - stage.offsetLeft;
    touchScrollLeft = stage.scrollLeft;
    paused = true;
  }, { passive: true });
  stage.addEventListener('touchmove', function(e) {
    stage.scrollLeft = touchScrollLeft - (e.touches[0].pageX - stage.offsetLeft - touchStartX);
  }, { passive: true });
  stage.addEventListener('touchend', function() { paused = false; });
  stage.addEventListener('touchcancel', function() { paused = false; });

  // ── Auto carousel — continuous smooth flow ────────────────
  var raf = null, paused = false;

  function tick() {
    if (!paused) {
      var maxScroll = stage.scrollWidth - stage.offsetWidth;
      stage.scrollLeft += 0.7;
      if (stage.scrollLeft >= maxScroll - 2) stage.scrollLeft = 0;
    }
    raf = requestAnimationFrame(tick);
  }

  raf = requestAnimationFrame(tick);
})();

/* ══════════════════════════════════════════════════════════════
   7. Copy email
   ══════════════════════════════════════════════════════════════ */
(function() {
  var email = $('.contact__email');
  var btn = $('.contact__copy-btn');
  if (!btn) return;
  btn.addEventListener('click', async function() {
    var addr = (email && email.textContent || '').trim();
    if (!addr) return;
    try { await navigator.clipboard.writeText(addr); } catch { return; }
    btn.textContent = 'Copied!';
    setTimeout(function() { btn.textContent = 'Copy'; }, 1600);
  });
})();
