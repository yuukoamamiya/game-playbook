import test from 'node:test';
import assert from 'node:assert/strict';
import {toVersionNodes} from '../plugins/remark-game-versions.mjs';

test('version data becomes a searchable table with one row per release and platform', () => {
  const nodes = toVersionNodes([
    {
      sourceSlug: 'example', versionTitle: 'Example', platform: 'PC', score: 91,
      metacriticUrl: 'https://www.metacritic.com/game/example/',
    },
    {
      sourceSlug: 'example', versionTitle: 'Example', platform: 'PlayStation 5', score: 89,
      metacriticUrl: 'https://www.metacritic.com/game/example/',
    },
    {
      sourceSlug: 'example', versionTitle: 'Example', platform: 'PC', score: 91,
      metacriticUrl: 'https://www.metacritic.com/game/example/',
    },
  ]);

  assert.equal(nodes[0].type, 'heading');
  assert.equal(nodes[1].type, 'table');
  assert.equal(nodes[1].children.length, 3);
  assert.equal(nodes[1].children[1].children[0].children[0].value, 'Example');
  assert.equal(nodes[1].children[1].children[2].children[0].url, 'https://www.metacritic.com/game/example/');
});

test('single-version pages do not render an empty table', () => {
  assert.deepEqual(toVersionNodes([
    {sourceSlug: 'solo', versionTitle: 'Solo', platform: 'PC', score: null, metacriticUrl: ''},
  ]), []);
});
