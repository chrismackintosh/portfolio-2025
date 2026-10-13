// Derive responsive variants from the approved local artwork; no remote input.
import sharp from 'sharp';
const source = new URL('../public/assets/mycolorado-grid/phones.png', import.meta.url);
for (const width of [640,1200,2000]) {
 const destination = new URL(`../public/assets/mycolorado-grid/phones-${width}.webp`, import.meta.url);
 const {fileURLToPath} = await import('node:url');
 await sharp(fileURLToPath(source)).resize({width,withoutEnlargement:true}).webp({quality:90,effort:6}).toFile(fileURLToPath(destination));
}
console.log('Generated three responsive phone artwork variants.');
