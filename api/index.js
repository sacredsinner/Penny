import { handler } from '../netlify/functions/api.js';

/**
 * Vercel Serverless Function Handler
 * Adapts Vercel's (req, res) format to our universal serverless API handler.
 */
export default async function vercelHandler(req, res) {
  try {
    let body = '';
    if (req.body) {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    } else {
      // Read stream if body isn't pre-parsed
      body = await new Promise((resolve) => {
        let data = '';
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => resolve(data));
      });
    }

    const host = req.headers.host || 'localhost';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const urlObj = new URL(req.url, `${proto}://${host}`);
    
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
    console.error('Vercel API error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: `Internal Server Error: ${err.message}` }));
  }
}
