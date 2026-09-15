# Game Playbook 协作说明

这份文件是给参与本仓库的 AI、自动化工具和人类维护者看的。目标是让不同 AI 在切换后仍然遵守相同的数据边界、内容流程和部署约定。

## 项目目标

这是一个个人使用的 Docusaurus 游戏档案库，用来筛选和阅读带有 Metacritic Must-Play 标记的游戏，并集中保存 IGN 与 GameSpot 的评测入口和中文译文。

当前收录条件：

- 必须带有 Metacritic Must-Play 标记。
- 当前平台范围为 PC、Nintendo Switch、Nintendo Switch 2；后续继续检查 Game Boy Advance、Nintendo DS、3DS。Metacritic 当前平台列表没有 SFC/SNES，不要把全平台回退页误当作 SFC 数据。

不要擅自放宽或改变这些条件。若需要改变，先在对话中说明影响。

## 内容分层

仓库中的内容分为三层，不要混用：

```text
data/metacritic-games.json    抓取与 AI 之间交换数据的唯一主数据层
content/reviews/en/           英文评测资料，仅供 AI 翻译和整理
docs/games/                   网站前台公开的中文译文与媒体评测页
```

### `data/metacritic-games.json`

- 保存游戏元数据、Metacritic 分数、Must-Play 状态、平台和可扩展的媒体来源。
- 使用 JSON 数组而不是 CSV，避免列数错位；分数使用数字、Must-Play 使用布尔值、缺失数值使用 `null`。
- 媒体来源统一放在 `sources` 数组中，每项结构为 `{site, kind, language, score, url}`；同一媒体可以有多篇文章。
- `kind` 使用 `review`、`essay`、`feature` 或 `score`；没有媒体评分时 `score` 为 `null`。`site` 使用稳定的小写标识。
- 这是方便多个 AI 之间交换和批量处理的唯一主数据层；网站构建时从它生成 `src/generated/games.json`。
- 不要把英文评测正文写进 JSON。
- 除非用户明确要求，不要擅自修改已有评分或伪造链接。
- 运行 `npm run validate-data` 检查必填字段、类型、重复 slug 和 URL 形状。

### `content/reviews/en/`

- 保存英文评测 Markdown，供后续 AI 翻译、摘要和核对。
- 该目录必须位于 `docs/` 之外。
- 英文源文件不能被 Docusaurus 文档插件扫描，也不能被首页组件读取正文。
- 推荐文件名为 `content/reviews/en/<slug>.md`。
- 可以保留来源 URL 和站点名称，但不要把抓取凭据、Cookie、API key 或个人隐私写入文件。

### `docs/games/`

- 保存网站前台可见的中文译文和媒体评测页。
- 不保存个人备注，也不把英文评测原文作为公开正文。
- 每个游戏页面使用媒体标签页切换 IGN、GameSpot 等来源。
- 每个公开游戏文档使用 `docs/games/_template.mdx` 的 frontmatter 结构。
- 文档的 `slug` 必须与 JSON 中对应游戏的 `slug` 一致。
- 只有存在对应中文文档时，首页才显示“中文译文已收录”并提供站内链接。

## 新增媒体评测

一个游戏继续只使用一个公开页面。不同媒体的译文放在同一页面的标签页中，不要为同一游戏复制出 `ign`、`gamespot` 等多个 Docusaurus 页面。收入的内容不局限于传统评测，也可以是与该游戏明确相关的文化评论、专题文章或评分资料。

### 只增加某个游戏页的媒体标签

游戏页的标签由组件自动识别，不需要手写 Docusaurus 的 `<Tabs>`。每个游戏页结构如下：

```mdx
# 中文游戏名

<ReviewTabs slug="game-slug">

<ReviewTab site="ign" label="IGN">

这里写 IGN 中文译文。

</ReviewTab>

<ReviewTab site="gamespot" label="GameSpot">

这里写 GameSpot 中文译文。

</ReviewTab>

</ReviewTabs>
```

- 增加媒体：在 `<ReviewTabs>` 内再加一个 `<ReviewTab site="…" label="…">`，并写入中文译文即可。`site` 用稳定的小写标识（如 `eurogamer`、`pc-gamer`），不要与其他标签重复。
- 组件只在“该媒体确有译文”时才显示对应标签页；只有一个媒体时不显示标签栏，直接展示正文。空标签页（内容含“待补”）不会显示。
- 判定依据是构建时生成的 `src/generated/reviews.json`：`scripts/generate-games-data.mjs` 会扫描每个页面的 `<ReviewTab>` 块，把有实际译文的媒体写进该文件。组件 `src/components/ReviewTabs.tsx`（经 `src/theme/MDXComponents.tsx` 全局注册）读取它决定渲染哪些标签页。
- 因此新增媒体**不需要**改组件或脚本，只要在该游戏页补一个 `<ReviewTab>` 并写译文；重新运行 `npm run generate-data` 后标签页会自动出现。
- 页面里若出现“待补”占位内容，请保持空占位，组件会自动隐藏该标签页。
- 文化评论和专题文章可以作为正式内容收入，不要求存在媒体评分；标签应明确区分“评测”“文化评论”“专题”或“评分资料”。不要为了凑覆盖率收入与具体游戏无关的新闻、榜单、攻略或宣传稿。

