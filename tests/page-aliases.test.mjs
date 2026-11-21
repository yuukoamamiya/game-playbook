import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePageAliases} from '../scripts/lib/page-aliases.mjs';

const docSet = (...slugs) => new Set(slugs);
const game = (slug, page_slug) => ({slug, page_slug});

test('allows an alias to a documented version-only page without a main record', () => {
  assert.deepEqual(
    validatePageAliases([game('metroid-prime-remastered', 'metroid-prime')], docSet('metroid-prime')),
    [],
  );
});

test('allows multiple platform aliases to one documented page', () => {
  assert.deepEqual(validatePageAliases([
    game('example-remaster', 'example'),
    game('example-remaster', 'example'),
  ], docSet('example')), []);
});

test('always rejects direct self references, including alongside a base record', () => {
  assert.match(
    validatePageAliases([game('example', 'example'), game('example')], docSet('example')).join('\n'),
    /row 1: page_slug must not reference itself/,
  );
});

test('rejects aliases whose destination document is missing', () => {
  assert.match(validatePageAliases([game('example-remaster', 'example')], docSet()).join('\n'), /target example has no document/);
});

test('rejects redirect chains and cycles', () => {
  const chainErrors = validatePageAliases([
    game('edition-a', 'edition-b'), game('edition-b', 'canonical'),
  ], docSet('edition-b', 'canonical'));
  assert.match(chainErrors.join('\n'), /target edition-b is itself redirected/);

  const cycleErrors = validatePageAliases([
    game('edition-a', 'edition-b'), game('edition-b', 'edition-a'),
  ], docSet('edition-a', 'edition-b'));
  assert.match(cycleErrors.join('\n'), /itself redirected/);
});

test('rejects inconsistent destinations across platform records for one slug', () => {
  assert.match(validatePageAliases([
    game('edition', 'canonical-a'), game('edition', 'canonical-b'),
  ], docSet('canonical-a', 'canonical-b')).join('\n'), /inconsistent page_slug targets/);

  assert.match(validatePageAliases([
    game('edition'), game('edition', 'canonical'),
  ], docSet('edition', 'canonical')).join('\n'), /inconsistent page_slug targets/);
});
