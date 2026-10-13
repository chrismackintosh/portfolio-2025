import { defineConfig } from 'astro/config';
export default defineConfig({ site: 'https://chrismackintosh.work', output: 'static', trailingSlash: 'ignore', build: { format: 'preserve' }, compressHTML: false });
