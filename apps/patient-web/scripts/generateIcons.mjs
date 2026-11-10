// One-off script: rasterizes the app icon (clinic logo) into the PNG
// sizes needed for the PWA manifest and iOS home-screen icon. Not part of
// the app's runtime — run manually if the icon design ever changes.
import sharp from "sharp";
import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public");
mkdirSync(outDir, { recursive: true });

// Icons are built from the clinic logo (public/hecos-logo.svg). The logo carries
// its own white disc, so each icon is the logo centred on a white square.
const logoSvg = readFileSync(join(outDir, "hecos-logo.svg"), "utf8");
const logoInner = logoSvg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

// scale = fraction of the icon the logo fills. Maskable icons keep to the ~80% safe zone.
const iconSvg = (size, scale = 1) => `
<svg width="${size}" height="${size}" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
  <rect width="500" height="500" fill="#FFFFFF"/>
  <g transform="translate(250 250) scale(${scale}) translate(-250 -250)">${logoInner}</g>
</svg>`;
const maskableSvg = (size) => iconSvg(size, 0.78);

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
