# AI 协作历史摘要

本文件保存已经完成的阶段性工作摘要。它不是当前操作规则；接手任务时先阅读仓库根目录的 `AGENTS.md`，只有需要追溯历史决策时再查阅本文件。

## 数据层与收录范围

- 早期曾使用 CSV 作为 AI 间交换层，后来因列错位问题迁移为 `data/metacritic-games.json`；CSV 不再是主数据，也不应恢复。
- Metacritic 收录范围从“MC ≥90 且 Must-Play”调整为“带有 Must-Play 即收录”；MC 分数只用于显示和排序。
- 已确认平台为 PC、Nintendo Switch、Nintendo Switch 2、Game Boy Advance、Nintendo DS、3DS；Metacritic 当前没有可用的 SFC/SNES 平台筛选页。
- 首页曾出现跨平台重复卡片和筛选时宽度变化，现已按 slug 合并游戏，并加入稳定滚动条槽位和固定主内容宽度。

## 内容与媒体

- 已建立一个游戏一个公开页面、页面内按媒体切换的 `ReviewTabs` 机制；不是每个媒体单独创建 Docusaurus 页面。
- 英文评测保存在 `content/reviews/en/`，中文译文保存在 `docs/games/`；英文目录不进入 Docusaurus 前台。
- 已完成 IGN、GameSpot 以及 PC Gamer、Eurogamer、RPG Site、Rock Paper Shotgun、RPGamer、4Gamer、Unwinnable、Aftermath、The CRPG Addict、Radical Philosophy、Jesper Juul 等来源的部分链接采集。
- `indienova` 曾临时加入，因用户确认存在版权风险已全部删除；不要恢复。
- Fami通 曾收录 8 个游戏的专栏（`ja`、`kind: feature`、无评分），因用户认为内容质量太差已全部移除；相关 source、英文源、页面标签和媒体映射均已删除，不要恢复。
- Early Access 评测可以保留。具体版本的评测仍需严格对应；文化评论、专题、历史回顾可以放宽版本对应。
- 已检查齐泽克、加洛维、东浩纪、杰斯伯·尤尔和伊安·博格斯特。当前只有加洛维和尤尔确认有文章可对应现有目录游戏；博格斯特的已确认文章对应目录外作品，因此没有落库。
- 学者文章用 `sources[].filter_group: "scholar"` 标记：`theatlantic`（博格斯特）、`jesperjuul`（尤尔）以及只有单篇文章的 `radicalphilosophy`（加洛维《Playing the Code》）和 `ctheory`（加洛维《Warcraft and Utopia》）都归入首页「学者」筛选项，卡片仍显示原始媒体名。`gamestudies` 是收录多篇论文的期刊，保持独立筛选项，其中加洛维的两篇不单独归入「学者」。
- 已补录加洛维《Warcraft and Utopia》（CTheory 2006，主要讨论《魔兽世界》）→ `world-of-warcraft`。该文以前只有 PDF，University of Victoria 期刊站现提供 HTML 全文。

## 正文补采（2026-09-17）

- 用 `scripts/collect-media-reviews.mjs` 补采了 Unwinnable（25 篇）、Aftermath（3 篇）、Rock Paper Shotgun（4 篇）、4Gamer（5 篇）、Jesper Juul（1 篇）的英文正文；其中 Unwinnable、Aftermath、Rock Paper Shotgun、Eurogamer、Game Studies、The Atlantic 需要本地代理，Unwinnable 还需 `--concurrency=1` 串行。
- 用浏览器 MCP 补采了 curl 取不到的 RPGamer（5 篇）和 IGN `mario-and-luigi-superstar-saga`（视频评测短文）；GameSpot `tony-hawks-pro-skater-3` 的正文和译文其实早已存在，此前清单是过期记录。
- 正文已翻译进对应 `docs/games/<slug>.mdx` 的 `ReviewTab`；同一媒体有多篇时使用唯一 `id`（如 `unwinnable-2`）并在标签名后加「· 2」。
- 新增 `mother-2`（MOTHER 2 / EarthBound，Wii U）、`mother-3`（Mother 3，GBA）两个条目，补采 IGN、RPGFan、Eurogamer 正文并翻译进对应 `ReviewTab`；Eurogamer 的 Mother 3 评测分两页，`scripts/collect-media-reviews.mjs` 为此新增了 `paginate` 支持。
- 当日主数据中带评分的 source 条目数：IGN 163、GameSpot 177、Eurogamer 92、RPGamer 18、RPG Site 34。

## 维护核对（2026-09-27）

