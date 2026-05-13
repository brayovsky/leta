module.exports = {
  port: process.env.PORT || 3000,
  verifyToken: process.env.VERIFY_TOKEN,
  whatsappToken: process.env.WA_WHATSAPP_TOKEN,
  phoneNumberId: process.env.WA_PHONE_NUMBER_ID,
  baseUrl: process.env.BASE_URL,
  openaiApiKey: process.env.OPENAI_API_KEY,
  usePreferences: process.env.USE_PREFERENCES !== 'false',
  logLlm: process.env.LOG_LLM === 'true',
};
