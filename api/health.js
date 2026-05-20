const { setCorsHeaders } = require('../lib/utils');

module.exports = async function handler(req, res) {
  setCorsHeaders(res, req);
  if (req.method === 'OPTIONS') return res.status(204).end();
  res.status(200).json({ ok: true, time: new Date().toISOString() });
};
