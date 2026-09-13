// extension/src/content.ts (と、そこからimportしている ../src/riskChecker.ts 一式)を
// ブラウザ向けにバンドルし、extension/content.js として出力するビルドスクリプト。
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const watch = process.argv.includes('--watch');

async function run() {
  const options = {
    entryPoints: [path.join(__dirname, 'src/content.ts')],
    outfile: path.join(__dirname, 'content.js'),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['chrome100'],
    sourcemap: false,
    logLevel: 'info',
  };

  if (watch) {
    const ctx = await (await import('esbuild')).context(options);
    await ctx.watch();
    console.log('👀 変更を監視中... (extension/src/content.ts, ../src/*.ts)');
  } else {
    await build(options);
    console.log('✅ extension/content.js を生成しました');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
