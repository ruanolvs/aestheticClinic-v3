const bcrypt = require('bcryptjs');
const { sanitizeObj, setCorsHeaders } = require('../../lib/utils');
const { verifyToken } = require('../../lib/auth');
const db = require('../../lib/turso');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res, req);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo nao permitido' });

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Token invalido ou expirado' });

  const { current, newPass, newEmail } = sanitizeObj(req.body, ['current', 'newPass', 'newEmail']);

  // Require current password for any change
  if (!current) return res.status(400).json({ error: 'Senha atual obrigatoria' });

  try {
    const row = await db.getPasswordHash();
    const match = await bcrypt.compare(current, row.hash);
    if (!match) return res.status(401).json({ error: 'Senha atual incorreta' });

    // Change password if provided
    if (newPass) {
      if (newPass.length < 6) return res.status(400).json({ error: 'Nova senha precisa ter no minimo 6 caracteres' });
      const salt = bcrypt.genSaltSync(10);
      const newHash = bcrypt.hashSync(newPass, salt);
      await db.updatePasswordHash(newHash);
      await db.addAuditLog('CHANGE_PASS', 'admin', 'Senha alterada');
    }

    // Change email if provided
    if (newEmail !== undefined) {
      if (!isValidEmail(newEmail)) return res.status(400).json({ error: 'Email invalido' });
      await db.updateAdminEmail(newEmail);
      await db.addAuditLog('CHANGE_EMAIL', 'admin', 'Email alterado para: ' + newEmail);
    }

    if (!newPass && newEmail === undefined) {
      return res.status(400).json({ error: 'Nenhuma alteracao solicitada' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
};
