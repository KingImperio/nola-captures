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

  // Pause state — respect reduced motion, allow manual toggle
  var paused = !MOTION_OK;
  var toggleBtn = document.getElementById('shader-toggle');
  if (toggleBtn) {
    toggleBtn.textContent = paused ? '▶' : '⏸';
    toggleBtn.addEventListener('click', function() {
      paused = !paused;
      toggleBtn.textContent = paused ? '▶' : '⏸';
      toggleBtn.setAttribute('aria-label', paused ? 'Resume background animation' : 'Pause background animation');
    });
  }

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
    if (paused) return;
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

  var menuBtn = $('#menu-btn');
  var links = $('#navbar-links');
  if (!menuBtn || !links) return;

  // Create backdrop element
  var backdrop = document.createElement('div');
  backdrop.className = 'navbar__backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  nav.appendChild(backdrop);

  var lastFocused = null;
  var focusable = null;
  var firstFocusable = null;
  var lastFocusable = null;

  function openMenu() {
    nav.classList.add('navbar--menu-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.textContent = 'Close';
    document.body.style.overflow = 'hidden';

    lastFocused = document.activeElement;
    focusable = links.querySelectorAll('a, button');
    if (focusable.length) {
      firstFocusable = focusable[0];
      lastFocusable = focusable[focusable.length - 1];
      firstFocusable.focus();
    }
  }

  function closeMenu() {
    nav.classList.remove('navbar--menu-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.textContent = 'Menu';
    document.body.style.overflow = '';

    if (lastFocused && lastFocused.focus) lastFocused.focus();
    lastFocused = null;
  }

  menuBtn.addEventListener('click', function() {
    if (nav.classList.contains('navbar--menu-open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Close on backdrop click
  backdrop.addEventListener('click', closeMenu);

  // Close on link click
  links.addEventListener('click', function(e) {
    if (e.target.closest('.navbar__link')) closeMenu();
  });

  // Close on Escape
  document.addEventListener('keydown', function(e) {
    if (!nav.classList.contains('navbar--menu-open')) return;
    if (e.key === 'Escape') { closeMenu(); return; }
  });

  // Focus trap
  links.addEventListener('keydown', function(e) {
    if (e.key !== 'Tab') return;
    if (!focusable || focusable.length < 2) { e.preventDefault(); return; }
    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  });
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

/* ── Stack cards: dynamic container height for stacking ──── */
(function() {
  var container = $('.stack-cards');
  var cards = $$('.stack-cards__item');
  if (!container || !cards.length) return;

  function sizeStack() {
    var h = cards[0].offsetHeight;
    if (h < 10) return;
    var top = parseInt(getComputedStyle(cards[0]).top, 10) || 100;
    container.style.height = (h * cards.length + top) + 'px';
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  }

  requestAnimationFrame(sizeStack);
  window.addEventListener('resize', sizeStack);
})();

/* ══════════════════════════════════════════════════════════════
   5. Lightbox
   ══════════════════════════════════════════════════════════════ */
(function() {
  var box = $('.lightbox'), img = $('#lightbox-img');
  var close = $('#lightbox-close'), prev = $('#lightbox-prev'), next = $('#lightbox-next'), cnt = $('#lightbox-counter'), cap = $('#lightbox-caption');
  var items = [], idx = -1, lastFocused = null;

  function preloadAdjacent(i) {
    if (!items.length) return;
    var p = (i - 1 + items.length) % items.length;
    var n = (i + 1) % items.length;
    var a = new Image(); a.src = items[p].dataset.src || items[p].querySelector('img').src;
    var b = new Image(); b.src = items[n].dataset.src || items[n].querySelector('img').src;
  }

  function render() {
    if (!img || idx < 0) return;
    var cur = items[idx];
    img.src = cur.dataset.src || cur.querySelector('img').src;
    img.alt = cur.querySelector('img').alt;
    if (cnt) cnt.textContent = (idx + 1) + ' / ' + items.length;
    if (cap) cap.textContent = cur.dataset.caption || '';
    preloadAdjacent(idx);
  }
  function open(list, i) {
    items = list; idx = i;
    lastFocused = document.activeElement;
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
    if (lastFocused && lastFocused.focus) {
      lastFocused.focus();
      lastFocused = null;
    }
  }
  function prevImg() { if (items.length) { idx = (idx - 1 + items.length) % items.length; render(); } }
  function nextImg() { if (items.length) { idx = (idx + 1) % items.length; render(); } }

  if (close) close.addEventListener('click', closeBox);
  if (prev) prev.addEventListener('click', prevImg);
  if (next) next.addEventListener('click', nextImg);
  if (box) box.addEventListener('click', function(e) { if (e.target === box) closeBox(); });

  // Trap focus within lightbox
  box.addEventListener('keydown', function(e) {
    if (e.key !== 'Tab') return;
    var focusable = box.querySelectorAll('button');
    if (!focusable.length) return;
    var first = focusable[0], lastFocusable = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      lastFocusable.focus();
    } else if (!e.shiftKey && document.activeElement === lastFocusable) {
      e.preventDefault();
      first.focus();
    }
  });

  document.addEventListener('keydown', function(e) {
    if (!box.classList.contains('lightbox--open')) return;
    if (e.key === 'Escape') closeBox();
    if (e.key === 'ArrowLeft') prevImg();
    if (e.key === 'ArrowRight') nextImg();
  });

  // Touch swipe navigation
  var touchX = 0;
  if (img) {
    img.addEventListener('touchstart', function(e) {
      touchX = e.touches[0].clientX;
    }, { passive: true });
    img.addEventListener('touchend', function(e) {
      var diff = touchX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) nextImg(); else prevImg();
      }
    }, { passive: true });
  }

  window._openLightbox = open;
})();

/* ══════════════════════════════════════════════════════════════
   6. Gallery lightbox click + drag-to-scroll + seamless loop
   ══════════════════════════════════════════════════════════════ */
(function() {
  var stage = $('.gallery-3d__stage');
  if (!stage) return;

  var originals = $$('.gallery-3d__item', stage);
  if (!originals.length) return;
  var origCount = originals.length;

  // ── Helpers ────────────────────────────────────────────────
  function totalWidth(els) {
    var w = 0;
    for (var i = 0; i < els.length; i++) w += els[i].offsetWidth || 0;
    return w;
  }

  function gapWidth() {
    return parseFloat(getComputedStyle(stage).gap) || 16;
  }

  // Seamless loop: clone first 2 and last 2 items
  (function() {
    var prepend = [], append = [];
    for (var i = origCount - 2; i < origCount; i++) {
      var c = originals[i].cloneNode(true);
      c.setAttribute('data-clone', '1');
      prepend.push(c);
    }
    for (var i = 0; i < 2; i++) {
      var c = originals[i].cloneNode(true);
      c.setAttribute('data-clone', '1');
      append.push(c);
    }
    prepend.forEach(function(el) { stage.insertBefore(el, stage.firstChild); });
    append.forEach(function(el) { stage.appendChild(el); });
  })();

  // Click → lightbox (ignore clones)
  stage.addEventListener('click', function(e) {
    var fig = e.target.closest('.gallery-3d__item');
    if (!fig || fig.hasAttribute('data-clone')) return;
    var i = originals.indexOf(fig);
    if (i > -1 && window._openLightbox) window._openLightbox(originals, i);
  });

  // ── Auto carousel — continuous smooth flow ────────────────
  var paused = false, raf = null, inited = false;

  function tick() {
    if (!paused) {
      stage.scrollLeft += 0.7;
      seamlessJump();
    }
    raf = requestAnimationFrame(tick);
  }

  // Seamless jump — measure on each frame so it adapts to image loads
  function seamlessJump() {
    var g = gapWidth();
    var origEls = originals;
    var contentW = totalWidth(origEls) + g * origEls.length;
    if (!contentW) return;

    var clones = stage.querySelectorAll('.gallery-3d__item[data-clone]');
    if (!clones.length) return;

    var preW = 0;
    for (var i = 0; i < Math.min(2, clones.length); i++) preW += clones[i].offsetWidth || 0;
    var offset = preW + g * 2;

    if (!inited) {
      stage.scrollLeft = offset;
      inited = true;
      return;
    }

    var end = offset + contentW;
    if (stage.scrollLeft >= end) {
      stage.scrollLeft -= contentW;
    } else if (stage.scrollLeft < 0) {
      stage.scrollLeft += contentW;
    }
  }

  raf = requestAnimationFrame(tick);

  // Drag-to-scroll (mouse)
  var isDown = false, dragStartX = 0, dragStartScroll = 0;
  stage.addEventListener('mousedown', function(e) {
    isDown = true;
    dragStartX = e.pageX - stage.offsetLeft;
    dragStartScroll = stage.scrollLeft;
    stage.style.cursor = 'grabbing';
    paused = true;
  });
  stage.addEventListener('mouseleave', function() { isDown = false; stage.style.cursor = 'grab'; });
  stage.addEventListener('mouseup', function() { isDown = false; stage.style.cursor = 'grab'; paused = false; });
  stage.addEventListener('mousemove', function(e) {
    if (!isDown) return;
    e.preventDefault();
    stage.scrollLeft = dragStartScroll - (e.pageX - stage.offsetLeft - dragStartX);
  });

  // Pause on hover (desktop)
  stage.addEventListener('mouseenter', function() { paused = true; });
  stage.addEventListener('mouseleave', function() { if (!isDown) paused = false; });

  // Drag-to-scroll (touch)
  var touchStartX = 0, touchDragScroll = 0;
  stage.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].pageX - stage.offsetLeft;
    touchDragScroll = stage.scrollLeft;
    paused = true;
  }, { passive: true });
  stage.addEventListener('touchmove', function(e) {
    stage.scrollLeft = touchDragScroll - (e.touches[0].pageX - stage.offsetLeft - touchStartX);
  }, { passive: true });
  stage.addEventListener('touchend', function() { paused = false; });
  stage.addEventListener('touchcancel', function() { paused = false; });
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
