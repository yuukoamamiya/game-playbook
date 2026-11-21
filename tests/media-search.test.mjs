import assert from 'node:assert/strict';
import test from 'node:test';

import {flagList, hasFlag, nonNegativeInt, positionalArgs} from '../scripts/lib/args.mjs';
import {decodeHtml} from '../scripts/lib/csv.mjs';
import {
  cleanHtmlText,
  extractBingTargetUrl,
  normalizedTokens,
  parseBingResults,
} from '../scripts/lib/media-search.mjs';

test('positionalArgs keeps only non-flag arguments and flags stay queryable', () => {
  const argv = ['0', '10', '--dry-run', 'ign,gamespot', '--concurrency=2'];

  assert.deepEqual(positionalArgs(argv), ['0', '10', 'ign,gamespot']);
  assert.equal(hasFlag(argv, 'dry-run'), true);
  assert.equal(hasFlag(argv, 'write'), false);
  assert.deepEqual(flagList(argv, 'concurrency'), ['2']);
});

test('nonNegativeInt falls back for missing or non-numeric values', () => {
  assert.equal(nonNegativeInt('12'), 12);
  assert.equal(nonNegativeInt('-3'), 0);
  assert.equal(nonNegativeInt('--dry-run', 7), 7);
  assert.equal(nonNegativeInt(undefined, 5), 5);
  assert.equal(nonNegativeInt('2.9'), 2);
});

test('extractBingTargetUrl decodes entities and wrapped /ck/a links', () => {
  assert.equal(
    extractBingTargetUrl('https://www.ign.com/articles/foo?a=1&amp;b=2'),
    'https://www.ign.com/articles/foo?a=1&b=2',
  );

  const wrapped = `https://www.bing.com/ck/a?u=a1${Buffer.from('https://www.gamespot.com/reviews/foo/').toString('base64')}`;
  assert.equal(extractBingTargetUrl(wrapped), 'https://www.gamespot.com/reviews/foo/');
  assert.equal(extractBingTargetUrl('not a url'), 'not a url');
});

test('parseBingResults filters by domain and section, de-duplicates and keeps snippets', () => {
  const html = [
    '<li class="b_algo"><h2><a href="https://www.ign.com/articles/foo">Foo Review</a></h2><p>Great game.</p></li>',
    '<li class="b_algo"><h2><a href="https://www.ign.com/articles/foo">Foo Review (duplicate)</a></h2></li>',
    '<li class="b_algo"><h2><a href="https://www.ign.com/news/bar">Bar news</a></h2></li>',
    '<li class="b_algo"><h2><a href="https://example.com/articles/baz">Other site</a></h2></li>',
  ].join('\n');

  const results = parseBingResults(html, {domain: 'ign.com', section: 'articles'});

  assert.equal(results.length, 1);
  assert.equal(results[0].url, 'https://www.ign.com/articles/foo');
  assert.equal(results[0].title, 'Foo Review');
  assert.equal(results[0].snippet, 'Great game.');

  // Omitting section keeps other paths on the same domain.
  assert.equal(parseBingResults(html, {domain: 'ign.com'}).length, 2);
});

test('normalizedTokens folds Roman numerals and drops stop words', () => {
  assert.deepEqual(normalizedTokens('The Legend of Zelda II: Adventure'), ['legend', 'zelda', '2', 'adventure']);
});

test('cleanHtmlText strips tags and decodes entities', () => {
  assert.equal(cleanHtmlText('<b>Tom &amp; Jerry</b>'), 'Tom & Jerry');
});

test('decodeHtml keeps malformed numeric entities instead of throwing', () => {
  assert.equal(decodeHtml('&#99999999;'), '&#99999999;');
  assert.equal(decodeHtml('&#x110000;'), '&#x110000;');
  assert.equal(decodeHtml('&#65;'), 'A');
});
