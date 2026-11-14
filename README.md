# Chris Mackintosh portfolio

Source for Chris Mackintosh’s personal portfolio, built with Astro, TypeScript strict, and vanilla CSS.

## Run

Node 22.12 or newer. Dependencies are pinned in `package-lock.json`.

```sh
npm ci --include=dev
npm run dev -- --port 4175
npm run build
npm run preview -- --port 4175
```

`npm run build` runs Astro's strict type checks before producing `dist/`. No Python, prototype folder, absolute host path, or sibling repository is needed to build. The retained DOM controllers are plain JavaScript; Astro components and test/configuration code use TypeScript strict. A successful Astro check does not imply that every legacy JavaScript expression is type checked.

## Source map

- `src/pages/`: homepage, product overview, initiative detail, retained archive pages, robots, and sitemap; all are static direct routes.
- `src/layouts/Base.astro`: metadata, route-specific styles, early appearance/navigation controllers.
- `src/components/`: homepage sections and shared theme controls.
- `src/styles/tokens.css`: shared semantic palette; `home.css` and `product.css` preserve the approved cascade.
- `src/scripts/`: original interaction controllers, preserving execution order and real-URL fallbacks.
- `public/`: only referenced artwork, active fonts, their supplied licenses, and preview robots policy.
- [STYLEGUIDE.md](STYLEGUIDE.md): implemented rules. `/style-guide/` is available during `npm run dev` and is omitted from production output.
- `tests/portfolio.spec.ts`: direct routes, refresh, responsive boundaries, theme persistence, return-scroll navigation, link focus, motion, no-JavaScript content, and axe checks.

The original prototype remains intact outside this repository. Historical screenshots, source references, backup folders, Python builders, and retired font experiments were not imported.

## Test

```sh
npm run test:weather
npm test
```

Playwright expects compatible Chromium and WebKit browsers. On a machine with installed Chrome, `PW_CHROME_CHANNEL=chrome npm test -- --project=chromium` uses it. An existing compatible WebKit can be selected with `PW_WEBKIT_EXECUTABLE`. Browser binaries are a separate installation; these scripts do not download them automatically. CI installs its own ephemeral Chromium browser.

CI runs a clean dependency install, weather tests, strict build, and Chromium checks on pull requests and main pushes. It then builds and validates a production candidate and saves it as a downloadable artifact for review. CI has read-only repository permissions and cannot publish the site.

## Public Markdown

Every page footer links to `/site.md`, a concise public summary. `/llms.txt` indexes the public routes and is discoverable through a `rel="describedby"` link in the page head. These are static files, accessible without JavaScript. They are summaries and navigation aids, not full Markdown copies of the visual pages.

Keep `public/site.md` and `public/llms.txt` aligned with approved public copy and project publication status when editing the site. Do not copy repository notes or private source documents into them. Preview indexing restrictions remain in force.

## Release boundary

This is a local release candidate. Default builds emit `noindex, nofollow`, disallow-all robots, and an empty sitemap. Only a production build with both `SITE_INDEXING=enabled` and `DEPLOY_TARGET=github-pages-production` emits indexable pages, allow-all robots, and the five public canonical routes in `/sitemap.xml`. Missing or preview target values keep indexing disabled, even if the indexing flag is enabled. Only enable the flag for the approved production cutover; rebuild when changing it. No deployment or domain changes are performed by these commands.

The homepage, product pages, and archives use absolute production canonical URLs and shared Open Graph/Twitter metadata. `build.format: preserve` keeps index-based project paths and emits the legacy `.html` files directly. Do not enable host-level clean-URL rewriting without checking these exact routes:

- `/case-studies/visible-core-experience.html`
- `/case-studies/visible-esim.html`

The former `/privacy-policy.html` page was retired at Chris’s request. Its extensionless host alias `/privacy-policy` is also expected to return 404 after publication. The source remains recoverable in Git history; no public archive or replacement redirect is generated.

Archives contain condensed public narratives, not obsolete embeds or unverified growth/NPS figures. They do not imply that the expanded case studies are finished. Preserve the prior live revision and published artifact before replacing the site; the existing public repository remains the publishing destination.

No analytics or third-party embeds are included. The sky uses the local Denver solar calculation plus direct NWS observations from Denver International Airport (`KDEN`). Browser requests omit credentials and referrers, use the standard browser User-Agent, and need no API key or backend. A successful observation is cached locally for 15 minutes; each visible page attempts refresh at most every 15 minutes. Observations older than two hours, malformed responses, and unavailable service fall back to local daylight. No visitor geolocation is requested. The old Open-Meteo controller is unreferenced and absent from the public bundle. Manual theme switches update text and surface colors together to avoid temporary contrast failure. A choice expires at the next Denver sunrise or sunset, restoring automatic mode. Legacy untimestamped choices are retired once; open tabs recheck expiration on resume and pages restored from the back/forward cache.

## Brand assets

`public/social-preview.png` is Chris's 1200×630 Figma Open Graph/Twitter card. `public/favicon.svg` and `favicon-48.png` are the matching Figma favicon exports. Replace these source assets from Figma when the design changes; preserve their existing filenames so metadata continues to resolve.

Run `node scripts/generate-brand-assets.mjs` after updating the SVG to derive `favicon-32.png` and `apple-touch-icon.png` (180×180) with repository-local Sharp. This preserves the Figma SVG, 48px PNG, and social card; it no longer generates placeholder artwork. No browser, font, or package download is required.