示例：

```mdx
<ReviewTab site="eurogamer" label="Eurogamer">

这里填写 Eurogamer 中文译文。

<a href="https://example.com/review" target="_blank" rel="noreferrer">查看 Eurogamer 原文 ↗</a>

</ReviewTab>
```

### 让首页也支持新媒体

当前媒体入口统一放在 `sources` 数组中。新增媒体后，必须同步修改以下位置，不能只改游戏页：

1. `data/metacritic-games.json`：在对应记录的 `sources` 数组追加来源对象；不要再增加 `xxx_url`、`xxx_score` 或 `xxx_urls` 字段。
2. `scripts/media-sources.mjs`：使用来源规范化和 `addSource` / `hasSource` 辅助函数写入，避免重复 URL。
3. `scripts/generate-games-data.mjs`：把 `sources` 传到生成数据；不要在首页组件里增加越来越多的单独字段。
4. `src/pages/index.tsx`：遍历通用 `sources` 展示所有媒体链接和评分。
5. `docs/games/_template.mdx`：补充新媒体的 `<ReviewTab>` 示例，或保留清晰的“可继续添加标签页”说明。
6. 若新媒体有英文源资料，按 `<slug>/<site>.md` 保存，并在对应标签页写中文译文；不要把英文源目录接入 Docusaurus。
7. 重新运行 `npm run validate-data`、`npm run generate-data` 和 `npm run typecheck`。

不要在 `GameRecord`、JSON 映射和 JSX 中重复堆叠 `xxxUrl` / `xxxScore` / `xxxLink` 字段。

## 推荐工作流

处理一款新游戏时按以下顺序：

1. 确认它在 JSON 中满足 `must_play=true`；MC 分数只作为展示和排序字段，不再作为收录门槛。
2. 在 `sources` 中补充媒体入口；找不到的链接不要猜测，必要时在 `notes` 说明。
3. 将英文评测资料放入 `content/reviews/en/<slug>.md`。
4. 用 AI 将英文资料翻译或整理为中文，写入 `docs/games/<slug>.mdx`。
5. 在对应媒体标签页写入中文译文，并保留来源链接。
6. 运行 `npm run generate-data` 更新 `src/generated/games.json`。
7. 运行 `npm run typecheck` 做静态检查。
8. 将改动交给用户审阅；除非用户明确要求，不要自行提交或推送 Git，也不要在 Cloudflare 外发布。

## 网站与部署

- 网站使用 Docusaurus。
- Cloudflare Pages 构建命令：`npm run build`。
- 构建输出目录：`build`。
- Node.js：20 或更高版本。
- `npm run build` 会先执行 `npm run generate-data`，再进行 Docusaurus 构建。
- 用户明确要求由 Cloudflare Pages 构建；除非用户要求，不执行本地生产构建。
- `src/generated/games.json` 是生成文件，不要手工维护内容；应修改 JSON、公开文档或生成脚本后重新生成。

## 待办事项

- **图片加速**：图片源文件继续存放在 GitHub 仓库的 `static/img/reviews/`，不迁移到 Cloudflare Images 或 R2。后续复用博客的思路，使用 Cloudflare Worker 作为图片代理层：前台图片地址改为 Worker 路由，Worker 从 GitHub Raw（或约定的 GitHub 源地址）读取并设置缓存。实现时补充 Worker 路由、GitHub 源地址配置、缓存键和缓存失效策略；在 Worker 上线前不要删除仓库内的图片。

## 修改原则

- 先读取现有文件和 Git 工作区状态，保留用户已有改动，不做破坏性覆盖。
- 使用补丁方式编辑文件，避免通过 shell 重定向覆盖文件。
- 不删除用户未明确要求删除的抓取结果、链接或文档。
- 不引入新的运行时依赖，除非确有必要并说明原因。
- 不把英文资料目录加入 Docusaurus 的 `docs`、sidebar、搜索索引或首页数据读取逻辑。
- 不在 React 页面中硬编码游戏列表；列表来自生成的 JSON。
- 新增媒体时，不要把媒体名称硬编码成只能支持两个选项；页面标签和首页媒体链接都应能扩展。
- 保持首页简洁、易扫读，不添加与选游戏无关的煽情文案或复杂功能。

## 模型与跨 AI 协同

