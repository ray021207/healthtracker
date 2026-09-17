// One-off script: rasterizes the app icon (brand leaf mark) into the PNG
// sizes needed for the PWA manifest and iOS home-screen icon. Not part of
// the app's runtime — run manually if the icon design ever changes.
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public");
mkdirSync(outDir, { recursive: true });

const PRIMARY = "#4F4A85";

// The real lucide-react "Leaf" icon is two paths — the leaf outline plus its
// stem/vein line. The earlier version of this script only drew the outline
// (and got the curve wrong too), which is why it read as a crescent moon
// instead of a leaf.
const LEAF_PATHS = `
  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
`;

// Full-bleed square icon (used for the standard "any" purpose entries).
const iconSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="${PRIMARY}"/>
  <g transform="translate(256 256) scale(15.5) translate(-12 -12)" fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    ${LEAF_PATHS}
  </g>
</svg>`;

// Maskable icon: same mark shrunk into the ~80% "safe zone" Android crops to.
const maskableSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="${PRIMARY}"/>
  <g transform="translate(256 256) scale(11.5) translate(-12 -12)" fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    ${LEAF_PATHS}
  </g>
</svg>`;

const targets = [
  { name: "icon-192.png", svg: iconSvg(192), size: 192 },
  { name: "icon-512.png", svg: iconSvg(512), size: 512 },
  { name: "maskable-icon-512.png", svg: maskableSvg(512), size: 512 },
  { name: "apple-touch-icon.png", svg: iconSvg(180), size: 180 },
];

for (const t of targets) {
  await sharp(Buffer.from(t.svg)).resize(t.size, t.size).png().toFile(join(outDir, t.name));
  console.log(`wrote ${t.name}`);
}

// Favicon: reuse the 192px PNG bytes at a smaller raster size.
await sharp(Buffer.from(iconSvg(64))).resize(64, 64).png().toFile(join(outDir, "favicon.png"));
console.log("wrote favicon.png");
