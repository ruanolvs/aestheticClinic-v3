const bcrypt = require('bcryptjs');
const { sanitizeObj, setCorsHeaders } = require('../../lib/utils');
const { verifyToken } = require('../../lib/auth');
const db = require('../../lib/turso');

module.exports = async function handler(req, res) {
  setCorsHeaders(res, req);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo nao permitido' });

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Token invalido ou expirado' });

  const { current, newPass } = sanitizeObj(req.body, ['current', 'newPass']);
  if (!current || !newPass) return res.status(400).json({ error: 'Preencha todos os campos' });
  if (newPass.length < 6) return res.status(400).json({ error: 'Nova senha precisa ter no minimo 6 caracteres' });

  try {
    const row = await db.getPasswordHash();
    const match = await bcrypt.compare(current, row.hash);
    if (!match) return res.status(401).json({ error: 'Senha atual incorreta' });

    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPass, salt);
    await db.updatePasswordHash(newHash);
    await db.addAuditLog('CHANGE_PASS', 'admin', 'Senha alterada');
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
};
