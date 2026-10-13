import {readFileSync, existsSync} from 'node:fs';
import assert from 'node:assert/strict';
const root = process.argv[2] || 'dist';
const routes = ['/', '/mycolorado/', '/mycolorado/mobile-drivers-license/', '/case-studies/visible-core-experience.html', '/case-studies/visible-esim.html', '/privacy-policy.html'];
assert.equal(readFileSync(`${root}/CNAME`, 'utf8').trim(), 'chrismackintosh.work');
assert(existsSync(`${root}/.nojekyll`));
for (const route of routes) {
  const file = root + route + (route.endsWith('/') ? 'index.html' : '');
  const html = readFileSync(file, 'utf8');
  assert(html.includes('content="index, follow"'), `Production indexing missing: ${route}`);
  assert(html.includes(`href="https://chrismackintosh.work${route}"`), `Canonical missing: ${route}`);
}
const sitemap = readFileSync(`${root}/sitemap.xml`, 'utf8');
assert.equal((sitemap.match(/<loc>/g) || []).length, routes.length);
for (const route of routes) assert(sitemap.includes(`<loc>https://chrismackintosh.work${route}</loc>`));
assert.equal(readFileSync(`${root}/robots.txt`, 'utf8'), 'User-agent: *\nAllow: /\nSitemap: https://chrismackintosh.work/sitemap.xml\n');
assert(!existsSync(`${root}/style-guide.html`));
assert(!existsSync(`${root}/style-guide/index.html`));
console.log('Pages release artifact: domain, six routes, canonical URLs, indexing, and sitemap passed.');
