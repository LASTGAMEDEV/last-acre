import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const port = Number(process.argv[2] ?? 5177);
const dir = dirname(fileURLToPath(import.meta.url));
const page = join(dir, 'world-map-visual-companion.html');

http.createServer(async (_req, res) => {
  try {
    const html = await readFile(page, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Could not load world map visual companion.');
  }
}).listen(port, '127.0.0.1');
