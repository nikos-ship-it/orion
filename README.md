# Orion Ouzeri

Single-page editorial website for **Orion Ouzeri**, a seafront Cretan ouzeri in
Hersonissos, Crete. Plain static HTML/CSS/JS — no build step, no dependencies.

Deploy by serving the repository root as-is (GitHub Pages, Netlify, Cloudflare
Pages, or any static host).

## Structure

```
index.html        the page
404.html          error page
styles.css        all styles
script.js         header state, scroll reveals, parallax, hero video, mobile nav
consent.js        cookie consent gate for Google Analytics
map.html          the Visit-section map, embedded as an iframe
robots.txt        crawl rules + sitemap pointer
sitemap.xml       one URL
site.webmanifest  icons, theme colour
.htaccess         Apache/LiteSpeed config (top.host, cPanel) — compression,
                  caching, security headers, 404
_headers          the same rules for Netlify / Cloudflare Pages
assets/           photography, hero video, logos, favicons, OG image
design-source/    the Claude Design handoff bundle this was built from
```

Only one of `.htaccess` / `_headers` is read, depending on the host. Leaving
both in place is harmless.

`design-source/` is provenance, not part of the deployed site: the original
`.dc.html` prototype, its components, and the two chat transcripts that record
the design decisions. Nothing in the site references it.

## Deploying

`.github/workflows/deploy.yml` uploads the site to top.host over FTPS. It is
**manual only** (Actions → *Deploy to top.host* → *Run workflow*) until you
uncomment the push trigger.

Add these repository secrets first (Settings → Secrets and variables → Actions):

| Secret | Value |
| --- | --- |
| `FTP_SERVER` | FTP hostname from top.host, e.g. `ftp.orionouzeri.gr` |
| `FTP_USERNAME` | FTP user |
| `FTP_PASSWORD` | FTP password |
| `FTP_SERVER_DIR` | Optional. Defaults to `/public_html/`. Trailing slash required. |

The deploy is **incremental and non-destructive**: `dangerous-clean-slate` is
`false`, so it only removes files it uploaded on an earlier run and never touches
files it has not seen. Pre-existing WordPress files and anything belonging to a
subdomain stay put. `design-source/` and `README.md` are excluded; `.htaccess`
is not, because production needs it.

Because old WordPress files are left in place, `wp-admin` and friends remain
reachable after launch. Remove them manually once you are happy with the new
site — an unmaintained WordPress install is worth deleting rather than leaving
dormant.

## Local preview

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly over `file://` mostly works, but the map iframe
will not load.

## Runtime dependencies

Two things load from the network at runtime:

- **Google Fonts** — EB Garamond (display) and Manrope (body/UI).
- **Leaflet + OpenStreetMap tiles** (`map.html`) — the map recolours OSM tiles
  pixel-by-pixel onto a canvas to match the Orion palette, so it needs
  `crossOrigin` tile access. No API key.

Both degrade gracefully: the page falls back to system serif/sans, and the map
area stays an empty sand-coloured panel.

## Analytics, SEO and search console

**Google Analytics 4 — `G-KHPF04X7JW`.** Carried over from the WordPress site,
so history stays in the same property; nothing to create in GA. It loads through
Consent Mode v2 with `analytics_storage` defaulting to **denied**, and
`consent.js` grants it only after the visitor accepts. Until then GA4 sends
cookieless pings, which still report traffic without setting cookies. The choice
is stored in `localStorage` under `orion-consent`.

The old site gated analytics behind the Complianz plugin. `consent.js` is the
static replacement — Orion is in the EU, so running GA without consent is not an
option. To drop analytics altogether, delete `consent.js`, its `<script>` tag,
the `gtag` block in `index.html`, and the "Consent banner" section of
`styles.css`.

**Google Tag Manager: the old site never had a container** — it used gtag.js
directly, which is what this site does too. Add GTM only if you actually need to
manage several tags; for one GA4 property it is a pointless extra request.

**Google Search Console: no verification tag existed on the old site**, so it
was verified by DNS or via the GA property. Verify by **DNS TXT record** if you
can — it survives every future redesign. If you verify by HTML tag instead,
paste it at the marked comment in `<head>`. Then submit
`https://orionouzeri.gr/sitemap.xml`.

