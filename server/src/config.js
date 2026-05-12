module.exports = {
  port: process.env.PORT || 3000,
  verifyToken: process.env.VERIFY_TOKEN,
  whatsappToken: process.env.WA_WHATSAPP_TOKEN,
  phoneNumberId: process.env.WA_PHONE_NUMBER_ID,
  baseUrl: process.env.BASE_URL,
  groqApiKey: process.env.GROQ_API_KEY,
};
