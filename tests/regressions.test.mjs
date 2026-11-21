import assert from 'node:assert/strict';
import test from 'node:test';

import {parseDocument, hasTranslationContent, translatedTabs} from '../scripts/content-manifest.mjs';
import {numberValue} from '../scripts/data-store.mjs';
import {getSources, normalizeSource} from '../scripts/media-sources.mjs';
import {getIgnTargets} from '../scripts/lib/ign-review-targets.mjs';
import {fetchAndRenderIgnTarget} from '../scripts/lib/ign-review-render.mjs';
// The catalog merge lives in the front-end TypeScript module; Node's built-in
// type stripping lets the regression tests exercise that exact implementation
// instead of keeping a duplicate `.mjs` copy in sync by hand.
import {mergeGames} from '../src/lib/mergeGames.ts';

function record(overrides) {
  return {
    slug: 'sample',
    title: 'Sample',
    platform: 'PC',
    score: null,
    releaseYear: null,
    metacriticUrl: '',
    hasTranslation: false,
    sources: [],
    ...overrides,
  };
}

test('mergeGames does not modify input records or their source arrays', () => {
  const original = [
    record({
      platform: 'PC',
      score: 80,
      releaseYear: 2020,
      sources: [{site: 'rpgamer', url: '/pc', kind: 'review', language: 'en', score: null}],
    }),
    record({
      platform: 'Switch',
      score: 82,
      releaseYear: 2021,
      hasTranslation: true,
      sources: [{site: 'eurogamer', url: '/switch', kind: 'review', language: 'en', score: null}],
    }),
  ];
  const before = structuredClone(original);

  const [merged] = mergeGames(original);

  assert.deepEqual(original, before);
  assert.deepEqual(merged.sources.map(({url}) => url), ['/pc', '/switch']);
  assert.notStrictEqual(merged.sources, original[0].sources);
  const pcOnly = mergeGames(original.filter(({platform}) => platform === 'PC'));
  assert.deepEqual(pcOnly[0].sources.map(({site}) => site), ['rpgamer']);
});

test('mergeGames keeps the earliest release year and the highest-score URL', () => {
  const records = [
    record({platform: 'PC', score: 82, releaseYear: 2021, metacriticUrl: 'https://mc.example/pc'}),
    record({platform: 'Switch', score: 91, releaseYear: 2019, metacriticUrl: 'https://mc.example/switch'}),
    record({platform: 'PS5', score: 88, releaseYear: 2023, metacriticUrl: 'https://mc.example/ps5'}),
  ];

  const [merged] = mergeGames(records);

  assert.equal(merged.score, 91);
  assert.equal(merged.releaseYear, 2019);
  assert.equal(merged.metacriticUrl, 'https://mc.example/switch');
});

test('mergeGames keeps the first URL when the top score is tied', () => {
  const records = [
    record({platform: 'PC', score: 91, metacriticUrl: 'https://mc.example/first'}),
    record({platform: 'Switch', score: 91, metacriticUrl: 'https://mc.example/second'}),
  ];

  const [merged] = mergeGames(records);
  assert.equal(merged.metacriticUrl, 'https://mc.example/first');
});

test('mergeGames de-duplicates platforms, platformScores and sources', () => {
  const duplicateSource = {site: 'ign', url: 'https://example.com/review', kind: 'review', language: 'en', score: null};
  const records = [
    record({
      platform: 'PC',
      score: 80,
      sources: [duplicateSource, {...duplicateSource}],
    }),
    record({platform: 'PC', score: 85, sources: [{...duplicateSource, kind: 'feature'}]}),
    record({platform: 'Switch', score: 85, sources: [duplicateSource]}),
  ];

  const [merged] = mergeGames(records);

  assert.deepEqual(merged.platforms, ['PC', 'Switch']);
  assert.deepEqual(merged.platformScores, [
    {platform: 'PC', score: 85},
    {platform: 'Switch', score: 85},
  ]);
  assert.equal(merged.sources.length, 1);
  assert.equal(merged.sources[0].kind, 'review');
});

test('numberValue keeps zero but rejects missing, empty and negative values', () => {
  assert.equal(numberValue(0), 0);
  assert.equal(numberValue(7.5), 7.5);
  assert.equal(numberValue('80'), 80);
  assert.equal(numberValue(null), null);
  assert.equal(numberValue(undefined), null);
  assert.equal(numberValue(''), null);
  assert.equal(numberValue(-1), null);
  assert.equal(numberValue('not-a-number'), null);
});

