import {readFile, writeFile, readdir, access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {readGames, root} from './data-store.mjs';

const enDir = resolve(root, 'content/reviews/en');
const docDir = resolve(root, 'docs/games');

async function exists(p) { try { await access(p); return true; } catch { return false; } }

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    const n = text[i + 1];
    if (c === '"' && quoted && n === '"') { value += '"'; i += 1; }
    else if (c === '"') { quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(value); value = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && n === '\n') i += 1;
      row.push(value);
      if (row.some((x) => x !== '')) rows.push(row);
      row = []; value = '';
    } else { value += c; }
  }
  if (value || row.length) { row.push(value); if (row.some((x) => x !== '')) rows.push(row); }
  const [header = [], ...records] = rows;
  return records.map((r) => Object.fromEntries(header.map((name, idx) => [name, r[idx] ?? ''])));
}

const q = (v) => `"${String(v ?? '').replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
const num = (v) => (v !== '' && Number.isFinite(Number(v)) ? Number(v) : '');

const rows = await readGames();
const bySlug = new Map();
for (const row of rows) {
  if (!bySlug.has(row.slug)) bySlug.set(row.slug, []);
  bySlug.get(row.slug).push(row);
}

const gsFiles = [];
for (const dir of await readdir(enDir)) {
  if (await exists(resolve(enDir, dir, 'gamespot.md'))) gsFiles.push(dir);
}

const tabBlock = '<ReviewTab site="gamespot" label="GameSpot">\n\nGameSpot 中文译文待补。\n\n</ReviewTab>';

let created = 0;
let inserted = 0;

for (const slug of gsFiles) {
  const gsFm = (await readFile(resolve(enDir, slug, 'gamespot.md'), 'utf8')).match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const docPath = resolve(docDir, `${slug}.mdx`);
  if (await exists(docPath)) {
    let doc = await readFile(docPath, 'utf8');
    if (!doc.includes('site="gamespot"')) {
      doc = doc.replace(/\n?<\/ReviewTabs>/, `\n\n${tabBlock}\n\n</ReviewTabs>`);
      await writeFile(docPath, doc, 'utf8');
      inserted += 1;
    }
    continue;
  }

  const group = bySlug.get(slug);
  if (!group) { console.log(`NO_DATA ${slug}`); continue; }
  const row = group[0];
  const platforms = [...new Set(group.map((r) => r.platform))];
  let notes = row.notes;
  if (platforms.length > 1) notes = `${notes}；多平台入选：${platforms.join('、')}`;

  const fm = [
    '---',
    `title: ${q(row.title)}`,
    `display_title: ${q(row.title)}`,
    `slug: ${q(slug)}`,
    `source_title: ${q(row.title)}`,
    `platform: ${q(row.platform)}`,
    `metacritic_score: ${num(row.metacritic_score)}`,
    'must_play: true',
    `release_year: ${num(row.release_year)}`,
    `genre: ${q(row.genre)}`,
    `metacritic_url: ${q(row.metacritic_url)}`,
    'content_status: translated',
    'translation_status: translated',
    `source_file: content/reviews/en/${slug}/gamespot.md`,
    `notes: ${q(notes)}`,
    '---',
  ].join('\n');

  const body = `\n\n# ${row.title}\n\n<ReviewTabs slug="${slug}">\n\n${tabBlock}\n\n</ReviewTabs>\n`;
  await writeFile(docPath, `${fm}${body}`, 'utf8');
  created += 1;
}

console.log(`created ${created} gamespot-only docs | inserted gamespot tab into ${inserted} docs`);
