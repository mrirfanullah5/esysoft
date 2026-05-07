import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const inputPath = path.join(root, "public", "logo.png");
const backupPath = path.join(root, "public", "logo.blackbg.bak.png");

const BLACK_CUTOFF = 10; // <= this becomes fully transparent
const FEATHER_END = 45; // >= this becomes fully opaque

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

async function main() {
  // Keep a backup the first time we run.
  try {
    await fs.access(backupPath);
  } catch {
    await fs.copyFile(inputPath, backupPath);
  }

  const img = sharp(inputPath, { failOn: "none" }).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);

  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const a = out[i + 3];

    // Use max channel as a cheap "distance from black" proxy.
    const m = Math.max(r, g, b);
    if (m <= BLACK_CUTOFF) {
      out[i + 3] = 0;
      continue;
    }

    // Feather near-black edges to avoid jaggies.
    const keep = smoothstep(BLACK_CUTOFF, FEATHER_END, m);
    out[i + 3] = Math.round(a * keep);
  }

  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(inputPath);

  console.log(`Transparent logo written: ${path.relative(root, inputPath)}`);
  console.log(`Backup kept at: ${path.relative(root, backupPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
