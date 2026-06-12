# Current Stage — Nola's Captures

## What Was Done (this session)

### Localised all external assets
- Replaced placeholder picsum.photos CDN images with local files in `images/`
- Replaced CDN-hosted GSAP, ScrollTrigger, and vanilla-tilt scripts with self-hosted vendor copies in `js/vendor/`
- Removed `loading="lazy"` from images (local assets load instantly)

### Restructured Services section → Stacking cards
- Replaced the static 3-column `.services` grid with `.stack-cards` — three sticky cards that stack on scroll
- Each card has `position: sticky; top: 100px` with z-index layering (1/2/3)
- GSAP ScrollTrigger scrub animation: first two cards scale to 0.96 and shift up -20px as the next card slides over them
- Cards enter with a fade-in + slide-up animation on scroll

### Gallery — horizontal carousel with auto-scroll
- Replaced the placeholder gallery with a horizontal flex layout (`.gallery-3d__stage`)
- Continuous auto-scroll via `requestAnimationFrame` at 0.7px/frame
- Drag-to-scroll (mouse + touch) pauses the auto-scroll, resumes on release
- Resets to 0 when reaching the end
- Ghost edges (CSS `::before`/`::after` gradients) for left/right fade

### Lightbox — captions + counter
- Added `data-caption` attributes to all 9 gallery figures
- Added `.lightbox__caption` element rendered from `dataset.caption`
- Counter now shows "1 / 9" style positioning

### Navbar — desktop links + mobile menu
- Added 4 nav links (About, Services, Work, Contact) displayed inline on desktop
- Menu button appears at 768px; toggles a vertical dropdown with `.navbar--menu-open`
- Links close the menu on click
- Button text toggles between "Menu" and "Close"

### Contact — WhatsApp link added
- Added WhatsApp CTA button alongside email and Instagram DM

### Credit signature
- Added fixed bottom-left "Code by Oracule" credit with 0.35 opacity

### Hero — WebGL shader improvements
- Added `.hero__overlay-bg` gradient overlay for text readability against the shader
- Simplified Novatrix shader init code, removed debug console logs and resize guard

## Known Incomplete / Future Work

### Mobile menu polish
- The mobile dropdown appears below the navbar; could benefit from a smooth slide animation
- No backdrop overlay when menu is open

### Gallery carousel
- Abrupt reset (scrollLeft jumps to 0) rather than seamless infinite loop
- Images are local but could benefit from lazy loading for page speed on slow connections
- No lightbox preload of adjacent images

### Placeholder data
- WhatsApp number is `2348000000000` (placeholder) — replace with Nola's real number before deploying
- Instagram link points to `https://instagram.com` — replace with real profile URL

### Responsive
- Single breakpoint at 640px for full single-column layout
- Stack cards at 640px: `height: auto` means sticky behavior is disabled (cards stack naturally)
- Gallery stage height reduces to 260px on small screens

### Accessibility
- Hero entrance animations now play on mobile (GSAP no longer gated by `IS_MOBILE` check)
- Lightbox prev/next hidden on small screens (<768px) — navigation relies on swipe or keyboard arrows
- Gallery `aria-label` says "3D gallery" but it's a flat horizontal scroll

## Deployment Notes
- Before deploying, update the WhatsApp number and Instagram URL
- All assets are self-hosted — no CDN dependencies
- GSAP animations degrade gracefully when `typeof gsap === 'undefined'` or when user prefers reduced motion
- Runs on any static server (`python3 -m http.server 3000`)
