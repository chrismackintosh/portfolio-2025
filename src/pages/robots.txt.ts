import type { APIRoute } from 'astro';
import { indexable, siteUrl } from '../config/site';
export const GET: APIRoute = () => new Response(indexable
  ? `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`
  : 'User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
