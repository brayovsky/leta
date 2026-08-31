const Setting = require('../db/models/Setting');

const CONVERSATION_MODE_KEY = 'conversationMode';
const MODES = ['ai', 'human'];

// Global switch: 'ai' routes incoming WhatsApp messages to the LLM agent,
// 'human' leaves them in the console inbox for a person to answer instead.
async function getConversationMode() {
  const setting = await Setting.findOne({ key: CONVERSATION_MODE_KEY }).lean();
  return MODES.includes(setting?.value) ? setting.value : 'ai';
}

async function setConversationMode(mode) {
  if (!MODES.includes(mode)) throw new Error(`Invalid mode: ${mode}`);
  await Setting.findOneAndUpdate(
    { key: CONVERSATION_MODE_KEY },
    { value: mode },
    { upsert: true }
  );
  return mode;
}

module.exports = { getConversationMode, setConversationMode, MODES };
