/**
 * Shared .env loader with required key validation
 * Zero dependencies — reads .env manually
 */

const fs = require('fs');
const path = require('path');

/**
 * Load .env file and validate required keys
 *
 * @param {Object} opts
 * @param {string} opts.path - path to .env file (default: cwd/.env)
 * @param {string[]} opts.required - required env var names (throws if missing)
 * @param {Object} opts.defaults - default values for optional vars
 * @param {string} opts.name - service name for error messages
 * @returns {Object} - loaded env vars (also set on process.env)
 *
 * Usage:
 *   const { loadEnv } = require('config-loader');
 *   const env = loadEnv({
 *     required: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
 *     defaults: { PORT: '3000' },
 *     name: 'telegram-bot',
 *   });
 */
function loadEnv(opts = {}) {
  const {
    path: envPath = path.join(process.cwd(), '.env'),
    required = [],
    defaults = {},
    name = 'service',
  } = opts;

  // Apply defaults first
  for (const [key, val] of Object.entries(defaults)) {
    if (!process.env[key]) process.env[key] = String(val);
  }

  // Load .env file
  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key && !process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`[${name}] Warning: could not read ${envPath}: ${err.message}`);
    }
  }

  // Validate required keys
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    const msg = `[${name}] Missing required env vars: ${missing.join(', ')}`;
    console.error(msg);
    throw new Error(msg);
  }

  // Return object of loaded vars
  const result = {};
  for (const key of [...required, ...Object.keys(defaults)]) {
    result[key] = process.env[key];
  }
  return result;
}

module.exports = { loadEnv };
