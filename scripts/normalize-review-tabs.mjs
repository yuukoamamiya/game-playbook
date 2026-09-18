import {readFile, writeFile, readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {root} from './data-store.mjs';

const docDir = resolve(root, 'docs/games');

function cjkCount(text) {
  return (text.match(/[\u4e00-\u9fff]/g) || []).length;
}

function isPlaceholder(text) {
  return /待补/.test(text);
}

function hasContent(text) {
  return !isPlaceholder(text) && cjkCount(text) >= 30;
}

function stripImports(body) {
  return body
    .replace(/^[ \t]*import Tabs from "@theme\/Tabs";[ \t]*\r?\n/m, '')
    .replace(/^[ \t]*import TabItem from "@theme\/TabItem";[ \t]*\r?\n/m, '');
}

const files = (await readdir(docDir)).filter((f) => f.endsWith('.mdx') && !f.startsWith('_'));
let changed = 0;

for (const file of files) {
  const raw = await readFile(resolve(docDir, file), 'utf8');
  const split = raw.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)([\s\S]*)$/);
  if (!split) continue;
  const [, frontmatter, body] = split;

  const tabs = body.match(/<Tabs[^>]*>([\s\S]*?)<\/Tabs>/);
  if (!tabs) continue;

  const items = [...tabs[1].matchAll(/<TabItem\s+value="([^"]+)"\s+label="([^"]+)">([\s\S]*?)<\/TabItem>/g)]
    .map((m) => ({value: m[1], label: m[2], content: m[3]}));
  const kept = items.filter((item) => hasContent(item.content));

  const before = body.slice(0, tabs.index);
  const after = body.slice(tabs.index + tabs[0].length);

  let newBody;
  if (kept.length >= 2) {
    const rebuilt = `<Tabs groupId="review-source">\n${kept.map((item) => (
      `  <TabItem value="${item.value}" label="${item.label}">${item.content.replace(/\s+$/, '')}\n  </TabItem>`
    )).join('\n')}\n</Tabs>`;
    newBody = before + rebuilt + after;
  } else if (kept.length === 1) {
    const content = kept[0].content.replace(/^\s+/, '').replace(/\s+$/, '');
    newBody = stripImports(before) + content + after;
  } else {
    continue;
  }

  const next = (frontmatter + newBody).replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '\n');
  if (next !== raw) {
    await writeFile(resolve(docDir, file), next, 'utf8');
    changed += 1;
    console.log(`NORM  ${file} | kept ${kept.map((i) => i.value).join(',') || '(none)'}`);
  }
}

console.log(`\nnormalized ${changed} docs`);
