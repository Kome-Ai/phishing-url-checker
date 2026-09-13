// 拡張機能アイコン(16/32/48/128px)を生成するスクリプト。
// デザイン: リスク判定で使っている🔴🟡🟢の3色を信号機状に配置した
// シンプルな図形(ダークな角丸背景 + 3つの円)。外部画像素材は使わず、
// pngjsでピクセルを直接描画して生成する。
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'icons');
fs.mkdirSync(outDir, { recursive: true });

const SIZES = [16, 32, 48, 128];

const BG = [17, 24, 39, 255]; // #111827 (スレート系ダーク)
const RED = [220, 38, 38, 255]; // #dc2626 危険
const AMBER = [245, 158, 11, 255]; // #f59e0b 注意
const GREEN = [22, 163, 74, 255]; // #16a34a 安全

function setPixel(png, x, y, [r, g, b, a]) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const idx = (png.width * y + x) << 2;
  png.data[idx] = r;
  png.data[idx + 1] = g;
  png.data[idx + 2] = b;
  png.data[idx + 3] = a;
}

function fillRoundedSquare(png, radius, color) {
  const { width: w, height: h } = png;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cornerX = x < radius ? radius : x >= w - radius ? w - radius - 1 : null;
      const cornerY = y < radius ? radius : y >= h - radius ? h - radius - 1 : null;
      if (cornerX !== null && cornerY !== null) {
        const dx = x - cornerX;
        const dy = y - cornerY;
        if (dx * dx + dy * dy > radius * radius) continue; // 角の外側は塗らない
      }
      setPixel(png, x, y, color);
    }
  }
}

function fillCircle(png, cx, cy, r, color) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) {
        setPixel(png, x, y, color);
      }
    }
  }
}

function generate(size) {
  const png = new PNG({ width: size, height: size });
  // 背景は透過にしておき、角丸ダーク背景を描画する
  png.data.fill(0);

  fillRoundedSquare(png, size * 0.18, BG);

  const cx = size / 2;
  const r = size * 0.13;
  const positions = [size * 0.24, size * 0.5, size * 0.76];
  const colors = [RED, AMBER, GREEN];

  positions.forEach((cy, i) => fillCircle(png, cx, cy, r, colors[i]));

  const outPath = path.join(outDir, `icon${size}.png`);
  png.pack().pipe(fs.createWriteStream(outPath)).on('finish', () => {
    console.log(`✅ ${path.relative(process.cwd(), outPath)} を生成しました`);
  });
}

SIZES.forEach(generate);
