export const siteUrl = 'https://chrismackintosh.work';
// Only the reviewed Pages production build enables indexing; CI and local previews stay blocked.
export const indexable = import.meta.env.PROD && process.env.SITE_INDEXING === 'enabled'
  && process.env.DEPLOY_TARGET === 'github-pages-production';
export const publicRoutes = [
  '/', '/mycolorado/', '/mycolorado/mobile-drivers-license/',
  '/case-studies/visible-core-experience.html', '/case-studies/visible-esim.html',
];
