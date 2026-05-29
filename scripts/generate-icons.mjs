/**
 * generate-icons.mjs
 * Genera los PNGs de íconos PWA de Nutri Smart CR a partir del SVG fuente.
 * Uso: node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const SVG_SRC   = join(ROOT, 'public', 'icons', 'icon.svg');
const ICONS_DIR = join(ROOT, 'public', 'icons');

if (!existsSync(SVG_SRC)) {
  console.error('❌  No se encontró public/icons/icon.svg');
  process.exit(1);
}

if (!existsSync(ICONS_DIR)) mkdirSync(ICONS_DIR, { recursive: true });

const svgBuffer = readFileSync(SVG_SRC);

const sizes = [72, 96, 128, 192, 384, 512];

console.log('🎨  Generando íconos PWA para Nutri Smart CR…\n');

for (const size of sizes) {
  const dest = join(ICONS_DIR, `icon-${size}x${size}.png`);
  await sharp(svgBuffer)
    .resize(size, size)
    .png({ compressionLevel: 9, palette: false })
    .toFile(dest);

  const stat = (await import('fs')).statSync(dest);
  console.log(`  ✅  icon-${size}x${size}.png  (${(stat.size / 1024).toFixed(1)} KB)`);
}

// apple-touch-icon  180×180
const appleDest = join(ICONS_DIR, 'apple-touch-icon.png');
await sharp(svgBuffer)
  .resize(180, 180)
  .png({ compressionLevel: 9 })
  .toFile(appleDest);
const appleStat = (await import('fs')).statSync(appleDest);
console.log(`  ✅  apple-touch-icon.png  (${(appleStat.size / 1024).toFixed(1)} KB)`);

console.log('\n✨  Todos los íconos generados en public/icons/');
