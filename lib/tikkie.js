const db = require('../lib/turso');

const TIKKIE_API_URL = 'https://api.tikkie.me/v2';
const TIKKIE_API_KEY = process.env.TIKKIE_API_KEY || '';
const TIKKIE_APP_KEY = process.env.TIKKIE_APP_KEY || '';

function isTikkieConfigured() {
  return !!(TIKKIE_API_KEY && TIKKIE_APP_KEY);
}

async function createTikkiePayment(amount, description, referenceId) {
  if (!isTikkieConfigured()) {
    // Fallback: retorna dados simulados sem API real
    // O admin pode usar o link manual do Tikkie
    return {
      payment_id: 'manual_' + Date.now(),
      payment_url: '',
      mode: 'manual'
    };
  }

  try {
    const response = await fetch(`${TIKKIE_API_URL}/payment-request`, {
      method: 'POST',
      headers: {
        'X-API-KEY': TIKKIE_API_KEY,
        'X-APP-KEY': TIKKIE_APP_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount,
        description: description,
        referenceId: referenceId,
        expiryDate: new Date(Date.now() + db.PAYMENT_EXPIRY_HOURS * 60 * 60 * 1000)
          .toISOString().split('T')[0]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Tikkie API error:', err);
      return null;
    }

    const data = await response.json();
    return {
      payment_id: data.paymentRequestId || data.id,
      payment_url: data.paymentUrl || data.url || '',
      mode: 'api'
    };
  } catch (err) {
    console.error('Tikkie API connection error:', err);
    return null;
  }
}

function verifyTikkieWebhook(payload, signature) {
  // Em producao, verificar a assinatura do webhook do Tikkie
  // Por enquanto retorna true se tem payload
  if (!isTikkieConfigured()) return false;
  // TODO: implementar verificacao de assinatura quando tiver as credenciais
  return !!payload;
}

module.exports = { isTikkieConfigured, createTikkiePayment, verifyTikkieWebhook };
