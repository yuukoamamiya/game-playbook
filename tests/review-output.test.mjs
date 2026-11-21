import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';

import {createSerializer} from '../scripts/lib/concurrency.mjs';
import {chooseReviewOutputPath} from '../scripts/lib/review-output.mjs';

test('review outputs allocate distinct files per URL and reruns are idempotent', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'review-output-'));
  const serialize = createSerializer();
  const urls = [
    'https://media.example/reviews/shared-title',
    'https://media.example/reviews/shared-title?edition=second',
    'https://other.example/reviews/shared-title',
  ];
  try {
    const paths = await Promise.all(urls.map((url) => serialize('sample|media', async () => {
      const output = await chooseReviewOutputPath(directory, 'media', url);
      if (!output.skip) {
        await writeFile(output.path, `---\nsource_url: ${JSON.stringify(url)}\n---\nBody for ${url}\n`, 'utf8');
      }
      return output;
    })));

    assert.equal(new Set(paths.map(({path}) => path)).size, urls.length);
    assert.equal(paths[0].path, join(directory, 'media.md'));
    for (const [index, url] of urls.entries()) {
      const output = await chooseReviewOutputPath(directory, 'media', url);
      assert.equal(output.skip, true);
      assert.equal(output.path, paths[index].path);
    }
    assert.match(await readFile(paths[0].path, 'utf8'), /Body for https:\/\/media\.example\/reviews\/shared-title/);
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});

test('existing review without a source URL is preserved', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'review-output-'));
  const legacyPath = join(directory, 'media.md');
  try {
    await writeFile(legacyPath, '# Historical content\n', 'utf8');
    const output = await chooseReviewOutputPath(directory, 'media', 'https://media.example/reviews/new');
    assert.equal(output.skip, false);
    assert.notEqual(output.path, legacyPath);
    assert.equal(await readFile(legacyPath, 'utf8'), '# Historical content\n');
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});