- 当前协作偏好：GPT-5.6 Luna。若平台无法使用该模型，必须在回复中明确说明，不要静默声称仍在使用 Luna。
- 不同 AI 接手时，先查看本文件、`README.md`、`DESIGN.md` 和当前 Git 状态。
- 交接时说明：已完成的文件、待办事项、验证结果、是否有未提交改动，以及是否有外部阻塞。
- 不要因为切换模型而重新抓取或重写已完成的数据；优先增量修改。
- 不确定评分、链接、译文状态或用户意图时，保留现状并标记待确认，不要猜测。

## 交付前检查

至少确认以下事项：

- JSON 记录都带有 Must-Play 标记；MC 分数可以低于 90，但仍用于排序和展示。
- 英文资料位于 `content/reviews/en/`，不在 `docs/` 下。
- `docs/games/` 公开文档只展示中文译文和必要的来源链接。
- 生成数据只包含游戏元数据和译文状态，不读取英文评测正文。
- 新增媒体时，确认游戏页标签、英文源文件、JSON 字段、生成数据和首页链接没有脱节。
- 不要重新引入已经迁移掉的 `ign_url`、`gamespot_url`、`famitsu_urls`、`unwinnable_urls` 等固定媒体字段。
- `npm run generate-data` 成功。
- `npm run typecheck` 成功。
- 没有未经用户要求的 Git 提交、推送、生产发布或本地生产构建。

> 下面的 2026-09-14 和 2026-09-15 交接内容属于迁移前历史记录；其中提及 CSV 的地方不再适用于当前数据层。

## 2026-09-14 评测媒体链接采集交接

本次任务是为 `data/metacritic-games.csv` 补充推荐媒体的评测 URL。用户只要求 URL，不要求新增媒体评分，也不要求抓取评测正文。

### 已完成

- 新增采集脚本：`scripts/collect-additional-review-links.mjs`。
- 脚本使用本机 HTTP 代理 `http://127.0.0.1:10809`，优先读取各媒体站点地图，逐行保存 CSV 检查点。
- CSV 仍有 164 条游戏记录，原有 IGN/GameSpot 字段未覆盖。
- 新增 7 个字段：`pcgamer_url`、`eurogamer_url`、`nintendolife_url`、`rockpapershotgun_url`、`rpgsite_url`、`adventuregamers_url`、`nintendoworldreport_url`。
- 当前非空数量：PC Gamer 75、Eurogamer 88、Rock Paper Shotgun 53、RPG Site 33、Adventure Gamers 1；Nintendo Life 0、Nintendo World Report 0。
- Nintendo Life 当前被 Cloudflare 拦截，无法通过脚本读取站点地图。Nintendo World Report 只抓到一个近期评测列表，当前收录的游戏没有通过自动匹配确认的链接。
- 采集只写入目标媒体域名的 URL；没有写入搜索页、评测正文或评分。
- 当前没有运行本地生产构建，没有执行 Git 提交或推送。工作区有未提交改动：上述 CSV 和采集脚本。

### 接手后必须先做

1. 检查 `git diff -- data/metacritic-games.csv`，确认 CSV 仍是 164 行、每行字段数一致，且 MC 分数与 `must_play` 没有被修改。
2. 对新增 URL 做人工或自动页面标题复核。当前脚本已经过滤多数新闻、预览、攻略和续作误匹配，但站点地图没有统一的文章类型，以下类型尤其要复核：
   - 基础游戏被匹配到 DLC/资料片，例如 `world-of-warcraft`、`the-elder-scrolls-v-skyrim`、`mass-effect-2`。
   - 基础游戏被匹配到重制版、增强版或新作，例如 `elden-ring`、`microsoft-flight-simulator`、`tiger-woods-pga-tour-2005`。
   - 被匹配到专题或衍生文章，例如 `red-dead-redemption-2` 的动物专题。
   - 同名或组合条目，例如 `bayonetta-plus-bayonetta-2`，除非页面明确评测整个组合，否则应留空。
3. 复核后清空无法确认的字段，不要用猜测链接补齐。Nintendo Life/Nintendo World Report 可以改用已通过验证码的浏览器手工查找；找不到就保留空白。
4. 如果要让网站首页显示这些新媒体，按本文件“让首页也支持新媒体”的规则继续改造：优先把生成数据统一成 `reviews: [{site, score, url}]`，再让首页和游戏页遍历媒体，而不是继续堆叠固定字段。
5. 修改网站后运行 `npm run generate-data` 和 `npm run typecheck`。除非用户明确要求，不运行本地生产构建、不提交、不推送。

### 采集脚本续跑

脚本参数为 `node scripts/collect-additional-review-links.mjs <start> <limit>`，例如从第 80 条开始处理 84 条：

```bash
node scripts/collect-additional-review-links.mjs 80 84
```

已有 URL 会跳过，CSV 每处理完一条记录就保存一次。脚本新增媒体字段只负责中间数据采集，尚未接入 `scripts/generate-games-data.mjs`、`src/pages/index.tsx` 或 `docs/games/_template.mdx`。

