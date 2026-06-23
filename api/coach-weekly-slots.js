module.exports = async function handler(req, res) {
  const url = new URL('https://api.circlechess.com/subscription/v1/coach-weekly-slots/');
  Object.entries(req.query || {}).forEach(([k, v]) => url.searchParams.set(k, v));

  const upstream = await fetch(url.toString(), {
    headers: {
      'X-NocoBase-Key': req.headers['x-nocobase-key'] || '',
      'ngrok-skip-browser-warning': 'true',
    },
  });

  const text = await upstream.text();
  res.status(upstream.status).setHeader('Content-Type', 'application/json').send(text);
};