test('normalizeSource trims/lowercases and getSources de-duplicates by site+url', () => {
  const normalized = normalizeSource({site: ' IGN ', url: ' https://example.com/review '});
  assert.deepEqual(normalized, {
    site: 'ign',
    kind: 'review',
    language: 'en',
    score: null,
    url: 'https://example.com/review',
  });
  assert.equal(normalizeSource({site: 'ign', url: '/relative'}), null);
  assert.equal(normalizeSource(null), null);

  const sources = getSources({
    sources: [
      {site: 'ign', url: 'https://example.com/review', kind: 'review'},
      {site: 'IGN', url: ' https://example.com/review ', kind: 'essay'},
      {site: 'ign', url: 'https://example.com/other'},
    ],
  });

  assert.equal(sources.length, 2);
  assert.equal(sources[0].kind, 'review');
  assert.deepEqual(sources.map(({url}) => url), [
    'https://example.com/review',
    'https://example.com/other',
  ]);
});

test('getIgnTargets carries each IGN URL into the fetch target and de-duplicates slugs', () => {
  const rows = [
    {slug: 'first', sources: [{site: 'ign', url: 'https://www.ign.com/articles/first'}]},
    {slug: 'first', sources: [{site: 'ign', url: 'https://www.ign.com/articles/duplicate'}]},
    {slug: 'second', sources: [{site: 'ign', url: 'https://www.ign.com/articles/second'}]},
    {slug: 'other', sources: [{site: 'gamespot', url: 'https://www.gamespot.com/review'}]},
  ];

  assert.deepEqual(getIgnTargets(rows), [
    {row: rows[0], sourceUrl: 'https://www.ign.com/articles/first'},
    {row: rows[2], sourceUrl: 'https://www.ign.com/articles/second'},
  ]);
});

test('IGN target fetch and render uses the selected source URL without network access', async () => {
  const target = {
    row: {
      slug: 'first',
      title: 'First Game',
      sources: [{site: 'ign', url: 'https://www.ign.com/articles/first'}],
    },
    sourceUrl: 'https://www.ign.com/articles/first',
  };
  const requestedUrls = [];
  const result = await fetchAndRenderIgnTarget(target, async (url) => {
    requestedUrls.push(url);
    return {
      status: 200,
      page: {
        processedHtml: '<p>Review body &amp; details.</p>',
        review: {score: 8, scoreText: 'Great'},
      },
    };
  });

  assert.deepEqual(requestedUrls, [target.sourceUrl]);
  assert.equal(result.status, 200);
  assert.match(result.markdown, /source_url: "https:\/\/www\.ign\.com\/articles\/first"/);
  assert.match(result.markdown, /\[IGN\]\(https:\/\/www\.ign\.com\/articles\/first\)/);
  assert.match(result.markdown, /Review body & details\./);
});

test('parseDocument accepts single-quoted ReviewTab attributes', () => {
  const content = '中'.repeat(40);
  const source = [
    '---',
    'title: "Sample"',
    'slug: sample',
    'translation_status: translated',
    'source_file: content/reviews/en/sample/ign.md',
    '---',
    "<ReviewTabs slug='sample'>",
    `<ReviewTab id='ign' site='ign' label='IGN'>${content}</ReviewTab>`,
    "<ReviewTab id=\"mixed\" site='ign' label=\"IGN · 第二章\">",
    content,
    '</ReviewTab>',
    '</ReviewTabs>',
  ].join('\n');

  const document = parseDocument(source, 'sample.mdx');

  assert.ok(document);
  assert.deepEqual(document.tabs.map(({id, site, label}) => ({id, site, label})), [
    {id: 'ign', site: 'ign', label: 'IGN'},
    {id: 'mixed', site: 'ign', label: 'IGN · 第二章'},
  ]);
  assert.equal(translatedTabs(document).length, 2);
});

test('translation detection ignores incidental 待补 text in a translated paragraph', () => {
  const translated = '这是一段完整的中文译文，讨论角色构筑与战斗策略，其中角色尚有两名待补丁加入，且整段内容明显已经翻译完成。';

  assert.equal(hasTranslationContent(translated), true);
  assert.equal(hasTranslationContent(`${translated}\n\nGameSpot 中文译文待补。`), false);
  assert.equal(hasTranslationContent('IGN 中文译文待补。'), false);
  assert.equal(hasTranslationContent(`${translated}\n待补`), false);
});

test('hasTranslationContent requires at least 30 Han characters', () => {
  assert.equal(hasTranslationContent('中'.repeat(29)), false);
  assert.equal(hasTranslationContent('中'.repeat(30)), true);
  assert.equal(hasTranslationContent(''), false);
  assert.equal(hasTranslationContent(`中${'文'.repeat(29)}\n待补`), false);
});