- 统一英文源元数据：删除空目录 `content/reviews/en/bayonetta-plus-bayonetta-2`；为 `mother-2`、`mother-3` 补上 `source_file`，并把 `against-the-storm`、`chained-echoes`、`grand-theft-auto-san-andreas`、`mario-and-luigi-superstar-saga` 中指向不存在合并文件的 `source_file` 改为实际存在的按站点英文源。英文源仍按数据记录 `slug` 命名：升级/重制版记录（如 `persona-5-royal`、`the-legend-of-zelda-breath-of-the-wild-nintendo`）保留各自目录，用于版本专属文章，不与基础版 slug 合并。
- 4Gamer 正文边界收紧：`scripts/collect-media-reviews.mjs` 中 4Gamer 的 `end` 由不生效的 `関連タイトル` 改为 `↑本文↑|↑記事内部↑|関連情報エリア|↓ソーシャルブックマーク`，并清理了 8 个既有 4Gamer 英文源尾部的「関連情報」链接列表。
- `sources[].kind` 复核：把在原始作品记录下引用重制/合集评测的条目改为 `feature`（`grim-fandango` IGN/GameSpot＝2015 重制版，`rome-total-war` IGN＝2021 重制版，`the-elder-scrolls-iv-oblivion` IGN＝2025 重制版，`mass-effect-2` IGN＝2021《传奇版》），并在对应 `ReviewTab` 的说明中标明版本；`warcraft-iii-reign-of-chaos` 的 IGN 链接实为前瞻汇编，改为 `feature` 并在标签注明「前瞻」。
- 评分核对：`sid-meiers-civilization-iv` 的 IGN 原文给出 Overall 9，已补入 `score: 9`；其余原清单入口经核对没有可直接归入的数字评分，保持 `null`。
- 同一 URL 跨平台记录复用已复核：同作品多平台记录和基础版/升级版记录共用评测 URL 属预期行为，首页按 `site` + `url` 去重；`half-life-2` 上的 Eurogamer 文章实为《第二章》评测，已在标签和说明中标注。
- 用户决定不再实现 GitHub Raw 图片代理（Cloudflare Worker）方案，相关待办已移除。

## 新增条目（2026-09-27）

- 全平台 Must-Play 扫描发现 1 条新记录：`bayonetta-plus-bayonetta-2`（Switch 合集，MC 90）；因其评测与已有的《猎天使魔女》《猎天使魔女2》重复，通过 `page_slug` 并入 `bayonetta-2` 页面。
- 按用户要求手动收录（`content_status: manually-added`）非 Must-Play 的马力欧 RPG 系列：`mario-and-luigi-partners-in-time`（DS）、`mario-and-luigi-dream-team`（3DS）、`mario-and-luigi-paper-jam`（3DS）、`mario-and-luigi-brothership`（Switch）、`paper-mario-the-thousand-year-door`（Switch）、`yoshi-and-the-mysterious-book`（Switch 2）。
- 两个 3DS 重制版通过 `page_slug` 并入原作页面并补充版本化标签：`mario-and-luigi-superstar-saga-plus-bowsers` → `mario-and-luigi-superstar-saga`（GameSpot · 3DS 重制版，8/10）、`mario-and-luigi-bowsers-inside-story-plus-bowser` → `mario-and-luigi-bowsers-inside-story`（GameSpot · 3DS 重制版，8/10）。
- 每个新页面采集并翻译了 IGN 与 GameSpot 两篇评测；GameSpot 正文直接访问会被 Cloudflare 拦截，改用 Wayback Machine 快照（`web.archive.org`）取得正文与 JSON-LD 评分。IGN 正文用 `collect-media-reviews.mjs` 经本地代理采集。

## 仓库维护（2026-10-01）

- 新增 `.github/workflows/ci.yml`：push/PR 时执行数据校验、生成前台数据、生成物漂移检查、类型检查和脚本语法检查；本地新增 `npm run verify` 与 `npm run check:scripts`。
- `scripts/validate-games-data.mjs` 增强：检查中文页 `source_file` 是否存在、`sources[].site` 是否有 `mediaLabels` 映射、同一 URL 是否被多个站点复用（告警）；移除每次运行都出现的 `genre` 空值告警。
- 单一数据源：185 个中文页 frontmatter 精简为 `title`、`display_title`、`slug`、`translation_status`、`source_file`，移除与主数据重复的 `platform`、`metacritic_score`、`must_play`、`release_year`、`genre`、`metacritic_url`、`content_status`、`notes`、`source_title`；`docs/games/_template.mdx` 同步。
- 删除主数据中已无用的遗留 `page` 字段（页码只保留在 `notes`），`collect-metacritic-intersection.mjs` 不再写回；`media-sources.mjs` 移除已无数据引用的 legacy 媒体字段兼容代码。
- 删除 Docusaurus 脚手架残留：未引用的模板图片、`blog/`、`docs/tutorial-*`、空目录。
- 一次性迁移/批处理脚本移入 `scripts/archive/`，并加 `README.md` 说明不再运行。
- 首页合并记录时，评分相同的平台全部列出，而不是只显示第一个。

## 部署

- GitHub 与 Cloudflare Pages 已连通，Cloudflare 构建命令为 `npm run build`，输出目录为 `build`，Node.js 使用 20 或更高版本。
- 图片仍保留在仓库的 `static/img/reviews-webp/`，暂不计划额外的图片代理加速方案。
