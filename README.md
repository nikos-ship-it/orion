# Orion Ouzeri

Single-page editorial website for **Orion Ouzeri**, a seafront Cretan ouzeri in
Hersonissos, Crete. Plain static HTML/CSS/JS — no build step, no dependencies.

Deploy by serving the repository root as-is (GitHub Pages, Netlify, Cloudflare
Pages, or any static host).

## Structure

```
index.html      the page
styles.css      all styles
script.js       header state, scroll reveals, parallax, hero video, mobile nav
map.html        the Visit-section map, embedded as an iframe
assets/         photography, hero video, logos
design-source/  the Claude Design handoff bundle this was built from
```

`design-source/` is provenance, not part of the deployed site: the original
`.dc.html` prototype, its components, and the two chat transcripts that record
the design decisions. Nothing in the site references it.

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

## Open items

1. **Map pin is approximate.** `map.html` centres on `35.31010, 25.40300`. This
   was estimated from the venue's surroundings, not confirmed. To fix: in Google
   Maps, right-click the exact spot, copy the coordinates, and replace `ORION`
   near the top of the `<script>` block in `map.html`.
2. **Instagram handle unconfirmed** — the footer links to
   `instagram.com/orionouzeri`.
3. **Hero video is 16 MB.** It is faststart-ordered so playback begins before
   the full download completes, but it should still be compressed and given a
   WebM sibling source. It is video-only (no audio track), 
   H.264/MP4, and plays muted on loop.
4. **Photography is ~1200 px on the long edge.** The design called for roughly
   2× the display size. Higher-resolution originals can be dropped into
   `assets/` under the same filenames with no code changes.

## Notes on the implementation

- Colour and type tokens are CSS custom properties on `:root` in `styles.css`.
- Copy and external links match the approved prototype exactly.
- `prefers-reduced-motion: reduce` disables the scroll reveals, the parallax on
  the story image, and hero-video playback.
- Images below the fold are lazy-loaded; the hero image and logos are eager.
- The story image uses `object-position: 50% 86.7%`, which reproduces the manual
  crop set on that photo during design.
