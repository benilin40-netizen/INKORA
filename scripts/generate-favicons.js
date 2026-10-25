import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// Master SVG: A minimal, recognizable gold fountain pen nib combined with an open book and subtle "I" silhouette
// Colors: Deep black / obsidian (#0c0a09), warm ivory (#fdf6e2), rich lustrous gold (#d97706, #f59e0b, #fbbf24, #fef3c7)
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Rich Gold Gradients -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A" />
      <stop offset="35%" stop-color="#F59E0B" />
      <stop offset="70%" stop-color="#D97706" />
      <stop offset="100%" stop-color="#B45309" />
    </linearGradient>
    <linearGradient id="goldLightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFBEB" />
      <stop offset="40%" stop-color="#FBBF24" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
    <linearGradient id="darkBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1c1917" />
      <stop offset="100%" stop-color="#09090b" />
    </linearGradient>
    <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#D97706" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Deep Obsidian Shield Background with Rounded Corners -->
  <rect x="24" y="24" width="464" height="464" rx="104" fill="url(#darkBgGrad)" stroke="url(#goldGrad)" stroke-width="12" />

  <!-- Open Book Base (Warm Ivory & Gold Accents) -->
  <!-- Left Page -->
  <path d="M 88 340 C 140 315 200 320 256 348 C 256 260 256 180 256 160 C 190 135 130 145 88 175 Z" 
        fill="#FDF6E2" fill-opacity="0.12" stroke="#FDF6E2" stroke-opacity="0.4" stroke-width="6" stroke-linejoin="round" />
  <path d="M 100 324 C 146 304 200 308 246 330" 
        fill="none" stroke="#FDF6E2" stroke-opacity="0.35" stroke-width="5" stroke-linecap="round" />

  <!-- Right Page -->
  <path d="M 424 340 C 372 315 312 320 256 348 C 256 260 256 180 256 160 C 322 135 382 145 424 175 Z" 
        fill="#FDF6E2" fill-opacity="0.12" stroke="#FDF6E2" stroke-opacity="0.4" stroke-width="6" stroke-linejoin="round" />
  <path d="M 412 324 C 366 304 312 308 266 330" 
        fill="none" stroke="#FDF6E2" stroke-opacity="0.35" stroke-width="5" stroke-linecap="round" />

  <!-- Central Fountain Pen Nib (Harmonized with Distinctive "I" Silhouette) -->
  <g filter="url(#goldGlow)">
    <!-- Main Nib Body -->
    <path d="M 256 80 
             C 272 130 326 215 330 290 
             C 330 330 310 355 256 355 
             C 202 355 182 330 182 290 
             C 186 215 240 130 256 80 Z" 
          fill="url(#goldGrad)" />

    <!-- Nib Left Wing Shading -->
    <path d="M 256 80 
             C 240 130 186 215 182 290 
             C 182 330 202 355 256 355 Z" 
          fill="url(#goldLightGrad)" fill-opacity="0.35" />

    <!-- Nib Central Slit / Spine Line (forms the letter 'I' stem) -->
    <line x1="256" y1="120" x2="256" y2="245" stroke="#09090b" stroke-width="7" stroke-linecap="round" />

    <!-- Nib Breather Hole (Distinctive Heart/Circle Ink Droplet) -->
    <circle cx="256" cy="254" r="14" fill="#09090b" />

    <!-- Golden Nib Collar Band -->
    <rect x="216" y="360" width="80" height="18" rx="6" fill="url(#goldLightGrad)" />
    <rect x="228" y="386" width="56" height="10" rx="4" fill="url(#goldGrad)" />
  </g>

  <!-- Open Book Spine Flare -->
  <path d="M 256 348 L 256 415" stroke="url(#goldGrad)" stroke-width="8" stroke-linecap="round" />
