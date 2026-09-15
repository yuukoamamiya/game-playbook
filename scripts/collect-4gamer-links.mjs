import {ProxyAgent, fetch} from 'undici';
import iconv from 'iconv-lite';
import {readGames, writeGames} from './data-store.mjs';
import {addSource, hasSource} from './media-sources.mjs';

const userAgent = 'Mozilla/5.0 (compatible; GamePlaybookResearch/1.0)';
const proxyUrl = process.env.GAME_PLAYBOOK_HTTP_PROXY || 'http://127.0.0.1:10809';
const dispatcher = new ProxyAgent(proxyUrl);
const endpoint = 'https://www.4gamer.net/script/search/search.php';
const referer = 'https://www.4gamer.net/script/search/index.php?mode=article&start';

const aliases = {
  'the-legend-of-zelda-ocarina-of-time-3d': 'ゼルダの伝説 時のオカリナ 3D',
  'fire-emblem-awakening': 'ファイアーエムブレム 覚醒',
  'the-legend-of-zelda-a-link-between-worlds': 'ゼルダの伝説 神々のトライフォース2',
  pushmo: '引ク押ス',
  'super-mario-3d-land': 'スーパーマリオ3Dランド',
  'the-legend-of-zelda-a-link-to-the-past-four-swords': 'ゼルダの伝説 神々のトライフォース 4つの剣',
  'tony-hawks-pro-skater-2': 'トニーホーク プロスケーター2',
  'super-mario-advance-4-super-mario-bros-3': 'スーパーマリオアドバンス4',
  'mario-kart-super-circuit': 'マリオカートアドバンス',
  'advance-wars': 'ゲームボーイウォーズアドバンス',
  'final-fantasy-vi': 'ファイナルファンタジーVI アドバンス',
  'metroid-fusion': 'メトロイドフュージョン',
  'super-mario-world-super-mario-advance-2': 'スーパーマリオアドバンス2',
  'castlevania-aria-of-sorrow': 'キャッスルヴァニア 暁月の円舞曲',
  'castlevania-circle-of-the-moon': '悪魔城ドラキュラ Circle of the Moon',
  'golden-sun': '黄金の太陽 開かれし封印',
  'yoshis-island-super-mario-advance-3': 'スーパーマリオアドバンス3 ヨッシーアイランド',
  'mario-and-luigi-superstar-saga': 'マリオ&ルイージRPG',
  'tony-hawks-pro-skater-3': 'トニーホーク プロスケーター3',
  'grand-theft-auto-chinatown-wars': 'グランド・セフト・オート チャイナタウン・ウォーズ',
  'chrono-trigger': 'クロノ・トリガー',
  'mario-kart-ds': 'マリオカートDS',
  'advance-wars-dual-strike': 'ゲームボーイウォーズDS',
  'mario-and-luigi-bowsers-inside-story': 'マリオ&ルイージRPG3',
  'the-legend-of-zelda-phantom-hourglass': 'ゼルダの伝説 夢幻の砂時計',
  'resident-evil-requiem': 'バイオハザード レクイエム',
  'death-stranding-2-on-the-beach': 'DEATH STRANDING 2 ON THE BEACH',
  'elden-ring-tarnished-edition': 'ELDEN RING Tarnished Edition',
  'mina-the-hollower': 'Mina the Hollower',
  'onimusha-way-of-the-sword': '鬼武者 Way of the Sword',
  'forza-horizon-6': 'Forza Horizon 6',
  'hades-ii': 'Hades II',
  'the-legend-of-zelda-tears-of-the-kingdom-nintendo': 'ゼルダの伝説 ティアーズ オブ ザ キングダム Nintendo Switch 2 Edition',
  'the-legend-of-zelda-breath-of-the-wild-nintendo': 'ゼルダの伝説 ブレス オブ ザ ワイルド Nintendo Switch 2 Edition',
  'blue-prince': 'Blue Prince',
  'donkey-kong-bananza': 'ドンキーコング バナンザ',
  'hollow-knight-silksong': 'Hollow Knight Silksong',
  'clair-obscur-expedition-33': 'Clair Obscur Expedition 33',
  'final-fantasy-vii-rebirth': 'ファイナルファンタジーVII リバース',
  'split-fiction': 'Split Fiction',
  'the-last-of-us-part-ii-remastered': 'The Last of Us Part II Remastered',
  'elden-ring-shadow-of-the-erdtree': 'ELDEN RING Shadow of the Erdtree',
  'metaphor-refantazio': 'メタファー：リファンタジオ',
  satisfactory: 'Satisfactory',
  'tekken-8': '鉄拳8',
  'ufo-50': 'UFO 50',
  'animal-well': 'Animal Well',
  balatro: 'Balatro',
  'god-of-war-ragnarok': 'God of War Ragnarök',
  'shin-megami-tensei-v-vengeance': '真・女神転生V Vengeance',
  'the-legend-of-zelda-tears-of-the-kingdom': 'ゼルダの伝説 ティアーズ オブ ザ キングダム',
  'baldurs-gate-3': 'Baldur’s Gate 3',
  'metroid-prime-remastered': 'メトロイドプライム リマスタード',
  'super-mario-bros-wonder': 'スーパーマリオブラザーズ ワンダー',
  'street-fighter-6': 'ストリートファイター6',
  'against-the-storm': 'Against the Storm',
  'resident-evil-4': 'バイオハザード RE:4',
  'persona-4-golden': 'ペルソナ4 ザ・ゴールデン',
  'sea-of-stars': 'Sea of Stars',
  'dave-the-diver': 'DAVE THE DIVER',
  'hi-fi-rush': 'Hi-Fi RUSH',
  'slay-the-princess': 'Slay the Princess',
};

