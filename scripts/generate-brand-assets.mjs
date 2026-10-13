// Derive raster icons from the Figma-exported SVG. Preserve the OG artwork.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
const root = new URL('../public/', import.meta.url);
const source = new URL('favicon.svg', root);
for (const [size, name] of [[32, 'favicon-32.png'], [180, 'apple-touch-icon.png']]) {
  await sharp(fileURLToPath(source), { density: 384 })
    .resize(size, size)
    .png()
    .toFile(fileURLToPath(new URL(name, root)));
}
console.log('Generated 32px and 180px icons from the Figma SVG. OG and 48px exports preserved.');
