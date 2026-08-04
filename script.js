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
  // Elements still waiting to be revealed. IntersectionObserver can miss some of
  // them during a fast fling, and a missed one would stay invisible for good, so
  // the scroll loop sweeps up anything that has already reached the viewport.
  var pendingReveals = [];
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

    if (pendingReveals.length) {
      var vh = window.innerHeight;
      // Once the page can scroll no further, the last element never gets any
      // closer to the trigger line — a tall block at the very bottom could sit
      // just past it after a hard fling and stay hidden. At the bottom, flush
      // whatever is left.
      var atBottom = vh + window.scrollY >= document.documentElement.scrollHeight - 2;
      var limit = vh * 0.9;
      pendingReveals = pendingReveals.filter(function (el) {
        if (!atBottom && el.getBoundingClientRect().top > limit) return true;
        el.classList.add('is-shown');
        return false;
      });
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
  var settleTimer = null;
  function onScroll() {
    // One more pass shortly after scrolling stops. The rAF-throttled frame can
    // be mid-flight when the last scroll event arrives, and if a straggling
    // reveal is only caught by the sweep there would be no further event to
    // trigger it — a fling to the bottom would leave it invisible.
    clearTimeout(settleTimer);
    settleTimer = setTimeout(frame, 180);
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
    var seenThisSession = false;
    try { seenThisSession = sessionStorage.getItem('orion-seen') === '1'; } catch (e) {}

    var dismissed = false;
    var dismiss = function () {
      if (dismissed) return;
      dismissed = true;
      try { sessionStorage.setItem('orion-seen', '1'); } catch (e) {}
      preloader.classList.add('is-done');
      // Hand off to the hero entrance as the curtain lifts.
      document.body.classList.add('hero-in');
      // Drop it from the tree once faded so it can never trap focus or clicks.
      setTimeout(function () { preloader.remove(); }, 1000);
    };

    if (seenThisSession || reduceMotion) {
      // The curtain is a first-impression, not a toll gate. If it has already
      // played this session (or motion is reduced), lift it on the next frame.
      requestAnimationFrame(dismiss);
    } else {
      // Give the intro room to read, but never gate on it. 1.1s min (was 1.6s).
      var MIN_MS = 1100;
      var started = Date.now();
      var whenReady = function () {
        setTimeout(dismiss, Math.max(0, MIN_MS - (Date.now() - started)));
      };

      // Lift as soon as the hero image has decoded — usually well before full
      // page load — so the curtain tracks the thing it is covering.
      var heroImg = document.querySelector('.hero__media img');
      if (heroImg && heroImg.complete) whenReady();
      else if (heroImg) heroImg.addEventListener('load', whenReady, { once: true });

      if (document.readyState === 'complete') whenReady();
      else window.addEventListener('load', whenReady);

      // Hard ceiling: a stalled or failed asset must not leave the page hidden.
      setTimeout(dismiss, 2500);
    }
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

    pendingReveals = hidden.slice();

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-shown');
        pendingReveals = pendingReveals.filter(function (el) { return el !== en.target; });
        io.unobserve(en.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });

    hidden.forEach(function (el) { io.observe(el); });
  }

  /* ── Hero video ───────────────────────────────────────────────── */

  var heroVideo = document.getElementById('hero-video');
  var heroMotion = document.getElementById('hero-motion');
  if (heroVideo && !reduceMotion) {
    var show = function () { heroVideo.classList.add('is-visible'); };
    if (heroVideo.readyState >= 3) show();
    else heroVideo.addEventListener('canplay', show, { once: true });
    var playing = heroVideo.play();
    if (playing && playing.catch) playing.catch(function () {});

    // Reveal the pause control only once the video is really running.
    if (heroMotion) {
      heroMotion.hidden = false;
      heroMotion.addEventListener('click', function () {
        if (heroVideo.paused) {
          heroVideo.play();
          heroMotion.classList.remove('is-paused');
          heroMotion.setAttribute('aria-label', 'Pause background video');
        } else {
          heroVideo.pause();
          heroMotion.classList.add('is-paused');
          heroMotion.setAttribute('aria-label', 'Play background video');
        }
      });
    }
  } else if (heroVideo) {
    heroVideo.removeAttribute('autoplay');
    heroVideo.pause();
    if (heroMotion) heroMotion.remove();
  }

  /* ── Gallery carousel ─────────────────────────────────────────── */

  var track = document.getElementById('carousel-track');
  if (track && track.children.length) {
    var slides = Array.prototype.slice.call(track.children);
    var dotsBox = document.getElementById('carousel-dots');
    var countEl = document.getElementById('carousel-count');
    var arrows = Array.prototype.slice.call(document.querySelectorAll('.carousel__btn'));
    var index = 0;
    var manual = false;   // a real interaction retires the autoplay for good
    var timer = null;

    // Dots are generated from the slide count, so adding a <li> is enough.
    // Dots are optional: the markup may omit the container (the strip reads as a
    // filmstrip and the chevrons carry the interaction).
    var dots = !dotsBox ? [] : slides.map(function (_, i) {
      var d = document.createElement('button');
      d.type = 'button';
      d.className = 'carousel__dot';
      d.setAttribute('role', 'tab');
      d.setAttribute('aria-label', 'Photograph ' + (i + 1) + ' of ' + slides.length);
      d.addEventListener('click', function () { stopAuto(); goTo(i); });
      dotsBox.appendChild(d);
      return d;
    });

    // Measure against the track's live content edge rather than computing
    // absolute scroll offsets: the track has fluid padding and scroll-snap
    // resolves its own rest positions, so an offsetLeft-based sum sat a
    // padding-width out and the index disagreed with what was on screen.
    var contentLeft = function () {
      return track.getBoundingClientRect().left +
             parseFloat(getComputedStyle(track).paddingLeft || 0);
    };
    var nearestIndex = function () {
      var edge = contentLeft(), best = 0, bestDist = Infinity;
      for (var i = 0; i < slides.length; i++) {
        var d = Math.abs(slides[i].getBoundingClientRect().left - edge);
        if (d < bestDist) { bestDist = d; best = i; }
      }
      return best;
    };

    // A lazy <img> inside a horizontally scrolled strip never enters the
    // viewport on vertical scroll, so it would sit unloaded until clicked and
    // then pop in. Promote the neighbours as soon as they are one step away;
    // assigning loading="eager" starts the fetch immediately.
    function warmNeighbours() {
      [index - 1, index + 1].forEach(function (i) {
        var slide = slides[i];
        if (!slide) return;
        var img = slide.querySelector('img');
        if (img && img.loading === 'lazy') img.loading = 'eager';
      });
    }

    // The ends are a question about scroll position, not about the index: the
    // last slide can never align to the left edge, so scrollLeft clamps and the
    // index never reaches slides.length - 1.
    function atStart() { return track.scrollLeft <= 2; }
    function atEnd() {
      return track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    }

    function paint() {
      warmNeighbours();
      // Position status for magnifier / screen-reader users — a 17-slide strip
      // gave no sense of place without it. aria-live announces each move.
      if (countEl) countEl.textContent = (index + 1) + ' / ' + slides.length;
      dots.forEach(function (d, i) { d.setAttribute('aria-selected', String(i === index)); });
      arrows.forEach(function (a) {
        var dir = Number(a.dataset.dir);
        // Only disable at the ends once the visitor is driving; while autoplay
        // is running it wraps, so nothing is ever a dead end.
        a.disabled = manual && ((dir < 0 && atStart()) || (dir > 0 && atEnd()));
      });
    }

    function goTo(i) {
      index = Math.max(0, Math.min(slides.length - 1, i));
      // scrollBy with a delta measured from where things currently are. This is
      // deliberately NOT scrollIntoView: that scrolls whatever ancestor it must
      // to reveal the element, so a slide taller than the viewport dragged the
      // whole PAGE down to the gallery every time autoplay advanced. scrollBy
      // touches only this track, and a relative delta needs no absolute-offset
      // arithmetic, which is what was a padding-width out before.
      var delta = slides[index].getBoundingClientRect().left - contentLeft();
      track.scrollBy({ left: delta, behavior: reduceMotion ? 'auto' : 'smooth' });
      paint();
    }

    function stopAuto() {
      manual = true;
      if (timer) { clearInterval(timer); timer = null; }
      paint();
    }

    arrows.forEach(function (a) {
      a.addEventListener('click', function () {
        stopAuto();
        goTo(index + Number(a.dataset.dir));
      });
    });

    // Swiping and native scrolling are the source of truth for the index.
    var settle = null;
    track.addEventListener('scroll', function () {
      clearTimeout(settle);
      settle = setTimeout(function () {
        index = nearestIndex();
        paint();
      }, 90);
    }, { passive: true });

    track.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      stopAuto();
      goTo(index + (e.key === 'ArrowRight' ? 1 : -1));
    });

    window.addEventListener('resize', function () { index = nearestIndex(); paint(); });

    if (!reduceMotion) {
      // Autoplay advertises that the strip scrolls, then gets out of the way:
      // it steps through once and retires at the end rather than looping forever
      // under a reading eye competing with the scroll-reveals. Slower cadence too.
      var autoRetired = false;
      var tick = function () {
        if (manual) return;
        if (atEnd()) { pauseAuto(); autoRetired = true; return; }
        goTo(index + 1);
      };
      var startAuto = function () {
        if (manual || timer || autoRetired) return;
        timer = setInterval(tick, 6000);
      };
      var pauseAuto = function () { if (timer) { clearInterval(timer); timer = null; } };

      // Only run while the strip is actually on screen.
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) startAuto(); else pauseAuto();
          });
        }, { threshold: 0.25 }).observe(track);
      } else {
        startAuto();
      }

      // Pause while someone is looking at or touching it, and while the tab is
      // in the background — an unseen carousel should not keep advancing.
      track.addEventListener('mouseenter', pauseAuto);
      track.addEventListener('mouseleave', startAuto);
      track.addEventListener('focusin', pauseAuto);
      track.addEventListener('focusout', startAuto);
      track.addEventListener('touchstart', stopAuto, { passive: true });
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) pauseAuto(); else startAuto();
      });
    }

    // Whether a slide gets loaded should not depend on how long someone lingers
    // or on where autoplay happens to have reached. Once the strip is on screen,
    // commit to fetching all of it.
    if ('IntersectionObserver' in window) {
      var warmAll = new IntersectionObserver(function (entries, obs) {
        if (!entries.some(function (en) { return en.isIntersecting; })) return;
        slides.forEach(function (s) {
          var img = s.querySelector('img');
          if (img && img.loading === 'lazy') img.loading = 'eager';
        });
        obs.disconnect();
      }, { rootMargin: '200px 0px' });
      warmAll.observe(track);
    }

    paint();
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

  /* ── Open / closed status ─────────────────────────────────────── */

  // Driven off the venue's own timezone, not the visitor's: a traveller reading
  // this from another country must see whether Orion is open in CRETE. The hours
  // (15:00–23:00 daily) are the single source; keep them equal to the JSON-LD.
  var statusEl = document.querySelector('[data-open-status]');
  if (statusEl) {
    var OPEN_HOUR = 15, CLOSE_HOUR = 23, VENUE_TZ = 'Europe/Athens';
    var athensMinutes = function () {
      // en-GB, 24h, in the venue timezone → "HH:MM"; Intl applies Athens DST.
      var hm = new Date().toLocaleString('en-GB', {
        timeZone: VENUE_TZ, hour12: false, hour: '2-digit', minute: '2-digit'
      }).split(':');
      return (parseInt(hm[0], 10) % 24) * 60 + parseInt(hm[1], 10);
    };
    var renderStatus = function () {
      var open = (function () {
        var m = athensMinutes();
        return m >= OPEN_HOUR * 60 && m < CLOSE_HOUR * 60;
      })();
      statusEl.hidden = false;
      statusEl.setAttribute('data-state', open ? 'open' : 'closed');
      statusEl.textContent = open ? 'Open now · until 11 PM' : 'Closed · opens 3 PM';
    };
    renderStatus();
    setInterval(renderStatus, 60000);
  }
})();