## 2026-09-15 进度交接（IGN / GameSpot 评测正文与译文）

本次任务：为全部收录游戏补全 IGN / GameSpot 评测正文并翻译上线。每完成一步都在本节更新。

### 已完成

- **自动标签页机制**：新增 `<ReviewTabs slug="…">` / `<ReviewTab site="…" label="…">` 组件（`src/components/ReviewTabs.tsx`，经 `src/theme/MDXComponents.tsx` 全局注册）。`scripts/generate-games-data.mjs` 会扫描各页 `<ReviewTab>` 块生成 `src/generated/reviews.json`，组件据此只渲染有译文的媒体；单媒体不显示标签栏。以后加新媒体只需加一个 `<ReviewTab>`。`docs/games/*.mdx`（含 `_template.mdx`）与 AGENTS.md 已改用该结构。
- **IGN 链接**：用 IGN 官方 sitemap（`scripts/collect-ign-links.mjs`）匹配，CSV 现 **142/164** 有 `ign_url`；84 条新链接已逐页核对游戏名，全部正确。
- **GameSpot 链接**：用浏览器抓取 GameSpot 的 17 个评测 sitemap（curl 被 Cloudflare 拦），`scripts/collect-gamespot-links.mjs` 匹配，CSV 现 **153/164** 有 `gamespot_url`。
- **IGN 英文源**：`content/reviews/en/<slug>.md` 共 **137** 篇。
- **IGN 中文译文**：`docs/games/` 已译 **136/137**（仅 `grand-theft-auto-san-andreas` 无 IGN 游戏评测——IGN 站内只有 2015 电影《末日崩塌》影评，已清空该 `ign_url`）。
- **GameSpot 英文源**：`content/reviews/en/<slug>/gamespot.md` 共 **148** 篇（浏览器抓取批次 1–20，`browsermcp`）。
- **GameSpot 中文译文**：已译 **144/148**，只剩 **4 篇**（`world-of-warcraft`、`world-of-warcraft-cataclysm`、`world-of-warcraft-the-burning-crusade`、`world-of-warcraft-wrath-of-the-lich-king`）未译。
- **文档**：`docs/games/*.mdx` 共 **155** 篇（+`_template.mdx`）。其中 52 篇补了 GameSpot 标签页，18 个只有 GameSpot 源的游戏新建了页面（脚本 `scripts/add-gamespot-tabs.mjs`）。
- **配图**：`static/img/reviews/<slug>.jpg` 共 **134** 张，插在各页 IGN 标签页顶部（`battlefield-2`、`freedom-force` 无图，`grand-theft-auto-san-andreas` 无 IGN 源）。Civ IV 的 IGN logo 占位图已换成正版封面，抓取脚本已加占位图防护（`scripts/collect-ign-reviews.mjs`、`scripts/collect-ign-images.mjs`）。
- **待办已记录**：图片 Cloudflare 加速（见上文「待办事项」）。

### 进行中 / 待办

1. **GameSpot 译文（仅剩 4 篇）**：`world-of-warcraft`、`world-of-warcraft-cataclysm`、`world-of-warcraft-the-burning-crusade`、`world-of-warcraft-wrath-of-the-lich-king`。方法：读 `content/reviews/en/<slug>/gamespot.md` → 翻成中文 → 替换 `docs/games/<slug>.mdx` 里 `<ReviewTab site="gamespot" label="GameSpot">` 的“GameSpot 中文译文待补。”占位。
2. **6 篇无 GameSpot 源的占位**：`big-walk`、`dave-the-diver`、`half-life-2-episode-two`、`satisfactory`、`the-witcher-3-wild-hunt`、`valheim` 的 GameSpot 标签页仍是“待补”，但它们没有 `gamespot.md`（JSON 里也没有 `gamespot_url`）。组件会自动隐藏该标签页，页面不受影响；如要整洁可手动删掉这几个空的 `<ReviewTab site="gamespot">` 块。
3. **页内图片（已放弃）**：用户曾要求采集评测页内的图片（跳过视频），但 IGN 的图在 JS 懒加载的 slideshow 里、GameSpot 的图在快照里只暴露文件名，`browsermcp` 又不支持 `javascript:`/`view-source:`、也没有取 HTML/eval 的工具，**当前工具链无法提取页内图片 URL**。用户 2026-09-15 决定放弃，不再采集页内图；每页仅保留 IGN 头图（`static/img/reviews/<slug>.jpg`）。若日后要做，可加装支持 `evaluate_script` 的 MCP（如 `chrome-devtools-mcp`）或本地 Playwright。
5. **仍未找到链接**（站内确实没有，保留空白）：
   - IGN 缺 22 条：`bayonetta-plus-bayonetta-2`、`chained-echoes`、`homeworld`、`sid-meiers-alpha-centauri`、`system-shock-2`、`the-sims`、`splinter-cell-chaos-theory`、`unreal-tournament-1999`、`against-the-storm`、`baldurs-gate`、`neverwinter-nights`、`planescape-torment`、`the-longest-journey`、`no-one-lives-forever`、`tiger-woods-pga-tour-2005`、`tony-hawks-pro-skater-2`、`ufo-50`、`black-and-white`、`deus-ex`、`silent-hunter-iii`、`slay-the-princess`、`riddick-butcher-bay`。
   - GameSpot 缺 11 条：`metroid-prime-remastered`、`bayonetta-plus-bayonetta-2`、`chained-echoes`、`the-witcher-3-wild-hunt`、`unreal-tournament-1999`、`against-the-storm`、`big-walk`、`satisfactory`、`dave-the-diver`、`half-life-2-episode-two`、`valheim`。
