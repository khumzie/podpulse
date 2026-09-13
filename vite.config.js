import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    host: true
  },
  plugins: [
    {
      name: 'rss-feed-proxy',
      configureServer(server) {
        server.middlewares.use('/api/feed-proxy', async (req, res) => {
          try {
            const urlParam = new URL(req.url, 'http://localhost:5173').searchParams.get('url');
            if (!urlParam) {
              res.statusCode = 400;
              res.end('Missing url parameter');
              return;
            }

            const response = await fetch(urlParam, {
              headers: {
                'User-Agent': 'PodPulse/1.0 (Podcast PWA; +https://podpulse.app)'
              }
            });

            const contentType = response.headers.get('content-type') || 'application/xml; charset=utf-8';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Access-Control-Allow-Origin', '*');

            const text = await response.text();
            res.statusCode = response.status;
            res.end(text);
          } catch (err) {
            res.statusCode = 500;
            res.end('Proxy error: ' + err.message);
          }
        });
      }
    }
  ]
});
