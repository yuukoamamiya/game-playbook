import {readFile, writeFile, readdir, access} from 'node:fs/promises';
import {resolve} from 'node:path';

const root = 'D:/Documents/GitHub/Game';
const enDir = resolve(root, 'content/reviews/en');
const docDir = resolve(root, 'docs/games');

const labels = {
  eurogamer: 'Eurogamer',
  rockpapershotgun: 'Rock Paper Shotgun',
  rpgsite: 'RPG Site',
  rpgamer: 'RPGamer',
  '4gamer': '4Gamer.net',
  adventuregamers: 'Adventure Gamers',
  theatlantic: 'The Atlantic',
  jesperjuul: 'Jesper Juul',
  gamestudies: 'Game Studies',
  todigra: 'ToDiGRA',
  gamesandculture: 'Games and Culture',
};

async function exists(p) { try { await access(p); return true; } catch { return false; } }

const slugs = (await readdir(enDir, {withFileTypes: true})).filter((d) => d.isDirectory()).map((d) => d.name);
let changed = 0;
let inserted = 0;

for (const slug of slugs) {
  const docPath = resolve(docDir, `${slug}.mdx`);
  if (!await exists(docPath)) continue;
  let doc = await readFile(docPath, 'utf8');
  if (!doc.includes('<ReviewTabs')) continue;

  const files = await readdir(resolve(enDir, slug));
  let next = doc;
  for (const f of files) {
    if (!f.endsWith('.md')) continue;
    const key = f.replace(/\.md$/, '');
    const fm = (await readFile(resolve(enDir, slug, f), 'utf8')).match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
    const site = ((fm.match(/^source_site:\s*(.*)$/m) ?? [])[1] ?? '').trim().replace(/^['"]|['"]$/g, '');
    if (!labels[site]) continue;
    const id = key;
    if (next.includes(`id="${id}"`)) continue;
    const legacy = id === site && new RegExp(`<ReviewTab(?![^>]*\\bid=)[^>]*\\bsite="${site}"`).test(next);
    if (legacy) continue;
    const title = ((fm.match(/^source_title:\s*(.*)$/m) ?? [])[1] ?? '').trim().replace(/^['"]|['"]$/g, '');
    const label = id === site ? labels[site] : `${labels[site]} · ${title.slice(0, 40)}`;
    const block = `<ReviewTab id="${id}" site="${site}" label="${label}">\n\n${labels[site]} 中文译文待补。\n\n</ReviewTab>\n\n`;
    next = next.replace(/\n?<\/ReviewTabs>/, `\n\n${block}</ReviewTabs>`);
    inserted += 1;
  }
  if (next !== doc) {
    await writeFile(docPath, next.replace(/\n{3,}/g, '\n\n'), 'utf8');
    changed += 1;
  }
}

console.log(`updated ${changed} docs | inserted ${inserted} media tabs`);
