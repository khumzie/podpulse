import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
const svgPath = path.join(publicDir, 'icon.svg');
let svgContent = fs.readFileSync(svgPath, 'utf8');

// For apple-touch-icon, iOS applies its own squircle mask, so remove rx="115" to ensure seamless full bleed
const fullBleedSvg = svgContent
  .replace('rx="115"', 'rx="0"')
  .replace('rx="111"', 'rx="0"')
  .replace('<rect width="504" height="504" x="4" y="4" rx="111" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="3"/>', '');

async function generate() {
  console.log('Generating PNG icons...');

  // 180x180 for iOS apple-touch-icon
  await sharp(Buffer.from(fullBleedSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png (180x180)');

  // 180x180 precomposed
  await sharp(Buffer.from(fullBleedSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon-180x180.png'));

  // 192x192 for PWA manifest
  await sharp(Buffer.from(fullBleedSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));
  console.log('Generated icon-192.png (192x192)');

  // 512x512 for PWA manifest
  await sharp(Buffer.from(fullBleedSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log('Generated icon-512.png (512x512)');

  // 512x512 maskable (with standard 10% safe zone padding)
  await sharp(Buffer.from(fullBleedSvg))
    .resize(410, 410)
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: '#070913'
    })
    .png()
    .toFile(path.join(publicDir, 'icon-maskable.png'));
  console.log('Generated icon-maskable.png (512x512)');

  console.log('All icons generated successfully!');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
