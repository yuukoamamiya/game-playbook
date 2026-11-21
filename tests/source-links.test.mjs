import assert from 'node:assert/strict';
import test from 'node:test';
import remarkSourceLinks from '../plugins/remark-source-links.mjs';

function metadata(url, {explicit = false, prefix = '来源：IGN（'} = {}) {
  const raw = `${prefix}${explicit ? `[原文](${url})` : url} 作者`;
  const link = {
    type: 'link', url,
    children: [{type: 'text', value: explicit ? '原文' : url}],
    position: {start: {offset: prefix.length}},
  };
  const paragraph = {type: 'paragraph', children: [
    {type: 'text', value: prefix}, link, {type: 'text', value: ' 作者'},
  ]};
  const tree = {type: 'root', children: [{type: 'blockquote', children: [paragraph]}]};
  remarkSourceLinks()(tree, {value: raw});
  return {link, paragraph};
}

test('source URL excludes the full-width closing wrapper and following separator', () => {
  const {link, paragraph} = metadata('https://example.com/review）·');
  assert.equal(link.url, 'https://example.com/review');
  assert.equal(link.children[0].value, 'https://example.com/review');
  assert.equal(paragraph.children.map((node) => node.value ?? node.children[0].value).join(''),
    '来源：IGN（https://example.com/review）· 作者');
});

test('URL query, fragment and balanced parentheses remain intact', () => {
  for (const url of [
    'https://example.com/review?q=one&lang=en#verdict',
    'https://example.com/review_(PC)',
    'https://example.com/评测（原版）',
    'https://example.com/review?q=%EF%BC%89',
  ]) {
    assert.equal(metadata(`${url}）·`).link.url, url);
  }
});

test('explicit Markdown URLs and ordinary article prose are not rewritten', () => {
  const url = 'https://example.com/review）';
  assert.equal(metadata(url, {explicit: true}).link.url, url);
  assert.equal(metadata(url, {prefix: '正文中的引用（'}).link.url, url);
});