The overview uses responsive WebP derivatives of its retained original artwork. Run `npm run assets:images` after replacing that source image; the installed repository-local Sharp produces the 640, 1200, and 2000px variants without changing the original.

## GitHub Pages publication

The manual `.github/workflows/pages.yml` workflow targets `chrismackintosh/portfolio-2025` on `main` and skips other repositories. The custom domain remains `chrismackintosh.work`.

Prepare changes on a review branch, open a pull request, and review the successful CI artifact before merging. When migrating from legacy branch-based Pages, **do not merge replacement source into the publishing branch while legacy publishing is active**: a merge can publish automatically.

At an explicitly approved cutover, select **GitHub Actions** as the Pages publishing source, retaining the custom domain and HTTPS setting. Preserve existing DNS records. Configure the `github-pages` environment to permit only `main`, with a reviewer where available. After the reviewed PR is merged and its checks pass, dispatch **Publish GitHub Pages** on that reviewed `main` revision and enter `chrismackintosh.work` as confirmation.

The workflow runs weather tests, an unindexed build and Chromium checks, then rebuilds with the two production flags, runs `npm run check:pages`, uploads `dist/`, and deploys. It does not publish on pushes or pull requests. `public/CNAME` and `public/.nojekyll` travel with the artifact. The release check verifies the domain, exact legacy routes, canonical URLs, robots and sitemap, and omission of the development reference page.

Review the exact candidate before dispatch and verify all public routes, assets, apex/www behavior and privacy after publication. Rollback restores the preserved prior release through the authorized publishing process; it does not require moving DNS.

References: [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [NWS API](https://www.weather.gov/documentation/services-web-api), [NWS browser User-Agent guidance](https://github.com/weather-gov/api/discussions/312).

## Release review

Before publication, review content and artwork, keyboard and screen-reader behavior, responsive layouts, performance, remote CI results, the exact candidate artifact, and the rollback package. Verify domain behavior, all five routes, assets, privacy, metadata, robots, and sitemap after publication. A passing automated audit does not replace manual review.

## Synack share entry

`/synack/` serves the shared homepage and initializes its existing Synack chapter (`#stop-4`). The pathname stays intact; there is no redirect or homepage canonical, so saving the link without its fragment retains the destination. Explicit fragments still take precedence. The entry reuses approved content and artwork. Production marks this duplicate entry `noindex, follow` and leaves the five canonical content routes in the sitemap. With JavaScript disabled the same content remains available through the timeline links.

## Minimal intro and pixel wheat (November 13, 2026)

The homepage opens with name, role, contact and an accessible caret to the career timeline. Earlier proof/context remains in the timeline: Visible holds the qualified eSIM/Apple account, and Rendered Intent holds the studio description and current tools. Product/case pages retain their existing presentation.

The decorative wheat is dependency-free Canvas 2D, drawn from the shared weather gradient. It uses a gentle persistent breeze, a visible keyboard-operable Pause/Resume control, a 12fps paint cap and at most 2× pixel ratio. It stops when offscreen, hidden or reduced motion is requested; phones <=600px show a small vignette below the text at8fps and capped1× resolution, with a short settling breeze;601–760px omit the artwork. Data saver and reduced motion keep the phone artwork static. No new network or storage use is introduced. Existing automatic Denver/NWS appearance and saved Light/Dark preferences remain unchanged.

Desktop card expansion retains stable text geometry, then fades intro content only after the card fills the viewport. Keyboard focus keeps the text visible; completely faded links become inert. Phones fill at least the dynamic viewport while growing with content, with22px-minimum medium-weight identity text and no caret; reduced motion skips the fade. New browser checks cover the intro, weather recoloring, persistent/pause behavior, responsive canvas growth, reduced motion and offscreen suspension. Intro text and desktop caret use accessible solid hues paired to each weather state; Night values remain unchanged. Literal gradient-filled text remains unadopted.

The intro caret uses a scoped 1.5-second ease-in/out transition; other anchors keep native behavior. Any new wheel, touch, pointer or keyboard input cancels it, and reduced motion skips it. The existing chapter cue waits for caret arrival rather than competing for vertical scroll, and interruption cancels that cue. Breeze control uses inline play/pause icons with accessible action labels, a 44px target and equal 48px bottom/right insets.

## Mobile browser edges and myColorado transition (November 13, 2026)

The homepage root/body/stage use the existing weather ground so Safari can tint
its reserved browser-control strips; this does not draw content behind system UI
or force a theme. Content surfaces retain their own light/Night colors. The
opening card has a 24px optical radius that squares as it expands. Short
landscape viewports from 900–1100px wide and at most 800px high use an 80px
surround; wider desktop and portrait layout remain unchanged.

In-app forward navigation into the myColorado overview and initiative uses the
existing myColorado green as an upward curtain: 600ms close, then an 80ms hold
and 680ms reveal. Direct loads stay immediate, return navigation keeps scroll
and keyboard-focus restoration, and reduced motion skips the curtain.

The myColorado scanner plays once for five seconds while visible, with offscreen/background pausing and a static reduced-motion state. Its decorative QR encodes the portfolio homepage. Mastheads use a solid theme-matched paper background without backdrop blur, and an icon-only44px theme control with keyboard focus retained.
