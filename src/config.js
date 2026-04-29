const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config();

const DEFAULT_SOURCE_CODEX_HOME = path.join(process.env.USERPROFILE || '', '.codex');
const DEFAULT_REFRESH_INTERVAL_MS = 60 * 1000;
const DEFAULT_ACCOUNT_CONCURRENCY = 2;

function normalizeString(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function requireString(env, key) {
  const value = normalizeString(env[key]);
  if (!value) {
    throw new Error(`[Discord_Quota_Bot] Variable requise manquante: ${key}.`);
  }

  return value;
}

function parseInteger(value, key, defaultValue, { min = 1 } = {}) {
  const raw = normalizeString(value) || String(defaultValue);
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw new Error(`[Discord_Quota_Bot] ${key} doit etre un entier >= ${min}.`);
  }

  return parsed;
}

function loadConfig(env = process.env) {
  return {
    token: requireString(env, 'DISCORD_TOKEN'),
    quotaChannelId: requireString(env, 'QUOTA_CHANNEL_ID'),
    sourceCodexHome: normalizeString(env.SOURCE_CODEX_HOME) || DEFAULT_SOURCE_CODEX_HOME,
    refreshIntervalMs: parseInteger(
      env.REFRESH_INTERVAL_MS,
      'REFRESH_INTERVAL_MS',
      DEFAULT_REFRESH_INTERVAL_MS
    ),
    accountConcurrency: parseInteger(
      env.ACCOUNT_CONCURRENCY,
      'ACCOUNT_CONCURRENCY',
      DEFAULT_ACCOUNT_CONCURRENCY
    ),
  };
}

module.exports = {
  DEFAULT_ACCOUNT_CONCURRENCY,
  DEFAULT_REFRESH_INTERVAL_MS,
  DEFAULT_SOURCE_CODEX_HOME,
  loadConfig,
};
