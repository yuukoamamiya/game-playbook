import {readFile, writeFile, readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {root} from './data-store.mjs';

const docDir = resolve(root, 'docs/games');
const files = (await readdir(docDir)).filter((f) => f.endsWith('.mdx') && !f.startsWith('_'));
let changed = 0;

for (const file of files) {
  const raw = await readFile(resolve(docDir, file), 'utf8');
  const split = raw.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)([\s\S]*)$/);
  if (!split) continue;
  const [, frontmatter, body] = split;
  if (body.includes('<ReviewTabs')) continue;

  const slug = (frontmatter.match(/^slug:\s*(.*)$/m)?.[1] ?? '').trim().replace(/^['"]|['"]$/g, '');
  const h1 = body.match(/^#\s+.*$/m);
  if (!slug || !h1) continue;

  const headEnd = h1.index + h1[0].length;
  const head = body.slice(0, headEnd).trim();
  const rest = body.slice(headEnd).trim();
  if (!rest) continue;

  const out = `${frontmatter}\n${head}\n\n<ReviewTabs slug="${slug}">\n\n<ReviewTab site="ign" label="IGN">\n\n${rest}\n\n</ReviewTab>\n\n</ReviewTabs>\n`;
  await writeFile(resolve(docDir, file), out, 'utf8');
  changed += 1;
}

console.log(`wrapped ${changed} docs`);
