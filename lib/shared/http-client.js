/**
 * Shared HTTP client — fetch-based, zero dependencies
 * Features: timeout (AbortController), retry (exponential backoff), base URL binding
 */

const DEFAULT_TIMEOUT = 15000;
const DEFAULT_RETRIES = 3;
const DEFAULT_BASE_DELAY = 1000;

/**
 * Core request function with timeout + retry
 */
async function httpRequest(url, opts = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    baseDelay = DEFAULT_BASE_DELAY,
    label = 'http',
    parseJson = true,
  } = opts;

  let lastError;

  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchOpts = { method, headers, signal: controller.signal };
      if (body) {
        fetchOpts.body = typeof body === 'string' ? body : JSON.stringify(body);
        if (!headers['Content-Type']) {
          fetchOpts.headers = { ...headers, 'Content-Type': 'application/json' };
        }
      }

      const res = await fetch(url, fetchOpts);
      clearTimeout(timer);

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw Object.assign(new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`), { status: res.status });
      }

      return parseJson ? await res.json() : await res.text();
    } catch (err) {
      clearTimeout(timer);
      lastError = err;

      // Don't retry on 4xx client errors (except 429 rate limit)
      if (err.status && err.status >= 400 && err.status < 500 && err.status !== 429) {
        throw err;
      }

      if (attempt < retries - 1) {
        const delay = Math.min(baseDelay * 2 ** attempt, 8000);
        console.warn(`[${label}] Attempt ${attempt + 1}/${retries} failed: ${err.message}. Retry in ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

/**
 * GET shorthand
 */
async function httpGet(url, opts = {}) {
  return httpRequest(url, { ...opts, method: 'GET' });
}

/**
 * POST shorthand
 */
async function httpPost(url, body, opts = {}) {
  return httpRequest(url, { ...opts, method: 'POST', body });
}

/**
 * Create a client bound to a base URL
 *
 * Usage:
 *   const api = createClient('http://localhost:3000', { timeout: 10000 });
 *   const data = await api.get('/api/health');
 *   const result = await api.post('/api/run', { name: 'test' });
 */
function createClient(baseUrl, defaults = {}) {
  const label = defaults.label || baseUrl.replace(/https?:\/\//, '').split('/')[0];

  return {
    get(path, opts = {}) {
      return httpGet(`${baseUrl}${path}`, { label, ...defaults, ...opts });
    },
    post(path, body, opts = {}) {
      return httpPost(`${baseUrl}${path}`, body, { label, ...defaults, ...opts });
    },
    request(path, opts = {}) {
      return httpRequest(`${baseUrl}${path}`, { label, ...defaults, ...opts });
    },
  };
}

module.exports = { httpGet, httpPost, httpRequest, createClient };
