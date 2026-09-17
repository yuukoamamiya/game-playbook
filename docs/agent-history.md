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

## 部署

- GitHub 与 Cloudflare Pages 已连通，Cloudflare 构建命令为 `npm run build`，输出目录为 `build`，Node.js 使用 20 或更高版本。
- 图片仍保留在 GitHub 的 `static/img/reviews/`；图片代理加速方案尚未实现，后续计划使用 Cloudflare Worker 从 GitHub Raw 读取并缓存。
