// Small local proxy to bypass CORS when developing locally
// Run: node proxy-server.js

const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3001;

// Allow requests from localhost dev server
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  // Allow whatever headers the browser requests in preflight
  const reqHeaders = req.get('Access-Control-Request-Headers');
  res.setHeader('Access-Control-Allow-Headers', reqHeaders || 'X-Requested-With,Content-Type,ngrok-skip-browser-warning,X-NocoBase-Key');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Explicitly handle OPTIONS for any path (some clients send preflight to the exact path)
// Explicit OPTIONS handlers for the proxied endpoints
app.options('/subscription/v1/coach-search/', (req, res) => {
  const reqHeaders = req.get('Access-Control-Request-Headers');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', reqHeaders || 'X-Requested-With,Content-Type,ngrok-skip-browser-warning,X-NocoBase-Key');
  return res.sendStatus(204);
});

app.options('/subscription/v1/coach-weekly-slots/', (req, res) => {
  const reqHeaders = req.get('Access-Control-Request-Headers');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', reqHeaders || 'X-Requested-With,Content-Type,ngrok-skip-browser-warning,X-NocoBase-Key');
  return res.sendStatus(204);
});

app.get('/subscription/v1/coach-search/', async (req, res) => {
  try {
    const url = new URL('https://api.circlechess.com/subscription/v1/coach-search/');
    Object.entries(req.query || {}).forEach(([k, v]) => url.searchParams.set(k, v));
    const headers = {};
    if (req.get('X-NocoBase-Key')) headers['X-NocoBase-Key'] = req.get('X-NocoBase-Key');
    headers['ngrok-skip-browser-warning'] = 'true';

    const r = await fetch(url.toString(), { headers });
    const text = await r.text();
    res.status(r.status).send(text);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/subscription/v1/coach-weekly-slots/', async (req, res) => {
  try {
    const url = new URL('https://api.circlechess.com/subscription/v1/coach-weekly-slots/');
    Object.entries(req.query || {}).forEach(([k, v]) => url.searchParams.set(k, v));
    const headers = {};
    if (req.get('X-NocoBase-Key')) headers['X-NocoBase-Key'] = req.get('X-NocoBase-Key');
    headers['ngrok-skip-browser-warning'] = 'true';

    const r = await fetch(url.toString(), { headers });
    const text = await r.text();
    res.status(r.status).send(text);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.listen(PORT, () => console.log(`Proxy server listening on http://127.0.0.1:${PORT}`));