**The old site was set to `noindex, nofollow`** — it was invisible to Google.
This site sets `index, follow`. Expect indexing to take days to weeks, and watch
Search Console's Pages report after launch.

Also in place: canonical URL, Open Graph and Twitter card with a 1200×630 image,
`Restaurant` JSON-LD (address, phone, email, daily hours, cuisines, menu link,
amenities, Facebook + Instagram), favicons at 32/180/192/512, and a hero-image
preload for LCP.

The JSON-LD deliberately has **no `geo` block**. Publishing coordinates that are
still an estimate risks Google trusting them over the street address — add `geo`
only once the exact latitude/longitude is confirmed (see below).

Two places carry the opening hours: the `<meta name="description">` and the
JSON-LD `openingHoursSpecification`. Update both if the hours change.

## Open items

1. **Map pin is approximate.** `map.html` centres on `35.31010, 25.40300`. This
   was estimated from the venue's surroundings, not confirmed. To fix: in Google
   Maps, right-click the exact spot, copy the coordinates, and replace `ORION`
   near the top of the `<script>` block in `map.html`.
2. **Contact details recovered from the old site** — the Instagram handle is
   `orion_ouzeri` (not `orionouzeri`, which was a guess and is now fixed), and
   the email is `info@orionouzeri.gr`. Facebook is `facebook.com/orion.ouzeri`;
   it appears in the JSON-LD `sameAs` but has no visible footer link, since the
   approved design specified only Instagram, Menu, Directions and Call. Say if
   you want it added.
3. ~~**Hero video is 16 MB.**~~ **Done** — re-encoded to **2.36 MB** (was 15.3 MB,
   an 85% cut) at unchanged 1280×720 and 50 fps, H.264 `crf 28 -preset slow`,
   faststart, no audio track.

   Two findings worth keeping if it is ever re-encoded:

   - **Do not halve the frame rate.** The clip is a slow dolly move, so every
     frame carries motion. At 25 fps, SSIM against the source plateaus at ~0.87
     no matter the bitrate; at 50 fps `crf 28` scores **0.970 in a smaller
     file**. Dropping frames cost quality *and* bytes.
   - **WebM/VP9 is not worth shipping for this clip.** Matched to the same
     quality (SSIM ≈ 0.970), VP9 came out at 2.62 MB versus H.264's 2.36 MB —
     larger, plus a second file to maintain and no help for Safari. The design
     brief suggested a WebM source; the measurement says skip it here.
4. **Photography is ~1200 px on the long edge.** The design called for roughly
   2× the display size. Higher-resolution originals can be dropped into
   `assets/` under the same filenames with no code changes.
5. **Street number mismatch on the old site.** Its text said `Kallergi 8` but its
   Google Maps embed queried `Kallergi 7`. This site uses **Kallergi 8**
   throughout. Worth confirming which is correct, since the address feeds the
   structured data and Google Business Profile.

## Before replacing the WordPress site

- **Back up the old site first** — files *and* database. The Elementor page
  content and the `wp-content/uploads/` media library only exist there, and this
  site reuses none of it.
- **Check where subdomains point.** If a subdomain's document root sits inside
  the folder you deploy into, a deploy that deletes-then-writes can remove it,
  and the `.htaccess` here would also apply to it. Confirm the document root of
  `menu.orionouzeri.gr` in the hosting panel before the first deploy.
- **Keep `menu.orionouzeri.gr` working** — the hero CTA, the nav, the footer and
  the JSON-LD `hasMenu` all point at it.
- **Redirect stale WordPress URLs to `/`** once traffic moves, so any indexed
  `/feed/`, `/wp-json/` or attachment pages don't turn into 404s.

## Notes on the implementation

- Colour and type tokens are CSS custom properties on `:root` in `styles.css`.
- Copy and external links match the approved prototype exactly.
- `prefers-reduced-motion: reduce` disables the scroll reveals, the parallax on
  the story image, and hero-video playback.
- Images below the fold are lazy-loaded; the hero image and logos are eager.
- The story image uses `object-position: 50% 86.7%`, which reproduces the manual
  crop set on that photo during design.
