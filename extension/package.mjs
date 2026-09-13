// Edge Add-ons / Chrome Web Store 提出用に、実行時に必要なファイルだけを
// 含んだzipを生成するスクリプト。開発用ファイル(src/, tsconfig.json,
// build.mjs, serve.mjs, test-page.html, README.md等)は含めない。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 配布に含めるファイル/フォルダ(すべて extension/ からの相対パス)
const INCLUDE = ['manifest.json', 'content.js', 'content.css', 'icons'];

function assertBuilt() {
  const contentJs = path.join(__dirname, 'content.js');
  if (!fs.existsSync(contentJs)) {
    throw new Error('content.js が見つかりません。先に `npm run build:extension` を実行してください。');
  }
}

function readManifestVersion() {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
  return manifest.version;
}

async function run() {
  assertBuilt();
  const version = readManifestVersion();

  const outDir = path.join(__dirname, 'releases');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `phishing-url-checker-extension-v${version}.zip`);

  const output = fs.createWriteStream(outPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  const done = new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
  });

  archive.pipe(output);
  for (const entry of INCLUDE) {
    const fullPath = path.join(__dirname, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      archive.directory(fullPath, entry);
    } else {
      archive.file(fullPath, { name: entry });
    }
  }
  await archive.finalize();
  await done;

  console.log(`✅ ${path.relative(process.cwd(), outPath)} (${(archive.pointer() / 1024).toFixed(1)} KB) を生成しました`);
  console.log(`   含まれるファイル: ${INCLUDE.join(', ')}`);
}

run().catch((err) => {
  console.error('❌ パッケージングに失敗しました:', err.message);
  process.exit(1);
});