6. **发布**：全部完成后运行 `npm run generate-data` + `npm run typecheck`，交由用户决定是否提交/推送。

## 2026-09-15 最终复核与发布交接

- 用户确认保留现有自动媒体标签页机制；同一游戏继续使用一个页面，媒体数量可扩展。
- 已复核迁移前的 CSV 并生成 `data/metacritic-games.json`：当前 164 条记录、每个平台组合无重复；所有记录带有 `must_play=true`。
- 本次只检查既有链接，不再抓取新的评测正文。新增媒体 URL 中发现并清空 8 个明确误匹配字段（涉及 9 条记录）：Blue Prince 汇总文、Animal Well 汇总文、Resident Evil 4 旧版/高清版、Satisfactory Early Access、Tony Hawk's Pro Skater HD（两条）以及 Hades Early Access（两条记录）。
- 清理后保留可确认的推荐媒体 URL；Nintendo Life 与 Nintendo World Report 仍可为空，不用猜测链接补齐。
- GameSpot 仍有 4 篇英文源待翻译：`world-of-warcraft`、`world-of-warcraft-cataclysm`、`world-of-warcraft-the-burning-crusade`、`world-of-warcraft-wrath-of-the-lich-king`。另有 6 个没有 GameSpot URL/英文源的空标签页，组件会自动隐藏：`big-walk`、`dave-the-diver`、`half-life-2-episode-two`、`satisfactory`、`the-witcher-3-wild-hunt`、`valheim`。
- 生成数据和类型检查通过后，将当前工作区全部改动提交并推送到 `origin`；Cloudflare Pages 继续负责后续构建，不在本地运行生产构建。

### 相关脚本

- `scripts/collect-ign-links.mjs`：IGN sitemap 匹配 `ign_url`（`--write` 落库）。
- `scripts/collect-gamespot-links.mjs`：GameSpot sitemap 匹配 `gamespot_url`（`--write` 落库）。
- `scripts/collect-ign-reviews.mjs`：抓 IGN 正文到 `content/reviews/en/<slug>.md`（`--force` 覆盖）。
- `scripts/collect-ign-images.mjs`：抓 IGN 配图到 `static/img/reviews/` 并插图（`--force` 覆盖）。
- `scripts/wrap-review-tabs.mjs`：把旧文档包进 `<ReviewTabs>`（一次性迁移）。
- `scripts/normalize-review-tabs.mjs`：旧的标签页清理脚本，已被组件机制取代。

## 2026-09-16 数据层与首页复核

- AI 与抓取工具的交换层已从 `data/metacritic-games.csv` 迁移为 `data/metacritic-games.json`；CSV 已删除，不再作为主数据源。
- JSON 使用稳定对象字段：数值为 number、`must_play` 为 boolean、缺失数值为 `null`，并保留推荐媒体 URL 字段；`scripts/data-store.mjs` 统一负责读写。
- `npm run validate-data` 会检查字段、类型、重复的 `slug + platform` 和 URL 形状；当前 189 条记录通过校验。
- 网站本身不需要运行时数据库。Docusaurus/Cloudflare Pages 是静态构建，构建时从 JSON 生成 `src/generated/games.json` 即可；SQLite 暂不引入。
- 收录规则已改为 `must_play=true`，MC 分数只用于展示和排序，不再要求 ≥90。`scripts/collect-metacritic-intersection.mjs` 已确认并使用 PC、Nintendo Switch、Nintendo Switch 2、Game Boy Advance、Nintendo DS、3DS 的实际路径；Metacritic 当前没有 SFC/SNES 平台页。
- 首页已移除“按平台找到想玩的游戏，再按评分或出版年份浏览。”和每个条目下的“中文译文已收录”。GameSpot 评分从 `content/reviews/en/<slug>/gamespot.md` 的 frontmatter 回填到 JSON，当前 153 条 GameSpot 链接有评分。
- 本次验证：`npm run validate-data`、`npm run generate-data`、`npm run typecheck` 通过；未运行本地生产构建、未提交或推送。

