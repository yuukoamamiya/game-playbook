// Shared HTTP helper for the collection scripts.
//
// Every collector used to build its own fetch call, user agent and proxy
// handling. Centralise that here: one user agent, one proxy URL read from the
// environment, timeout + retry on 429/5xx.
//
// The local setup tunnels foreign sites through v2rayN. Proxying needs
// `undici`'s ProxyAgent (declared in devDependencies). If it is missing, fail
// loudly on a proxy request instead of silently falling back to a direct
// connection that would be blocked or throttled.

export const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export const PROXY_URL = process.env.GAME_PLAYBOOK_HTTP_PROXY
  || process.env.HTTP_PROXY
  || 'http://127.0.0.1:10809';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let dispatcherPromise;

/** Lazily create (and cache) the undici ProxyAgent for PROXY_URL. */
export function getProxyDispatcher() {
  if (!dispatcherPromise) {
    dispatcherPromise = (async () => {
      try {
        const {ProxyAgent} = await import('undici');
        return new ProxyAgent(PROXY_URL);
      } catch (error) {
        throw new Error(
          `[fetch] proxy ${PROXY_URL} requested but undici could not be loaded: ${error.message}`,
        );
      }
    })();
  }
  return dispatcherPromise;
}

function isRetryableStatus(status) {
  return status === 429 || status >= 500;
}

function isRetryableError(error) {
  // Network failures and timeouts are worth another attempt; programming errors
  // (bad URL, bad init) are not.
  return ['AbortError', 'TimeoutError'].includes(error?.name) || Boolean(error?.cause);
}

/**
 * fetch() with a per-attempt timeout and bounded retries.
 *
 * `retries` counts additional attempts; a 429/5xx or a network/timeout error is
 * retried with exponential backoff, everything else is returned to the caller
 * so it can check `response.ok` itself.
 */
export async function fetchWithTimeout(url, init = {}, options = {}) {
  const {
    timeoutMs = 30000,
    retries = 2,
    backoffMs = 800,
    proxy = false,
  } = options;

  const dispatcher = proxy ? await getProxyDispatcher() : null;
  const headers = {'User-Agent': userAgent, ...(init.headers ?? {})};
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt > 0) await sleep(backoffMs * 2 ** (attempt - 1));
    try {
      const response = await fetch(url, {
        ...init,
        headers,
        ...(dispatcher ? {dispatcher} : {}),
        signal: init.signal ?? AbortSignal.timeout(timeoutMs),
      });
      if (isRetryableStatus(response.status) && attempt < retries) {
        lastError = new Error(`HTTP ${response.status}`);
        try { await response.body?.cancel(); } catch { /* body may already be consumed */ }
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < retries && isRetryableError(error)) continue;
      throw error;
    }
  }

  throw lastError;
}

/** fetch() and return the body as text, throwing on a non-2xx response. */
export async function fetchText(url, init = {}, options = {}) {
  const response = await fetchWithTimeout(url, init, options);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
}
