# Game Playbook 协作说明

这份文件是给参与本仓库的 AI、自动化工具和人类维护者看的。目标是让不同 AI 在切换后仍然遵守相同的数据边界、内容流程和部署约定。

## 项目目标

这是一个个人使用的 Docusaurus 游戏档案库，用来筛选和阅读 Metacritic 高分游戏，并集中保存 IGN 与 GameSpot 的评测入口和中文译文。

当前收录条件：

- Metacritic 总分不低于 90。
- 必须带有 Metacritic Must-Play 标记。
- 平台范围为 PC、Nintendo Switch、Nintendo Switch 2。

不要擅自放宽或改变这些条件。若需要改变，先在对话中说明影响。

## 内容分层

仓库中的内容分为三层，不要混用：

```text
data/metacritic-games.csv     抓取与 AI 之间交换数据的中间层
content/reviews/en/           英文评测资料，仅供 AI 翻译和整理
docs/games/                   网站前台公开的中文译文与媒体评测页
```

### `data/metacritic-games.csv`

- 保存游戏元数据、Metacritic 分数、Must-Play 状态、平台和评测链接。
- 是方便多个 AI 之间交换和批量处理的中间层。
- 不要把英文评测正文写进 CSV。
- 除非用户明确要求，不要擅自修改已有评分或伪造链接。

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
- 文档的 `slug` 必须与 CSV 中对应游戏的 `slug` 一致。
- 只有存在对应中文文档时，首页才显示“中文译文已收录”并提供站内链接。

## 新增媒体评测

一个游戏继续只使用一个公开页面。不同媒体的译文放在同一页面的标签页中，不要为同一游戏复制出 `ign`、`gamespot` 等多个 Docusaurus 页面。

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

示例：

```mdx
<ReviewTab site="eurogamer" label="Eurogamer">

这里填写 Eurogamer 中文译文。

<a href="https://example.com/review" target="_blank" rel="noreferrer">查看 Eurogamer 原文 ↗</a>

</ReviewTab>
```

### 让首页也支持新媒体

当前 CSV 和首页为了方便最初的 IGN / GameSpot 数据，使用了固定字段。新增媒体后，必须同步修改以下位置，不能只改游戏页：

1. `data/metacritic-games.csv`：增加该媒体的评分和链接字段，例如 `eurogamer_score`、`eurogamer_url`；已有行没有数据时留空。
2. `scripts/generate-games-data.mjs`：把新字段转成生成数据中的媒体记录。推荐逐步统一为 `reviews: [{site, score, url}]`，不要继续在首页组件里增加越来越多的单独字段。
3. `src/pages/index.tsx`：将固定的 IGN / GS 链接改为遍历 `reviews`，这样新媒体会自动出现在所有有链接的游戏卡片上。
4. `docs/games/_template.mdx`：补充新媒体的 `<ReviewTab>` 示例，或保留清晰的“可继续添加标签页”说明。
5. 若新媒体有英文源资料，按 `<slug>/<site>.md` 保存，并在对应标签页写中文译文；不要把英文源目录接入 Docusaurus。
6. 重新运行 `npm run generate-data` 和 `npm run typecheck`，检查首页链接和文档标签数量。

当媒体数量超过两个时，优先先完成 `reviews` 数组化，再添加更多媒体。不要在 `GameRecord`、CSV 映射和 JSX 中重复堆叠 `xxxUrl` / `xxxScore` / `xxxLink` 字段。

## 推荐工作流

处理一款新游戏时按以下顺序：

1. 确认它在 CSV 中满足 `metacritic_score >= 90` 且 `must_play=true`。
2. 补充 Metacritic、IGN 和 GameSpot 链接；找不到的链接留空并在 `notes` 说明。
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
- `src/generated/games.json` 是生成文件，不要手工维护内容；应修改 CSV、公开文档或生成脚本后重新生成。

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

- CSV 记录仍满足 MC 90+ 与 Must-Play 交集条件。
- 英文资料位于 `content/reviews/en/`，不在 `docs/` 下。
- `docs/games/` 公开文档只展示中文译文和必要的来源链接。
- 生成数据只包含游戏元数据和译文状态，不读取英文评测正文。
- 新增媒体时，确认游戏页标签、英文源文件、CSV 字段、生成数据和首页链接没有脱节。
- `npm run generate-data` 成功。
- `npm run typecheck` 成功。
- 没有未经用户要求的 Git 提交、推送、生产发布或本地生产构建。

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
2. **6 篇无 GameSpot 源的占位**：`big-walk`、`dave-the-diver`、`half-life-2-episode-two`、`satisfactory`、`the-witcher-3-wild-hunt`、`valheim` 的 GameSpot 标签页仍是“待补”，但它们没有 `gamespot.md`（CSV 里也没有 `gamespot_url`）。组件会自动隐藏该标签页，页面不受影响；如要整洁可手动删掉这几个空的 `<ReviewTab site="gamespot">` 块。
3. **页内图片（已放弃）**：用户曾要求采集评测页内的图片（跳过视频），但 IGN 的图在 JS 懒加载的 slideshow 里、GameSpot 的图在快照里只暴露文件名，`browsermcp` 又不支持 `javascript:`/`view-source:`、也没有取 HTML/eval 的工具，**当前工具链无法提取页内图片 URL**。用户 2026-09-15 决定放弃，不再采集页内图；每页仅保留 IGN 头图（`static/img/reviews/<slug>.jpg`）。若日后要做，可加装支持 `evaluate_script` 的 MCP（如 `chrome-devtools-mcp`）或本地 Playwright。
5. **仍未找到链接**（站内确实没有，保留空白）：
   - IGN 缺 22 条：`bayonetta-plus-bayonetta-2`、`chained-echoes`、`homeworld`、`sid-meiers-alpha-centauri`、`system-shock-2`、`the-sims`、`splinter-cell-chaos-theory`、`unreal-tournament-1999`、`against-the-storm`、`baldurs-gate`、`neverwinter-nights`、`planescape-torment`、`the-longest-journey`、`no-one-lives-forever`、`tiger-woods-pga-tour-2005`、`tony-hawks-pro-skater-2`、`ufo-50`、`black-and-white`、`deus-ex`、`silent-hunter-iii`、`slay-the-princess`、`riddick-butcher-bay`。
   - GameSpot 缺 11 条：`metroid-prime-remastered`、`bayonetta-plus-bayonetta-2`、`chained-echoes`、`the-witcher-3-wild-hunt`、`unreal-tournament-1999`、`against-the-storm`、`big-walk`、`satisfactory`、`dave-the-diver`、`half-life-2-episode-two`、`valheim`。
6. **发布**：全部完成后运行 `npm run generate-data` + `npm run typecheck`，交由用户决定是否提交/推送。

## 2026-09-15 最终复核与发布交接

- 用户确认保留现有自动媒体标签页机制；同一游戏继续使用一个页面，媒体数量可扩展。
- 已复核 `data/metacritic-games.csv`：164 条记录、21 列，每行字段数一致；所有记录仍满足 `metacritic_score >= 90` 且 `must_play=true`。
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
