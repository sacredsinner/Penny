import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { handler } from './netlify/functions/api.js';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'netlify-api-dev-server',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api')) {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost:5173'}`);
                const queryStringParameters = {};
                urlObj.searchParams.forEach((val, key) => {
                  queryStringParameters[key] = val;
                });

                const event = {
                  httpMethod: req.method,
                  path: urlObj.pathname,
                  queryStringParameters,
                  headers: req.headers,
                  body: body || null
                };

                const result = await handler(event, {});
                res.statusCode = result.statusCode || 200;
                if (result.headers) {
                  for (const [k, v] of Object.entries(result.headers)) {
                    res.setHeader(k, v);
                  }
                }
                res.end(result.body || '');
              } catch (err) {
                console.error('Dev API Server Error:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
          } else {
            next();
          }
        });
      }
    }
  ],
  server: {
    port: 5173,
    host: true
  }
});
