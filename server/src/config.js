module.exports = {
  port: process.env.PORT || 3000,
  verifyToken: process.env.VERIFY_TOKEN,
  whatsappToken: process.env.WA_WHATSAPP_TOKEN,
  phoneNumberId: process.env.WA_PHONE_NUMBER_ID,
  baseUrl: process.env.BASE_URL,
  checkoutUrl: process.env.CHECKOUT_URL || 'http://localhost:5175',
  openaiApiKey: process.env.OPENAI_API_KEY,
  usePreferences: process.env.USE_PREFERENCES !== 'false',
  logLlm: process.env.LOG_LLM === 'true',
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  allowedEmails: (process.env.ALLOWED_EMAILS || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
  sessionSecret: process.env.SESSION_SECRET,
  sessionTtlSec: 60 * 60 * 24 * 7,
  isProd: process.env.NODE_ENV === 'production',
};
