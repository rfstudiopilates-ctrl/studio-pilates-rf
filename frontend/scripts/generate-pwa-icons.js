import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');
const iconsDir = path.join(publicDir, 'icons');
const sourceIcon = path.join(publicDir, 'pwa-icon.svg');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

if (!fs.existsSync(sourceIcon)) {
  console.error('No se encontró public/pwa-icon.svg');
  process.exit(1);
}

fs.mkdirSync(iconsDir, { recursive: true });

for (const size of sizes) {
  const outputPath = path.join(iconsDir, `icon-${size}.png`);
  await sharp(sourceIcon)
    .resize(size, size, { fit: 'contain', background: '#f4c2c2' })
    .png()
    .toFile(outputPath);
  console.log(`Generado ${outputPath}`);
}

const maskablePath = path.join(iconsDir, 'icon-maskable-512.png');
await sharp(sourceIcon)
  .resize(410, 410, { fit: 'contain', background: '#f4c2c2' })
  .extend({
    top: 51,
    bottom: 51,
    left: 51,
    right: 51,
    background: '#f4c2c2',
  })
  .png()
  .toFile(maskablePath);

console.log(`Generado ${maskablePath}`);
console.log('Iconos PWA generados correctamente.');