## 2026-09-16 Metacritic 扩展采集

- 当前收录门槛：Metacritic 页面带有 Must-Play 标记即可，MC 分数不再设置 90 分下限；分数仍用于首页显示和排序。
- 已确认可用的平台路径：`pc`、`nintendo-switch`、`nintendo-switch-2`、`game-boy-advance`、`nintendo-ds`、`3ds`。
- 不要使用 `super-nintendo` 或 `snes`：这些路径虽然可能返回 HTTP 200，但页面会回退为全平台榜单，Metacritic 当前没有 SFC/SNES 平台筛选。
- 采集命令为 `node scripts/collect-metacritic-intersection.mjs`，脚本默认使用 `http://127.0.0.1:10809`；也可以通过 `GAME_PLAYBOOK_HTTP_PROXY` 覆盖代理地址。
- 采集脚本会替换 JSON 中的候选游戏集合，同时只按精确的 `title + platform` 保留已有 IGN、GameSpot、推荐媒体 URL 和内容状态，避免跨平台误继承。采集完成后必须依次运行 `npm run validate-data`、`npm run generate-data`、`npm run typecheck`。
- 本次采集已完成：PC 130、Nintendo Switch 25、Nintendo Switch 2 9、Game Boy Advance 14、Nintendo DS 6、3DS 5，共 189 条。新增的 GBA、NDS、3DS 条目暂不继承其他平台的媒体链接，需后续单独核对。
- 本次采集后仍有 176 条 GameSpot URL（其中 153 条已有评分）、153 条 IGN URL；当前平台页返回的 Must-Play 条目最低分为 90，但 90 分不是收录条件。
- 本次采集后的 `npm run validate-data`、`npm run generate-data`、`npm run typecheck` 均已通过；尚未提交或推送本轮采集结果。

## 2026-09-15 新增平台评测入口补采

- 已对新增的 GBA、Nintendo DS、3DS 条目运行 IGN 与 GameSpot 评测入口匹配；只写入评测 URL，不抓取正文，也不改动 Metacritic 分数或 Must-Play 状态。
- 当前 JSON 共 189 条：IGN URL 153 条，GameSpot URL 176 条（其中 153 条已有评分）。新增平台的 IGN/GameSpot 链接分别为 12/25、23/25；无法确认的链接保留为空。
- IGN 采集脚本中的 `grand-theft-auto-san-andreas` 误匹配例外已移除；该条目的 IGN URL 保持为空，因为候选文章不是游戏评测。
- GameSpot 的同名复刻/多平台评测优先保留站点地图匹配到的游戏评测入口；若无法确认具体版本，不要凭标题相似度手工补链。
- 之后重新运行 Metacritic 采集时，GBA、Nintendo DS、3DS 的已有媒体链接也会按精确的标题+平台保留；不要改回按 slug 跨平台继承。
- 本轮变更尚未提交或推送。交付前运行 `npm run validate-data`、`npm run generate-data`、`npm run typecheck`，确认后再由用户决定是否发布。
- 已于本轮再次执行完整分页复核：脚本不是测试采样，而是从第 1 页持续抓取到空页；PC 共 7 页（130 条），Nintendo Switch 共 2 页（25 条），Nintendo Switch 2/GBA/NDS/3DS 各 1 页（9/14/6/5 条），合计 189 条 Must-Play。

## 2026-09-15 媒体来源结构迁移（当前交接）

- 用户要求先整理结构，再继续采集 4Gamer、法米通等新媒体；本节记录迁移结果，迁移完成前不要继续联网采集。
- `data/metacritic-games.json` 已从固定的 `ign_url`、`gamespot_url`、推荐媒体字段及 `famitsu_urls` / `unwinnable_urls` 迁移为统一的 `sources` 数组。当前仍是 189 条平台记录，媒体来源总数为 611 条。
- 来源对象结构为 `{site, kind, language, score, url}`。同一 `slug` 可以有多个同站文章，也可以在多个平台记录中复用相同文章；不要因为 URL 重复就跨游戏合并。
- 新增 `scripts/media-sources.mjs`，提供 `getSources`、`addSource`、`hasSource` 和来源规范化；IGN、GameSpot、推荐媒体采集脚本已改为使用这些函数。
- 新增一次性迁移脚本 `scripts/migrate-media-sources.mjs`；它已运行完毕，不要再次用旧字段覆盖 JSON。155 个公开文档的 frontmatter 已移除 IGN/GameSpot 固定字段，正文译文和标签页未改动。
- `scripts/generate-games-data.mjs` 已生成通用 `sources`；首页已遍历所有来源，因此后续新增媒体无需再改首页的固定字段。
- `scripts/validate-games-data.mjs` 已改为校验来源数组、来源类型、URL、评分和同一条记录内的重复来源。
- 本阶段验证已完成：`npm run validate-data`、`npm run generate-data`、`npm run typecheck`、`git diff --check` 和全部改动脚本的 `node --check` 均通过；未运行本地生产构建。
- DeepSec 离线扫描 `scripts/` 与 `src/` 未发现安全问题。
- `README.md` 已补充 `sources` 数据结构说明，方便新 AI 接手时先理解数据入口。
- 当前来源统计：IGN 153、GameSpot 176、Unwinnable 30、Eurogamer 88、RPG Site 33、PC Gamer 75、Fami通 2、Rock Paper Shotgun 53、Adventure Gamers 1；同一条记录内无重复来源。
- 结构现已稳定，可以继续采集 4Gamer、法米通历史文章等；新链接直接用 `addSource` 写入 `sources`，文化评论使用 `kind: essay` 或 `kind: feature`，没有评分使用 `score: null`。
- 当前工作区有未提交改动，包含数据结构迁移、首页媒体遍历、采集脚本更新、模板更新以及此前纠正的 Unwinnable 关联；提交和推送需等用户明确要求。

