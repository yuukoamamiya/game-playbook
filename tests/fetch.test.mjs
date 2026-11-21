import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {after, before, test} from 'node:test';
import {fetchWithTimeout} from '../scripts/lib/fetch.mjs';

let server;
let baseUrl;
let requestCount = 0;

before(async () => {
  server = createServer((request, response) => {
    requestCount += 1;
    if (request.url === '/slow') {
      // Keep the response open so the client-side timeout must abort it.
      setTimeout(() => response.end('late'), 1200);
      return;
    }
    response.writeHead(503);
    response.end('retry me');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('per-attempt timeout remains active when an external signal is supplied', async () => {
  requestCount = 0;
  const controller = new AbortController();
  const start = Date.now();

  await assert.rejects(
    fetchWithTimeout(`${baseUrl}/slow`, {signal: controller.signal}, {
      timeoutMs: 100,
      retries: 2,
      backoffMs: 10,
    }),
    (error) => error.name === 'TimeoutError',
  );

  assert.equal(requestCount, 3, 'each timed out attempt should retain existing retry behavior');
  assert.ok(Date.now() - start < 2000, 'timeout should settle well before the server response');
});

test('external cancellation while fetch is in flight is not retried', async () => {
  requestCount = 0;
  const controller = new AbortController();
  const request = fetchWithTimeout(`${baseUrl}/slow`, {signal: controller.signal}, {
    timeoutMs: 1000,
    retries: 2,
    backoffMs: 1,
  });
  const abortTimer = setTimeout(() => {
    controller.abort(new DOMException('Cancelled in flight', 'AbortError'));
  }, 50);

  await assert.rejects(request, (error) => error.name === 'AbortError');
  clearTimeout(abortTimer);
  assert.equal(requestCount, 1, 'external cancellation during fetch must not be retried');
});

test('a pre-aborted external signal prevents the real fetch from starting', async () => {
  requestCount = 0;
  const controller = new AbortController();
  controller.abort(new DOMException('Cancelled before request', 'AbortError'));

  await assert.rejects(
    fetchWithTimeout(`${baseUrl}/slow`, {signal: controller.signal}, {
      timeoutMs: 1000,
      retries: 2,
      backoffMs: 1,
    }),
    (error) => error.name === 'AbortError',
  );
  assert.equal(requestCount, 0, 'a pre-cancelled request must not reach the local server');
});

test('external cancellation during retry backoff prevents another attempt promptly', async () => {
  requestCount = 0;
  const controller = new AbortController();
  const started = Date.now();
  const request = fetchWithTimeout(`${baseUrl}/retry`, {signal: controller.signal}, {
    timeoutMs: 1000,
    retries: 2,
    backoffMs: 1000,
  });
  const assertion = assert.rejects(request, (error) => error.name === 'AbortError');
  const abortTimer = setTimeout(() => {
    controller.abort(new DOMException('Cancelled by test', 'AbortError'));
  }, 50);

  await assertion;
  clearTimeout(abortTimer);
  assert.equal(requestCount, 1, 'cancellation during backoff must suppress the next fetch');
  assert.ok(Date.now() - started < 1000, 'cancellation should interrupt the backoff promptly');
});
