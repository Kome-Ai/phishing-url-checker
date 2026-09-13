// test-page.html を http://localhost で配信するだけの、依存ゼロの簡易静的サーバー。
// file:// でテストページを開くと、manifest.json の content_scripts.matches が
// http(s)://* のみのため content.js が注入されず動作確認できない。
// (file://を許可するにはブラウザ側の「ファイルのURLへのアクセスを許可する」設定も
//  別途必要になり見落としやすいため、http://での配信を推奨する)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ? Number(process.env.PORT) : 5500;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const requestedPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const relativePath = requestedPath === '/' ? '/test-page.html' : requestedPath;
  const filePath = path.normalize(path.join(__dirname, relativePath));

  // ディレクトリトラバーサル対策(extension/配下のみ配信を許可)
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found: ' + relativePath);
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`✅ テストページを起動しました: http://localhost:${PORT}/test-page.html`);
  console.log('   停止する場合は Ctrl+C を押してください');
});
