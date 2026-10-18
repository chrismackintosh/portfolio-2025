// Exact, full-resolution format conversion of the retained homepage artwork.
// Run with: node scripts/prepare-lossless-images.mjs
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

for (const name of ['phones', 'id']) {
  const source = fileURLToPath(new URL(`../public/assets/mycolorado-grid/${name}.png`, import.meta.url));
  const destination = fileURLToPath(new URL(`../public/assets/mycolorado-grid/${name}.webp`, import.meta.url));
  const original = await readFile(source);
  const metadata = await sharp(original).metadata();
  const converted = await sharp(original).keepIccProfile()
    .webp({ lossless: true, exact: true, effort: 6 }).toBuffer();
  const result = await sharp(converted).metadata();
  assert.equal(result.width, metadata.width);
  assert.equal(result.height, metadata.height);
  assert.deepEqual(result.icc, metadata.icc);
  const rgba = await sharp(original).ensureAlpha().raw().toBuffer();
  assert.ok(rgba.equals(await sharp(converted).ensureAlpha().raw().toBuffer()), `${name}: RGBA differs`);
  assert.ok(converted.length < original.length, `${name}: no size reduction`);
  await writeFile(destination, converted);
  console.log(`${name}: ${original.length} -> ${converted.length} bytes; ${result.width}x${result.height}; exact RGBA and ICC match`);
}
