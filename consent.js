/**
 * Cookie consent (GDPR / Greek law), in the Cookiebot mould.
 *
 * Four categories, each wired to the Google Consent Mode v2 signals it actually
 * governs — the toggles are not decorative. Everything except Necessary starts
 * denied; index.html sets those defaults before gtag.js loads, so nothing is
 * stored until a choice is made. Until then GA4 sends cookieless pings, which
 * still report traffic without setting cookies.
 *
 * The choice lives in localStorage under 'orion-consent'. The Cookies button in
 * the footer reopens the panel, because consent has to be withdrawable.
 *
 * To remove analytics entirely: delete this file, its <script> tag, the gtag
 * block and the footer Cookies button in index.html, and the "Consent" section
 * of styles.css.
 */
(function () {
  'use strict';

  var KEY = 'orion-consent';

  var CATEGORIES = [
    {
      id: 'necessary',
      label: 'Necessary',
      locked: true,
      desc: 'Required for the site to work — page navigation and your cookie choice itself. These cannot be switched off.'
    },
    {
      id: 'preferences',
      label: 'Preferences',
      desc: 'Remember choices that change how the site behaves or looks, such as your language.'
    },
    {
      id: 'statistics',
      label: 'Statistics',
      desc: 'Help us understand how the site is used, by collecting and reporting information anonymously.'
    },
    {
      id: 'marketing',
      label: 'Marketing',
      desc: 'Used to measure the effect of advertising. We do not currently run ads.'
    }
  ];

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function write(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  /* Each category maps to the Consent Mode signals it genuinely controls, so a
     toggle switched off really does withhold that storage. */
  function apply(state) {
    if (typeof window.gtag !== 'function') return;
    var yes = function (v) { return v ? 'granted' : 'denied'; };
    window.gtag('consent', 'update', {
      functionality_storage: yes(state.preferences),
      personalization_storage: yes(state.preferences),
      analytics_storage: yes(state.statistics),
      ad_storage: yes(state.marketing),
      ad_user_data: yes(state.marketing),
      ad_personalization: yes(state.marketing)
    });
  }

  var stored = read();
  if (stored) apply(stored);

  var panel = null;

  function close() {
    if (!panel) return;
    var el = panel;
    panel = null;
    el.classList.remove('is-in');
    document.documentElement.classList.remove('has-consent');
    setTimeout(function () { el.remove(); }, 400);
  }

  function commit(state) {
    write(state);
    apply(state);
    close();
  }

  function open() {
    if (panel) return;
    var current = read() || { necessary: true, preferences: false, statistics: false, marketing: false };

    panel = document.createElement('div');
    panel.className = 'consent';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-label', 'Cookie preferences');

    var rows = CATEGORIES.map(function (c) {
      var on = c.locked ? true : !!current[c.id];
      return '<div class="consent__row">' +
               '<button type="button" class="consent__switch" data-cat="' + c.id + '"' +
                 ' role="switch" aria-checked="' + on + '"' +
                 (c.locked ? ' disabled aria-disabled="true"' : '') +
                 ' aria-label="' + c.label + '"><span></span></button>' +
               '<div class="consent__meta">' +
                 '<p class="consent__label">' + c.label + (c.locked ? ' <em>always on</em>' : '') + '</p>' +
                 '<p class="consent__desc">' + c.desc + '</p>' +
               '</div>' +
             '</div>';
    }).join('');

    panel.innerHTML =
      '<div class="consent__head">' +
        '<img class="consent__mark" src="assets/orion-logo.png" alt="" width="34">' +
        '<p class="consent__title">Cookies on this site</p>' +
      '</div>' +
      '<p class="consent__intro">We use cookies to understand how this site is used. Only the necessary ones are on by default.</p>' +
      '<div class="consent__rows" id="consent-rows">' + rows + '</div>' +
      '<div class="consent__actions">' +
        '<button type="button" class="consent__btn consent__btn--all" data-act="all">Allow all</button>' +
        '<button type="button" class="consent__btn consent__btn--some" data-act="some">Allow selection</button>' +
        '<button type="button" class="consent__btn consent__btn--more" aria-expanded="false" aria-controls="consent-rows">Customise</button>' +
        '<button type="button" class="consent__btn consent__btn--deny" data-act="deny">Decline</button>' +
      '</div>';

    /* On a phone the four categories are opened on request rather than shown up
       front. Expanded, the panel takes roughly half a short screen and sits over
       the hero's primary CTA; collapsed it is a slim card that clears it. On a
       wide screen there is room for everything, so it opens expanded. */
    var more = panel.querySelector('.consent__btn--more');
    var compact = window.matchMedia('(max-width: 640px)').matches;
    if (!compact) panel.classList.add('is-open');
    // One way only. Once the categories are on screen the next tap should be a
    // decision, not a way back to a screen with less information on it; Customise
    // gives up its place in the grid to Allow selection.
    more.addEventListener('click', function () {
      panel.classList.add('is-open');
      more.setAttribute('aria-expanded', 'true');
      publishHeight();
    });

    // Switches flip their own aria-checked; the panel reads them on commit, so
    // aria state and the stored value can never drift apart.
    panel.querySelectorAll('.consent__switch').forEach(function (sw) {
      if (sw.disabled) return;
      sw.addEventListener('click', function () {
        sw.setAttribute('aria-checked', sw.getAttribute('aria-checked') === 'true' ? 'false' : 'true');
      });
    });

    var collect = function () {
      var out = { necessary: true };
      panel.querySelectorAll('.consent__switch').forEach(function (sw) {
        out[sw.dataset.cat] = sw.disabled ? true : sw.getAttribute('aria-checked') === 'true';
      });
      return out;
    };

    // [data-act], not .consent__btn: Customise shares the button class but is not
    // a decision, and treating it as one committed a silent Decline.
    panel.querySelectorAll('.consent__btn[data-act]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var act = btn.dataset.act;
        if (act === 'all') {
          commit({ necessary: true, preferences: true, statistics: true, marketing: true });
        } else if (act === 'deny') {
          commit({ necessary: true, preferences: false, statistics: false, marketing: false });
        } else {
          commit(collect());
        }
      });
    });

    document.body.appendChild(panel);

    // On a phone the panel covers the hero's primary CTA, so publish its height
    // and let the hero reserve room for it.
    var publishHeight = function () {
      document.documentElement.style.setProperty('--consent-h', panel.offsetHeight + 'px');
    };
    publishHeight();
    window.addEventListener('resize', publishHeight);
    document.documentElement.classList.add('has-consent');

    requestAnimationFrame(function () { panel.classList.add('is-in'); });
  }

  if (!stored) open();

  var reopen = document.getElementById('cookie-settings');
  if (reopen) reopen.addEventListener('click', open);
})();