const excludedWords = /ニュース|発売|予約|配信|グッズ|フィギュア|サウンドトラック|CD|イベント|キャンペーン|セール|攻略|ムービー|動画|PV|DLC|追加コンテンツ|アップデート|大会|広告|トレイラー|スタートガイド|まとめ|発表|配布|メディアからの称賛/i;
const reviewWords = /レビュー|評価|プレイレポート|インプレッション|考察|特集|インタビュー|解説/i;
const articlePattern = /^\/games\/\d+\/G\d+\/\d{11}\/?$/;

function cleanText(value) {
  return value.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}

function normalize(value) {
  return value.toLowerCase().replace(/[：:・･'’“”「」『』（）()!?！？.,，、\s_-]+/g, '');
}

function matchesRequestedTitle(title, query) {
  const compactTitle = normalize(title);
  const compactQuery = normalize(query);
  if (compactQuery.length >= 5 && compactTitle.includes(compactQuery)) return true;
  const tokens = query.toLowerCase().match(/[a-z0-9]{3,}|\d+/g) ?? [];
  if (!tokens.length) return compactTitle.includes(compactQuery.slice(0, 4));
  const rawTitle = title.toLowerCase();
  const matched = tokens.filter((token) => /^\d+$/.test(token)
    ? new RegExp(`(?:^|\\D)${token}(?:$|\\D)`).test(rawTitle)
    : compactTitle.includes(token));
  return matched.length === tokens.length;
}

function parseCandidates(html, query) {
  const candidates = [];
  const pattern = new RegExp('<a[^>]+href="([^\"]+)"[^>]*>([\\s\\S]{0,1200}?)<\\/a>', 'gi');
  for (const match of html.matchAll(pattern)) {
    const url = match[1].split('?')[0];
    const title = cleanText(match[2]);
    if (!articlePattern.test(url) || !title || !reviewWords.test(title)
      || excludedWords.test(title) || !matchesRequestedTitle(title, query)) continue;
    if (!candidates.some((candidate) => candidate.url === url)) candidates.push({url, title});
  }
  return candidates;
}

function sourceKind(title) {
  return /レビュー|評価/.test(title) ? 'review' : 'feature';
}

async function search4gamer(title) {
  const candidates = [];
  for (let page = 1; page <= 3; page += 1) {
    const params = new URLSearchParams({
      DUMMY: '日本語', PAGE: String(page), KEYWORD_IDS: '', KEYWORD_NAMES: '', SEARCH_TYPE: 'list',
      SALE_FILTER: '', END_FILTER: '', MODE: 'article', ORMODE: '', TEMPLATE_TYPE: 'PC',
      YEAR: '', MONTH: '', DAY: '', SORT: 'date', TITLE: title,
    });
    const response = await fetch(endpoint, {
      method: 'POST', body: params, dispatcher,
      headers: {'User-Agent': userAgent, 'Content-Type': 'application/x-www-form-urlencoded', Referer: referer},
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = iconv.decode(Buffer.from(await response.arrayBuffer()), 'EUC-JP');
    for (const candidate of parseCandidates(html, title)) {
      if (!candidates.some((item) => item.url === candidate.url)) candidates.push(candidate);
    }
    if (!html.includes('次のページ')) break;
  }
  return candidates.map((candidate) => ({...candidate, url: new URL(candidate.url, 'https://www.4gamer.net').href}));
}

const rows = await readGames();
const dryRun = process.argv.includes('--dry-run');
const requestedSlug = process.argv.find((argument) => argument.startsWith('--slug='))?.slice('--slug='.length);
const selected = rows.filter((row) => !requestedSlug || row.slug === requestedSlug);
const handled = new Set();
const stats = {found: 0, notFound: 0, skipped: 0, noAlias: 0, error: 0};

for (const row of selected) {
  if (handled.has(row.slug) || hasSource(row, '4gamer')) {
    stats.skipped += 1;
    handled.add(row.slug);
    continue;
  }
  const alias = aliases[row.slug];
  if (!alias) {
    stats.noAlias += 1;
    console.log(`NO_ALIAS | ${row.slug} | ${row.title}`);
    continue;
  }
  try {
    const candidates = await search4gamer(alias);
    const result = candidates[0];
    if (!result) {
      stats.notFound += 1;
      console.log(`NOT_FOUND | ${row.slug} | ${alias}`);
    } else {
      stats.found += 1;
      console.log(`FOUND | ${row.slug} | ${result.title} | ${result.url}`);
      if (!dryRun) addSource(row, {site: '4gamer', kind: sourceKind(result.title), language: 'ja', score: null, url: result.url});
    }
  } catch (error) {
    stats.error += 1;
    console.log(`ERROR | ${row.slug} | ${error.message}`);
  }
  handled.add(row.slug);
  if (!dryRun) await writeGames(rows);
}

console.log(JSON.stringify({dryRun, rows: selected.length, stats}, null, 2));
