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
.htaccess         Apache rules — DirectoryIndex, caching, security headers, 404
plesk-nginx.conf  the same rules for Plesk's "Additional nginx directives"
_headers          the same rules for Netlify / Cloudflare Pages
assets/           photography, hero video, logos, favicons, OG image
```

**`main` contains only what should be publicly served.** Plesk's git deployment
copies the whole branch into the document root and has no exclude mechanism, so
anything committed here becomes reachable over HTTP.

The Claude Design handoff bundle — the `.dc.html` prototype, its components and
the two chat transcripts — lives on the **`design-source` branch** for exactly
that reason. On `main` it would have been published at
`orionouzeri.gr/design-source/chats/chat1.md`.

Only one of `.htaccess` / `plesk-nginx.conf` / `_headers` applies, depending on
what serves the files. Leaving all three in place is harmless.

## Deploying

Deployment uses **Plesk's built-in Git integration**, which pulls this
repository directly. No FTP credentials and no GitHub Actions workflow are
involved.

Plesk settings:

| Field | Value |
| --- | --- |
| Repository URL | `https://github.com/nikos-ship-it/orion` |
| Branch | `main` |
| Server path | `/orionouzeri.gr` |
| Deployment mode | `Manual` for the first run, then `Automatic` |
| Additional deployment actions | leave empty — this is a static site with no build step |

`/orionouzeri.gr` is the document root itself (it is where the WordPress install
lives), not a parent of it, so no `httpdocs` suffix is needed.

**The `menu.orionouzeri.gr` subdomain is a sibling directory**, not a child of
the deployment path. A deploy cannot reach it and `.htaccess` is not inherited
by it. It is unaffected.

### The old WordPress install shares the directory

Plesk's git deploy writes the repository's files and leaves untracked files
alone, so the old WordPress install survives the deploy in the same directory.
Two consequences:

1. **`index.php` would be served instead of `index.html`** under most
   DirectoryIndex orders. `.htaccess` and `plesk-nginx.conf` both pin
   `index.html` first, but deleting the WordPress files is the durable fix.
2. **If PHP handling is ever removed for this domain, `.php` files get served as
   plain text and `wp-config.php` leaks the database credentials.** Both config
   files deny that file explicitly as a safety net — it is not a substitute for
   deleting it.

Once the new site is confirmed working, delete from `/orionouzeri.gr`:
`wp-admin/`, `wp-includes/`, `wp-content/`, `index.php`, `wp-config.php`,
`wp-config-sample.php`, `wp-*.php`, `license.txt`, `readme.html`,
`.well-known/` may stay (it is used for certificate validation). Back the
directory up first — the Elementor content and media library exist nowhere else.

### nginx vs Apache

Plesk normally fronts Apache with nginx. If **"Smart static files processing"**
is enabled, nginx serves static files itself and **never reads `.htaccess`** —
the caching and security rules there silently do nothing. Paste
`plesk-nginx.conf` into Websites & Domains → orionouzeri.gr → Apache & nginx
Settings → *Additional nginx directives* to get the same behaviour. Adding it is
harmless either way.

Force HTTPS with Plesk's own *Permanent SEO-safe 301 redirect from HTTP to
HTTPS* checkbox under Hosting Settings, not with rewrite rules — stacking both
behind the nginx proxy is the usual cause of redirect loops. The rules are
included but commented out in `.htaccess` for that reason.

## Local preview

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly over `file://` mostly works, but the map iframe
will not load.

## Runtime dependencies

Two things load from the network at runtime:

- **Google Fonts** — Cormorant Garamond (display) and Jost (body/UI).
- **Leaflet + OpenStreetMap tiles** (`map.html`) — the map recolours OSM tiles
  pixel-by-pixel onto a canvas to match the Orion palette, so it needs
  `crossOrigin` tile access. No API key.

Both degrade gracefully: the page falls back to system serif/sans, and the map
area stays an empty sand-coloured panel.

## Analytics, SEO and search console

**Google Analytics 4 — `G-KHPF04X7JW`.** Carried over from the WordPress site,
so history stays in the same property; nothing to create in GA. It loads through
Consent Mode v2 with **every visitor-facing signal defaulting to denied**
(`security_storage`, which is not a choice, is the only one granted). Until a
choice is made GA4 sends cookieless pings, which still report traffic without
setting cookies.

`consent.js` is a Cookiebot-style panel, bottom right, in the logo's palette. It
offers four categories, each wired to the signals it genuinely controls:

| Category | Signals |
| --- | --- |
| Necessary — locked on | none; the site itself and the stored choice |
| Preferences | `functionality_storage`, `personalization_storage` |
| Statistics | `analytics_storage` |
| Marketing | `ad_storage`, `ad_user_data`, `ad_personalization` |

**Allow all** switches everything on, **Allow selection** takes the switches as
they stand, **Decline** denies all four — and Decline sits in the same grid as
Allow all, at the same size, because burying it is exactly what the law is about.
On a phone the categories open behind **Customise**, so the collapsed card clears
the hero's View Menu button on a 640px-tall screen. The choice is stored in
`localStorage` under `orion-consent`, and the **Cookies** button in the footer
reopens the panel with the remembered state, since consent has to be withdrawable.

The old site gated analytics behind the Complianz plugin. `consent.js` is the
static replacement — Orion is in the EU, so running GA without consent is not an
option. To drop analytics altogether, delete `consent.js`, its `<script>` tag,
the `gtag` block and the footer Cookies button in `index.html`, and the "Consent"
section of `styles.css`.

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

1. ~~**Map pin is approximate.**~~ **Done** — confirmed as
   `35.31042465842155, 25.401763819402536` (Plus Code 8C62+5P Hersonissos) and set
   as `ORION` at the top of the `<script>` block in `map.html`. The same pair is
   in the JSON-LD `geo` and in the footer Directions link.
2. **Contact details recovered from the old site** — the Instagram handle is
   `orion_ouzeri` (not `orionouzeri`, which was a guess and is now fixed), and
   the email is `info@orionouzeri.gr`. Facebook is `facebook.com/orion.ouzeri`.
   Both now have circular icon links in the footer, drawn as inline SVG in the
   official brand glyphs — no third-party icon font, nothing to load.
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
- **`menu.orionouzeri.gr` is safe** — confirmed a sibling directory of
  `/orionouzeri.gr` in the Plesk file manager, so the deploy cannot touch it and
  `.htaccess` is not inherited by it. It must keep working regardless: the hero
  CTA, the nav, the footer and the JSON-LD `hasMenu` all point at it.
- **Check `index.html` is what gets served**, not the leftover WordPress
  `index.php`. Load the site in a private window straight after deploying.
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