</svg>
`;

// Also a transparent version specifically optimized for small favicons (16x16, 32x32, 48x48)
const svgTransparent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="goldGradT" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A" />
      <stop offset="35%" stop-color="#F59E0B" />
      <stop offset="70%" stop-color="#D97706" />
      <stop offset="100%" stop-color="#B45309" />
    </linearGradient>
    <linearGradient id="goldLightGradT" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFBEB" />
      <stop offset="40%" stop-color="#FBBF24" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
  </defs>

  <!-- Open Book Page Wings -->
  <path d="M 80 345 C 135 315 195 322 256 350 C 256 260 256 180 256 160 C 185 130 125 142 80 175 Z" 
        fill="#FDF6E2" stroke="#D97706" stroke-width="12" stroke-linejoin="round" />
  <path d="M 432 345 C 377 315 317 322 256 350 C 256 260 256 180 256 160 C 327 130 387 142 432 175 Z" 
        fill="#FDF6E2" stroke="#D97706" stroke-width="12" stroke-linejoin="round" />

  <!-- Pen Nib Silhouette -->
  <path d="M 256 60 
           C 275 115 340 215 345 295 
           C 345 340 320 370 256 370 
           C 192 370 167 340 167 295 
           C 172 215 237 115 256 60 Z" 
        fill="url(#goldGradT)" stroke="#78350F" stroke-width="8" stroke-linejoin="round" />

  <path d="M 256 60 
           C 237 115 172 215 167 295 
           C 167 340 192 370 256 370 Z" 
        fill="url(#goldLightGradT)" fill-opacity="0.35" />

  <!-- Center Slit & Ink Breather Hole -->
  <line x1="256" y1="110" x2="256" y2="245" stroke="#1c1917" stroke-width="12" stroke-linecap="round" />
  <circle cx="256" cy="255" r="18" fill="#1c1917" />
  <rect x="210" y="375" width="92" height="24" rx="8" fill="url(#goldGradT)" stroke="#78350F" stroke-width="4" />
</svg>
`;

async function generate() {
  const svgBuf = Buffer.from(svgIcon);
  const svgTransBuf = Buffer.from(svgTransparent);

  // 1. Save standard SVG favicon
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), svgIcon);

  // 2. Generate PNGs
  const p16 = await sharp(svgTransBuf).resize(16, 16).png().toBuffer();
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon-16x16.png'), p16);

  const p32 = await sharp(svgTransBuf).resize(32, 32).png().toBuffer();
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon-32x32.png'), p32);

  const p48 = await sharp(svgTransBuf).resize(48, 48).png().toBuffer();

  const p180 = await sharp(svgBuf).resize(180, 180).png().toBuffer();
  fs.writeFileSync(path.join(PUBLIC_DIR, 'apple-touch-icon.png'), p180);

  const p192 = await sharp(svgBuf).resize(192, 192).png().toBuffer();
  fs.writeFileSync(path.join(PUBLIC_DIR, 'icon-192.png'), p192);

  const p512 = await sharp(svgBuf).resize(512, 512).png().toBuffer();
  fs.writeFileSync(path.join(PUBLIC_DIR, 'icon-512.png'), p512);

  // 3. Assemble standard multi-size favicon.ico containing 16x16, 32x32, 48x48 PNGs
  const images = [
    { width: 16, height: 16, buffer: p16 },
    { width: 32, height: 32, buffer: p32 },
    { width: 48, height: 48, buffer: p48 },
  ];

  const headerSize = 6;
  const dirEntrySize = 16;
  const numImages = images.length;
  let offset = headerSize + (dirEntrySize * numImages);

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(numImages, 4);

  const dirEntries = [];
  for (const img of images) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // Image size in bytes
    entry.writeUInt32LE(offset, 12); // Offset of image data
    dirEntries.push(entry);
    offset += img.buffer.length;
  }

  const icoBuffer = Buffer.concat([
    header,
    ...dirEntries,
    ...images.map(img => img.buffer)
  ]);

  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuffer);

  // 4. Create site.webmanifest
  const manifest = {
    name: "INKORA — Your Imagination in Print",
    short_name: "INKORA",
    description: "Sanctuary for novelists, poets, and avid readers.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
  fs.writeFileSync(path.join(PUBLIC_DIR, 'site.webmanifest'), JSON.stringify(manifest, null, 2));

  console.log('Favicons and icons successfully generated in /public:');
  console.log('- favicon.ico (16x16, 32x32, 48x48)');
  console.log('- favicon-16x16.png');
  console.log('- favicon-32x32.png');
  console.log('- favicon.svg');
  console.log('- apple-touch-icon.png (180x180)');
  console.log('- icon-192.png (192x192)');
  console.log('- icon-512.png (512x512)');
  console.log('- site.webmanifest');
}

generate().catch(err => {
  console.error('Failed to generate favicons:', err);
  process.exit(1);
});
