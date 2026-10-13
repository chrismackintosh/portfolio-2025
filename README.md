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

- `src/pages/`: homepage, product overview, initiative detail, retained archive pages, privacy, robots, and sitemap; all are static direct routes.
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

This is a local release candidate. Default builds emit `noindex, nofollow`, disallow-all robots, and an empty sitemap. Only a production build with both `SITE_INDEXING=enabled` and `DEPLOY_TARGET=github-pages-production` emits indexable pages, allow-all robots, and the six public canonical routes in `/sitemap.xml`. Missing or preview target values keep indexing disabled, even if the indexing flag is enabled. Only enable the flag for the approved production cutover; rebuild when changing it. No deployment or domain changes are performed by these commands.

The homepage, product pages, and archives use absolute production canonical URLs and shared Open Graph/Twitter metadata. `build.format: preserve` keeps index-based project paths and emits the legacy `.html` files directly. Do not enable host-level clean-URL rewriting without checking these exact routes:

- `/case-studies/visible-core-experience.html`
- `/case-studies/visible-esim.html`
- `/privacy-policy.html`

Archives contain condensed public narratives, not obsolete embeds or unverified growth/NPS figures. They do not imply that the expanded case studies are finished. Preserve the prior live revision and published artifact before replacing the site; the existing public repository remains the publishing destination.

No analytics or third-party embeds are included. The sky uses the local Denver solar calculation plus direct NWS observations from Denver International Airport (`KDEN`). Browser requests omit credentials and referrers, use the standard browser User-Agent, and need no API key or backend. A successful observation is cached locally for 15 minutes; each visible page attempts refresh at most every 15 minutes. Observations older than two hours, malformed responses, and unavailable service fall back to local daylight. No visitor geolocation is requested. The privacy page describes the NWS request and browser cache. The old Open-Meteo controller is unreferenced and absent from the public bundle. Manual theme switches update text and surface colors together to avoid temporary contrast failure.

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

Before publication, review content and artwork, keyboard and screen-reader behavior, responsive layouts, performance, remote CI results, the exact candidate artifact, and the rollback package. Verify domain behavior, all six routes, assets, privacy, metadata, robots, and sitemap after publication. A passing automated audit does not replace manual review.
