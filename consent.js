/**
 * Cookie consent for Google Analytics (GDPR / Greek law).
 *
 * The WordPress site gated GA behind Complianz; this is the static equivalent.
 * index.html sets Consent Mode v2 defaults to "denied", so GA4 sends only
 * cookieless pings until someone accepts here. On accept we flip
 * analytics_storage to granted; the choice is remembered in localStorage.
 *
 * To remove analytics entirely: delete this file, its <script> tag, the gtag
 * block in index.html, and the "Consent banner" section of styles.css.
 */
(function () {
  'use strict';

  var KEY = 'orion-consent';
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) { /* private mode */ }

  function remember(value) {
    try { localStorage.setItem(KEY, value); } catch (e) { /* nothing we can do */ }
  }

  function grant() {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', { analytics_storage: 'granted' });
    }
  }

  if (stored === 'granted') { grant(); return; }
  if (stored === 'denied') return;

  var bar = document.createElement('div');
  bar.className = 'consent';
  bar.setAttribute('role', 'dialog');
  bar.setAttribute('aria-label', 'Cookie consent');
  bar.innerHTML =
    '<p class="consent__text">We use Google Analytics to understand how this site is used. ' +
    'No analytics cookies are set unless you accept.</p>' +
    '<div class="consent__actions">' +
      '<button type="button" class="consent__accept">Accept</button>' +
      '<button type="button" class="consent__decline">Decline</button>' +
    '</div>';

  function close(choice) {
    remember(choice);
    if (choice === 'granted') grant();
    bar.classList.remove('is-in');
    // Matches the CSS transition; removing it early would kill the fade.
    setTimeout(function () { bar.remove(); }, 400);
  }

  bar.querySelector('.consent__accept').addEventListener('click', function () { close('granted'); });
  bar.querySelector('.consent__decline').addEventListener('click', function () { close('denied'); });

  document.body.appendChild(bar);
  requestAnimationFrame(function () { bar.classList.add('is-in'); });
})();
