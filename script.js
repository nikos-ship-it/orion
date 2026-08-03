(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Header state + parallax ──────────────────────────────────── */

  var header = document.getElementById('site-header');
  var progress = document.getElementById('progress');

  /* The CSS clamp for --header-h is only a pre-JS estimate; the real height
     depends on the logo's intrinsic ratio and the fluid padding, and getting it
     wrong drops anchor targets underneath the fixed header. Measure it. */
  function syncHeaderHeight() {
    if (!header) return;
    var h = Math.round(header.getBoundingClientRect().height);
    // A little air so a heading never butts against the header edge.
    document.documentElement.style.setProperty('--header-h', (h + 24) + 'px');
  }
  syncHeaderHeight();
  window.addEventListener('resize', syncHeaderHeight);
  window.addEventListener('load', syncHeaderHeight);
  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  var PARALLAX_RANGE = 26;
  var past = null;

  function frame() {
    var isPast = window.scrollY > window.innerHeight * 0.68;
    if (isPast !== past) {
      past = isPast;
      header.classList.toggle('is-past', isPast);
    }

    if (progress) {
      var scrollable = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
      progress.style.transform = 'scaleX(' + Math.min(1, Math.max(0, ratio)).toFixed(4) + ')';
    }

    if (reduceMotion) return;
    parallaxEls.forEach(function (el) {
      var r = el.parentElement.getBoundingClientRect();
      var vh = window.innerHeight;
      if (r.bottom < -200 || r.top > vh + 200) return;
      var p = (r.top + r.height / 2 - vh / 2) / vh;
      var y = Math.max(-PARALLAX_RANGE, Math.min(PARALLAX_RANGE, -p * PARALLAX_RANGE));
      el.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
    });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; frame(); });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  frame();

  /* ── Preloader ────────────────────────────────────────────────── */

  var preloader = document.getElementById('preloader');
  if (preloader) {
    var dismissed = false;
    var dismiss = function () {
      if (dismissed) return;
      dismissed = true;
      preloader.classList.add('is-done');
      // Hand off to the hero entrance as the curtain lifts.
      document.body.classList.add('hero-in');
      // Drop it from the tree once faded so it can never trap focus or clicks.
      setTimeout(function () { preloader.remove(); }, 1000);
    };

    // Give the intro animation room to read, but never gate on it.
    var MIN_MS = reduceMotion ? 0 : 1600;
    var started = Date.now();
    var whenReady = function () {
      setTimeout(dismiss, Math.max(0, MIN_MS - (Date.now() - started)));
    };

    if (document.readyState === 'complete') whenReady();
    else window.addEventListener('load', whenReady);

    // Hard ceiling: a stalled or failed asset must not leave the page hidden.
    setTimeout(dismiss, 2500);
  }

  /* ── Slow eased anchor scrolling ──────────────────────────────── */

  /* CSS scroll-behavior:smooth is left in place as the no-JS fallback, but its
     duration is fixed and short. This glides over ~1.5s with an ease that
     settles rather than stops. Only anchor clicks are intercepted — the wheel
     is never touched, so there is no scroll-jacking. */
  var SCROLL_MS = 1500;

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function glideTo(targetY, done) {
    var startY = window.scrollY;
    var delta = targetY - startY;
    if (Math.abs(delta) < 2) { if (done) done(); return; }
    var root = document.documentElement;
    // Native smooth scrolling would fight these per-frame jumps.
    var previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    var t0 = null;
    function step(now) {
      if (t0 === null) t0 = now;
      var t = Math.min(1, (now - t0) / SCROLL_MS);
      window.scrollTo(0, startY + delta * easeInOutCubic(t));
      if (t < 1) { requestAnimationFrame(step); return; }
      root.style.scrollBehavior = previous;
      if (done) done();
    }
    requestAnimationFrame(step);
  }

  function headerOffset() {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--header-h');
    return parseFloat(v) || 0;
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var hash = a.getAttribute('href');
    if (!hash || hash === '#') return;
    var target = document.querySelector(hash);
    if (!target) return;
    // The mobile panel closes itself and restores focus; let it run first.
    if (a.closest('.nav-mobile')) return;
    e.preventDefault();
    if (reduceMotion) {
      target.scrollIntoView();
      history.pushState(null, '', hash);
      return;
    }
    var y = window.scrollY + target.getBoundingClientRect().top - headerOffset();
    glideTo(Math.max(0, y), function () { history.pushState(null, '', hash); });
  });

  /* ── Active section in the nav ────────────────────────────────── */

  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-link[href^="#"]'));
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var setCurrent = function (id) {
      navLinks.forEach(function (a) {
        if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    };
    // A band across the middle of the viewport decides which section is "current",
    // so the marker changes at a natural reading position rather than at the edge.
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) setCurrent(en.target.id);
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    sections.forEach(function (el) { sectionObserver.observe(el); });
  }

  /* ── Reveal on scroll ─────────────────────────────────────────── */

  if (!reduceMotion && 'IntersectionObserver' in window) {
    // Anything already in view on load stays put — only what sits below the
    // fold gets the fade, so the first screen never animates in.
    var hidden = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'))
      .filter(function (el) { return el.getBoundingClientRect().top > window.innerHeight * 0.88; });

    // Picture blocks get the clip wipe; text blocks get the rise-and-fade.
    // Never clip a block that contains its own [data-reveal] child: a clipped
    // ancestor has no visible area, so IntersectionObserver never fires for
    // anything inside it and the child would stay invisible forever.
    hidden.forEach(function (el) {
      var isPicture = el.classList.contains('frame') ||
                      el.classList.contains('story__figure') ||
                      !!el.querySelector('.frame, .zoom, img');
      var wrapsAReveal = !!el.querySelector('[data-reveal]');
      el.classList.add(isPicture && !wrapsAReveal ? 'reveal-clip' : 'reveal');
    });

    // Siblings revealed together stagger rather than arriving as one block.
    var groups = new Map();
    hidden.forEach(function (el) {
      var parent = el.parentElement;
      if (!groups.has(parent)) groups.set(parent, 0);
      var i = groups.get(parent);
      if (i > 0) el.style.transitionDelay = Math.min(i * 0.12, 0.48) + 's';
      groups.set(parent, i + 1);
    });

    var fired = false;
    var io = new IntersectionObserver(function (entries) {
      fired = true;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-shown');
        io.unobserve(en.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });

    hidden.forEach(function (el) { io.observe(el); });

    setTimeout(function () {
      if (fired) return;
      hidden.forEach(function (el) { el.classList.add('is-shown'); });
    }, 2500);
  }

  /* ── Hero video ───────────────────────────────────────────────── */

  var heroVideo = document.getElementById('hero-video');
  if (heroVideo && !reduceMotion) {
    var show = function () { heroVideo.classList.add('is-visible'); };
    if (heroVideo.readyState >= 3) show();
    else heroVideo.addEventListener('canplay', show, { once: true });
    var playing = heroVideo.play();
    if (playing && playing.catch) playing.catch(function () {});
  } else if (heroVideo) {
    heroVideo.removeAttribute('autoplay');
    heroVideo.pause();
  }

  /* ── Mobile navigation ────────────────────────────────────────── */

  var navPanel = document.getElementById('nav-mobile');
  var navOpenBtn = document.getElementById('nav-open');
  var navCloseBtn = document.getElementById('nav-close');

  function setNav(open) {
    navPanel.hidden = !open;
    navOpenBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) navCloseBtn.focus();
    else navOpenBtn.focus();
  }

  navOpenBtn.addEventListener('click', function () { setNav(true); });
  navCloseBtn.addEventListener('click', function () { setNav(false); });

  navPanel.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () { setNav(false); });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !navPanel.hidden) setNav(false);
  });

  // Leaving the mobile breakpoint hides the trigger, so the panel must not
  // stay open with no way back out.
  var narrow = window.matchMedia('(max-width: 880px)');
  narrow.addEventListener('change', function (e) {
    if (!e.matches && !navPanel.hidden) {
      navPanel.hidden = true;
      navOpenBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  });
})();
