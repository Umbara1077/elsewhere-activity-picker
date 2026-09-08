import http from 'node:http';
import { URL } from 'node:url';
import { discoverHandler } from './index.mjs';
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:8787');
  if (url.pathname !== '/api/discover') { res.writeHead(404); res.end('Not found'); return; }
  const request = { method:req.method,query: Object.fromEntries(url.searchParams.entries()) };
  const response = { status(code) { res.statusCode = code; return response; }, json(body) { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(body)); } };
  try { await discoverHandler(request, response); } catch (error) { res.statusCode = 500; res.end(JSON.stringify({ error: error.message })); }
});
server.listen(8787, '127.0.0.1', () => console.log('Elsewhere local discovery listening on http://127.0.0.1:8787'));