## 2026-09-15 BrowserMCP 与文化媒体链接采集

- BrowserMCP 已配置到 Codex 全局 MCP，并已确认连接到用户配置的浏览器标签页；可以读取此前被内置浏览器拦截的 Unwinnable 站点地图。
- 当前下一步是从 Unwinnable 的文章站点地图中，为现有 189 条 Must-Play 游戏匹配明确相关的评测、文化评论或专题 URL。
- 只采集文章入口 URL，不抓取正文；必须人工或规则复核文章确实对应具体游戏，不能仅凭相似词或站点地图顺序猜测。
- 本轮新增媒体链接应写入 `data/metacritic-games.json`，不恢复 CSV 主数据层；如新增媒体字段，需同步更新数据校验、生成数据和首页的可扩展媒体结构。
- Unwinnable 完成后再依次处理 4Gamer.net、法米通、RPG Site/RPGFan、Rock Paper Shotgun；Paste Magazine 仍因 Cloudflare 直接阻断而暂缓。
- Unwinnable 站点地图初筛已完成：`post-sitemap.xml` 至 `post-sitemap8.xml` 共读取 7,357 个文章 URL；按游戏标题与 URL slug 的规则得到 62 个候选游戏，但其中含有同词误匹配，当前没有写入 JSON。
- 初筛结果必须逐条确认文章标题和内容确实指向具体游戏后才能落库；尤其要排除新闻、预告、攻略、续作/重制版错配和普通词误匹配。
- 本轮已逐页复核并确认 27 个 Unwinnable 文章 URL，涉及 25 个游戏 slug；内容类型以文化评论/专题为主，也包含少量评测性质长文。`Hades`、`Mina the Hollower`、`Resident Evil Requiem` 等跨平台记录按相同游戏同步关联。
- Unwinnable 允许一款游戏关联多篇文章，因此使用可扩展的 `unwinnable_urls` 数组，而不是单一字符串字段；数组中的链接必须是已复核的文章入口。
- 已明确排除：同名词误匹配、新闻/预告/攻略、只谈续作或其他版本的文章，以及无法确认与收录游戏直接相关的 URL。
- 已落库 27 个唯一 Unwinnable URL，覆盖 28 条平台记录；现有 189 条游戏记录和 IGN/GameSpot/推荐媒体字段未改变。`unwinnable_urls` 当前作为交换层字段，尚未接入首页展示或译文标签页。
- 后续若要在网站前台展示 Unwinnable，优先把它转换为通用 `sources: [{site, kind, language, score, url}]` 结构，并让生成数据和首页遍历媒体；不要继续增加更多固定的 `xxx_url` 展示分支。
- 4Gamer.net 的 `/sitemap.xml` 已确认 404，`robots.txt` 也未声明 sitemap；法米通 `robots.txt` 声明了 `sitemap.xml` 和 `newsSitemap.xml`。BrowserMCP 直接打开法米通 XML 会超时/不可自动化，但通过现有本机代理读取响应头确认可访问，后续可用代理读取 XML 内容。
- 法米通 `sitemap.xml` 是索引，`newsSitemap.xml` 当前仅提供 90 篇最新文章且没有可用的历史分页；通过代理读取 XML 并逐页确认后，仅将一篇明确对应现有目录的《UNDERTALE》作品专题加入 `famitsu_urls`。原版《Persona 5》十周年文章因目录只有《Persona 5 Royal》而未关联，避免版本错配。
- 本轮数据层校验已通过：`npm run validate-data` 成功，JSON 仍为 189 条记录；当前校验脚本仍检查既有 21 个稳定字段，`famitsu_urls` 与 `unwinnable_urls` 作为新增的可选数组字段保留，后续接入通用来源结构时再统一校验。
- 版本匹配规则已明确：媒体没有皇家版、重制版或增强版的对应文章时，允许将原版文章关联到当前收录的对应版本；若该媒体存在明确的对应版本文章，则优先使用对应版本，不得无条件混用原版链接。
- 按用户补充规则，法米通《Persona 5》十周年专题已关联到 `persona-5-royal`；该例仅因当前法米通未发现 Royal 专属文章。此前误以为版本不匹配的判断已撤销。
- 修复新增法米通字段后的 JSON 逗号问题，`npm run validate-data` 重新通过。
- 已更新 `scripts/generate-games-data.mjs`，生成数据现在保留每条记录的 `famitsuUrls` 与 `unwinnableUrls` 数组；`npm run generate-data` 已成功执行。首页暂未展示这两类链接，避免在翻译内容尚未准备好时增加前台噪音。
- `npm run typecheck` 已通过；本轮未运行本地生产构建，仍由 Cloudflare Pages 负责构建。

