function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>"'&]/g, c => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' }[c])).trim();
}

function sanitizeObj(obj, fields) {
  const out = {};
  for (const f of fields) {
    if (obj[f] !== undefined && obj[f] !== null) {
      out[f] = typeof obj[f] === 'string' ? sanitize(obj[f]) : obj[f];
    }
  }
  return out;
}

const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'https://jvbeauty.nl,https://aesthetic-clinic-v3.vercel.app').split(',').map(o => o.trim().toLowerCase());

function setCorsHeaders(res, req) {
  const requestOrigin = (req && req.headers.origin || '').toLowerCase();
  const origin = ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
}

module.exports = { sanitize, sanitizeObj, setCorsHeaders };
