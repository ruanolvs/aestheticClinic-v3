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

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
}

module.exports = { sanitize, sanitizeObj, setCorsHeaders };
