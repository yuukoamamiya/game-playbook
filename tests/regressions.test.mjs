import assert from 'node:assert/strict';
import test from 'node:test';

import {hasTranslationContent} from '../scripts/content-manifest.mjs';
import {mergeGames} from '../scripts/merge-games.mjs';

test('mergeGames does not modify input records or their source arrays', () => {
  const original = [
    {slug: 'sample', title: 'Sample', platform: 'PC', score: 80, releaseYear: 2020, genre: '', metacriticUrl: '', hasTranslation: false, sources: [{site: 'rpgamer', url: '/pc', kind: 'review', language: 'en', score: null}]},
    {slug: 'sample', title: 'Sample', platform: 'Switch', score: 82, releaseYear: 2021, genre: '', metacriticUrl: '', hasTranslation: true, sources: [{site: 'eurogamer', url: '/switch', kind: 'review', language: 'en', score: null}]},
  ];
  const before = structuredClone(original);

  const [merged] = mergeGames(original);

  assert.deepEqual(original, before);
  assert.deepEqual(merged.sources.map(({url}) => url), ['/pc', '/switch']);
  assert.notStrictEqual(merged.sources, original[0].sources);
  const pcOnly = mergeGames(original.filter(({platform}) => platform === 'PC'));
  assert.deepEqual(pcOnly[0].sources.map(({site}) => site), ['rpgamer']);
});

test('translation detection ignores incidental 待补 text in a translated paragraph', () => {
  const translated = '这是一段完整的中文译文，讨论角色构筑与战斗策略，其中角色尚有两名待补丁加入，且整段内容明显已经翻译完成。';

  assert.equal(hasTranslationContent(translated), true);
  assert.equal(hasTranslationContent(`${translated}\n\nGameSpot 中文译文待补。`), false);
  assert.equal(hasTranslationContent('IGN 中文译文待补。'), false);
  assert.equal(hasTranslationContent(`${translated}\n待补`), false);
});