## 2026-09-15 首页平台筛选与重复条目

- 首页布局增加 `scrollbar-gutter: stable`，并将游戏卡片网格列设置为 `minmax(0, 1fr)`，避免筛选结果改变导致滚动条出现/消失时页面宽度跳动，也避免长标题撑开网格。
- 首页渲染前按 `slug` 合并平台记录；“全部平台”只显示一张卡片，平台以 `PC · Nintendo Switch` 形式合并展示。选择具体平台时先筛选原始平台记录，再按 slug 合并，因此该平台的 MC 分数和媒体链接优先保留。
- 合并后的总数、中文译文数和当前显示数均按去重后的游戏计算；数据层仍保留每个平台独立记录，不修改 Metacritic 原始平台数据。
- 本轮首页改动后 `npm run typecheck` 已通过；按约定未运行本地生产构建，待用户在 Cloudflare Pages 上预览确认视觉效果。
- 最终差异检查通过；当前生成数据为 189 条平台记录、182 个去重后的游戏，首页合并后不再重复显示 7 条跨平台重复记录。
- 用户反馈 PC、Nintendo Switch 与“全部平台”切换时仍有页面宽度差异，而新增小平台与“全部平台”一致。仅依靠 `scrollbar-gutter` 在目标浏览器中未完全稳定；已将 `src/css/custom.css` 的根元素改为 `overflow-y: scroll` 并保留 `scrollbar-gutter: stable`，强制所有筛选状态使用相同的纵向滚动条槽位。待 Cloudflare Pages 重新构建后复核。
- 进一步检查截图和线上 DOM 后确认还有更主要的原因：Docusaurus 的 `.main-wrapper` 是 flex 容器，`.shelf` 只有 `max-width` 时会作为 flex 子项受内容固有宽度影响。已给 `src/pages/index.module.css` 的 `.shelf` 增加 `width: 100%`，保持 `max-width: 1120px`，使筛选状态不再改变主容器宽度；滚动条修复仍保留作为第二层保障。

## 2026-09-15 GitHub 发布与下一步

- 首页合并平台记录、稳定滚动条占位、Unwinnable/法米通数据字段及生成校验逻辑已提交并推送到 `origin/main`。
- 发布提交：`1030935`（`Refine catalog merging and media data`）。Cloudflare Pages 应会根据 GitHub 推送自动触发构建；本地没有运行生产构建。
- 下一步优先在 Cloudflare Pages 预览环境确认首页筛选宽度和合并卡片的视觉效果；若显示符合预期，再继续采集 4Gamer.net（无 sitemap，需站内搜索/搜索引擎）和法米通历史文章。
- 新增媒体链接继续先落到 JSON 交换层；媒体数量继续增加前，优先把现有固定媒体字段逐步统一到 `sources: [{site, kind, language, score, url}]`，再接入首页的通用媒体链接展示。
- 开始结构迁移前复核发现，早先补 Unwinnable 数组时有 3 个上下文不唯一的补丁误把链接写到 Super Mario Odyssey、Shovel Knight: Treasure Trove、Batman: Arkham City；已在迁移前纠正，并补回 Elden Ring、Resident Evil 4、Resident Evil Requiem 的正确记录。后续批量结构转换必须使用脚本按 `slug + platform` 操作并立即校验目标关联。

## 2026-09-15 Cloudflare Pages 发布验证

- `b48d36a` 已推送到 `origin/main`，Cloudflare Pages 已自动触发生产部署。
- Cloudflare 构建命令 `npm run build` 成功；Docusaurus 静态文件生成、资产上传和生产发布均成功。
- 最新部署预览地址为 `https://df07fc74.game-playbook.pages.dev/`，生产域名 `https://game-playbook.amamiyayuuko.com/` 已可访问。
- 本地未运行生产构建；后续视觉复核应直接在 Cloudflare Pages 生产站点进行。
