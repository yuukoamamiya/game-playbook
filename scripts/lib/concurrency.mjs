// Small concurrency helpers shared by the collectors.

/** Read `--concurrency=N` (or a supplied fallback), clamped to at least 1. */
export function parseConcurrency(argv, fallback = 4) {
  const value = Number(argv.find((arg) => arg.startsWith('--concurrency='))?.slice('--concurrency='.length) ?? fallback);
  return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : fallback;
}

/** Return a function that hands out the next item, or undefined when done. */
export function createCursor(items) {
  let index = 0;
  return () => (index < items.length ? items[index++] : undefined);
}

/** Run `worker` over `items` with at most `concurrency` tasks in flight. */
export async function pool(items, worker, {concurrency = 4} = {}) {
  if (!items.length) return;
  const size = Math.min(Math.max(1, Math.floor(concurrency) || 1), items.length);
  let index = 0;
  const run = async () => {
    while (index < items.length) {
      const current = index;
      index += 1;
      await worker(items[current], current);
    }
  };
  await Promise.all(Array.from({length: size}, run));
}

/**
 * Build a per-key serializer. Tasks queued under the same key run one after
 * another; different keys still run in parallel.
 *
 * Used for sites that reject (or throttle) concurrent requests.
 */
export function createSerializer() {
  const chains = new Map();
  return (key, task) => {
    const previous = chains.get(key) ?? Promise.resolve();
    const next = previous.then(task, task);
    chains.set(key, next.catch(() => {}));
    return next;
  };
}
