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

    hidden.forEach(function (el) { el.classList.add('reveal'); });

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
