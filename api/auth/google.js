const { setCorsHeaders } = require('../../lib/utils');
const { signToken } = require('../../lib/auth');
const db = require('../../lib/turso');

async function exchangeCodeForTokens(code) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error('Token exchange failed: ' + err);
  }

  return res.json();
}

async function getUserInfo(idToken) {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
  if (!res.ok) throw new Error('Invalid ID token');
  return res.json();
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res, req);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metodo nao permitido' });

  const { code, error: googleError } = req.query;

  // Callback: Google returned with code or error
  if (googleError) {
    return res.status(401).redirect('/d9x2k7m4.html?auth_error=access_denied');
  }

  if (code) {
    try {
      const tokens = await exchangeCodeForTokens(code);
      const userInfo = await getUserInfo(tokens.id_token);

      const email = (userInfo.email || '').toLowerCase();

      const adminRow = await db.getPasswordHash();
      const adminEmail = (adminRow.email || '').toLowerCase();
      const allowedEmails = [adminEmail, (process.env.ADMIN_EMAIL || '').toLowerCase()].filter(Boolean);

      if (!allowedEmails.includes(email)) {
        await db.addAuditLog('LOGIN_DENIED', email, 'Tentativa de login com email nao autorizado');
        return res.status(403).redirect('/d9x2k7m4.html?auth_error=unauthorized_email');
      }

      const token = signToken({ user: 'admin', email, iat: Math.floor(Date.now() / 1000) });
      await db.addAuditLog('LOGIN_GOOGLE', 'admin', 'Login via Google: ' + email);

      return res.status(302).redirect(`/d9x2k7m4.html?auth_token=${token}`);
    } catch (err) {
      console.error('[GOOGLE CALLBACK] Error:', err.message);
      return res.status(500).redirect('/d9x2k7m4.html?auth_error=internal_error');
    }
  }

  // Init: redirect to Google consent screen
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({ error: 'Google OAuth nao configurado' });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent'
  });

  res.status(302).redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};
