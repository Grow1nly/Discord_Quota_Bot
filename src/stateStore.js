const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'monitor_state.json');

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadState() {
  ensureDataDir();
  if (!fs.existsSync(STATE_FILE)) {
    return {
      messageId: null,
      channelId: null,
    };
  }

  const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  return {
    messageId: typeof parsed?.messageId === 'string' ? parsed.messageId : null,
    channelId: typeof parsed?.channelId === 'string' ? parsed.channelId : null,
  };
}

function saveState(state) {
  ensureDataDir();
  const payload = {
    messageId: typeof state?.messageId === 'string' ? state.messageId : null,
    channelId: typeof state?.channelId === 'string' ? state.channelId : null,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(payload, null, 2));
  return payload;
}

module.exports = {
  loadState,
  saveState,
  STATE_FILE,
};
