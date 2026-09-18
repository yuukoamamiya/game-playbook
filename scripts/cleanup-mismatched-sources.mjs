import {readFile, writeFile, rm, access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {root} from './data-store.mjs';

const dataPath = resolve(root, 'data/metacritic-games.json');
const enDir = resolve(root, 'content/reviews/en');
const docDir = resolve(root, 'docs/games');

// 错配到「别的游戏」的评测 → 删除来源、英文源与标签页
const remove = [
  ['black-and-white', 'eurogamer'],
  ['battlefield-2', 'eurogamer'],
  ['deus-ex', 'eurogamer'],
  ['deus-ex', 'rockpapershotgun'],
  ['deus-ex', 'rpgsite'],
  ['dota-2', 'rockpapershotgun'],
  ['portal', 'rockpapershotgun'],
  ['the-sims-2', 'eurogamer'],
  ['the-longest-journey', 'adventuregamers'],
  ['planescape-torment', 'rockpapershotgun'],
];

// 同作品但属于 DLC / 重制版 / 增强版 / 非评测 → 保留，kind 改为 feature（文化评论放宽）
const feature = [
  ['age-of-empires-ii-the-age-of-kings', 'eurogamer'],
  ['baldurs-gate-3', 'eurogamer'],
  ['batman-arkham-asylum', 'eurogamer'],
  ['batman-arkham-city', 'eurogamer'],
  ['bioshock-infinite', 'eurogamer'],
  ['deus-ex-human-revolution', 'eurogamer'],
  ['deus-ex-human-revolution', 'rpgsite'],
  ['divinity-original-sin-ii', 'rpgsite'],
  ['dota-2', 'eurogamer'],
  ['dragon-age-origins', 'rockpapershotgun'],
  ['fallout-3', 'eurogamer'],
  ['fallout-3', 'rockpapershotgun'],
  ['grand-theft-auto-iii', 'eurogamer'],
  ['grand-theft-auto-iv', 'eurogamer'],
  ['half-life-2', 'eurogamer'],
  ['hades', 'rockpapershotgun'],
  ['hollow-knight', 'rockpapershotgun'],
  ['minecraft', 'rockpapershotgun'],
  ['persona-5-royal', 'rpgamer'],
  ['street-fighter-iv', 'eurogamer'],
  ['team-fortress-2', 'rockpapershotgun'],
  ['tom-clancys-splinter-cell', 'eurogamer'],
  ['total-war-shogun-2', 'eurogamer'],
];

async function sourceUrl(slug, site) {
  try {
    const t = await readFile(resolve(enDir, slug, `${site}.md`), 'utf8');
    return (t.match(/^source_url:\s*"?(.*?)"?\s*$/m) ?? [])[1]?.trim() ?? '';
  } catch {
    return '';
  }
}

const data = JSON.parse(await readFile(dataPath, 'utf8'));

let removed = 0;
for (const [slug, site] of remove) {
  const url = await sourceUrl(slug, site);
  for (const rec of data) {
    if (rec.slug !== slug) continue;
    const before = rec.sources.length;
    rec.sources = rec.sources.filter((s) => !(s.site === site && (!url || s.url === url)));
    removed += before - rec.sources.length;
  }
  await rm(resolve(enDir, slug, `${site}.md`), {force: true});
  const docPath = resolve(docDir, `${slug}.mdx`);
  try {
    let doc = await readFile(docPath, 'utf8');
    const re = new RegExp(`\\n*<ReviewTab site="${site}"[^>]*>[\\s\\S]*?</ReviewTab>\\n*`, 'g');
    doc = doc.replace(re, '\n').replace(/\n{3,}/g, '\n\n');
    await writeFile(docPath, doc, 'utf8');
  } catch { /* no doc */ }
}

let reclassified = 0;
for (const [slug, site] of feature) {
  const url = await sourceUrl(slug, site);
  for (const rec of data) {
    if (rec.slug !== slug) continue;
    for (const s of rec.sources) {
      if (s.site === site && (!url || s.url === url) && s.kind !== 'feature') { s.kind = 'feature'; reclassified += 1; }
    }
  }
}

await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log(`removed ${removed} wrong-game sources | reclassified ${reclassified} to feature`);
