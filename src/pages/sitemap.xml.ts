import type { APIRoute } from 'astro';
import { indexable, publicRoutes, siteUrl } from '../config/site';
export const GET: APIRoute = () => new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${(indexable ? publicRoutes : []).map(path => `<url><loc>${siteUrl}${path}</loc></url>`).join('')}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
