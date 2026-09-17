# 待办事项

以下清单记录当前数据快照中已经收录文章入口、但英文正文文件尚未对应收录的文章，以及其他尚未完成的维护工作。入口和文章是否重复按 URL 判断。更新时间：2026-09-17。

## 已通过 curl 补采正文（2026-09-17）

下列媒体之前只有入口，现已用 `scripts/collect-media-reviews.mjs` 采集到 `content/reviews/en/`，入口和文章的对应关系按 URL 核对：

- **Unwinnable（25 篇）**、**Aftermath（3 篇）**、**Rock Paper Shotgun（4 篇）**、**Fami通（4 篇）**、**4Gamer（5 篇）**、**Jesper Juul（1 篇）**。

这些正文已翻译成中文并写入对应 `docs/games/<slug>.mdx` 的 `ReviewTab`（共 34 个页面、42 个标签页）；同一媒体有多篇文章时使用唯一 `id`（如 `unwinnable-2`、`rockpapershotgun-2`）并在标签名后加「· 2」。

采集方式说明：Unwinnable、Aftermath、Rock Paper Shotgun、Eurogamer、Game Studies、The Atlantic 直连会返回 403 或超时，需要走本地代理（脚本中标记 `proxy: true`）；Unwinnable 还会对并发请求返回 Cloudflare 403，需串行采集（`--concurrency=1`）。curl 不要加 `--ssl-no-revoke`，该参数会让 Cloudflare 拒绝请求。

## 已通过浏览器 MCP 补采正文（2026-09-17）

以下入口用 curl（含本地代理）无法获取正文，已改用 browser MCP 读取页面并补入 `content/reviews/en/`：

- **RPGamer（5 篇）**：`persona-5-royal` 的 [JRPG Study Time](https://rpgamer.com/2020/06/jrpg-study-time-persona-5-royal-is-a-tower-of-mechanics-that-never-topples/)（无数字评分）、`persona-4-golden` 的 [PC review](https://rpgamer.com/review/persona-4-golden-pc-review/)（4.5/5）和 [Vita review](https://rpgamer.com/review/persona-4-golden-review/)（5/5）、`the-elder-scrolls-iv-oblivion` 的 [retroview](https://rpgamer.com/review/the-elder-scrolls-iv-oblivion-retroview/)（4/5）、`fallout-3` 的 [review](https://rpgamer.com/review/fallout-3-review/)（5/5）。评分与原文一致。
- **GameSpot（1 篇）**：`tony-hawks-pro-skater-3` [review](https://www.gamespot.com/reviews/tony-hawks-pro-skater-3-review/1900-2820972/)（10/10 Essential）。复核后发现英文正文和页面译文其实都已存在，之前的清单是过期记录，本次无需改动。
- **IGN（1 篇）**：`mario-and-luigi-superstar-saga` [文章](https://www.ign.com/articles/2003/12/15/mario-luigi-superstar-saga)（视频评测短文，无数字评分），已填入页面 IGN 标签。

这些正文已翻译并写入对应页面：`persona-4-golden`、`persona-5-royal`、`the-elder-scrolls-iv-oblivion`、`fallout-3` 各新增 `rpgamer-2`（persona-4-golden 另有 `rpgamer-3`）标签；`mario-and-luigi-superstar-saga` 的 IGN 占位标签已替换为译文。

`mina-the-hollower` 的 [IGN 中国文章](https://www.ign.com.cn/mina-the-hollower/60328/ignwa-jue-zhe-mi-nuo-ping-ce-10-fen) 是中文原文，无需英文正文；对应的英文评测已经用于页面的 IGN 标签。

## 当前已确认有评分的媒体

以下媒体的评分已经写入主数据，首页会显示在对应文章入口后面。括号内为当前数据中的带评分 source 条目数（同一文章被多个平台复用时会分别计数）：

- **IGN（163）**
- **GameSpot（177）**
- **Eurogamer（92）**
- **RPGamer（18）**
- **RPG Site（34）**

当前收录的 4Gamer、Fami通、Rock Paper Shotgun、Unwinnable、Aftermath 及学者个人文章，尚未在主数据中确认到可直接归入对应入口的数字评分；没有明确评分时不补猜测值。

## 评分待核对

以下入口已有文章，但 source 的 `score` 仍为空。只有在原文章明确给出评分时才补入；没有评分的文章保持 `null`。

- **IGN（6 条）**：`mario-and-luigi-superstar-saga`、`grand-theft-auto-vice-city`、`sid-meiers-civilization-iv`、`grand-theft-auto-iii`、`warcraft-iii-reign-of-chaos`、`freedom-force`。
- **Eurogamer（6 条）**：`tetris-effect-connected`、`baldurs-gate-3`、`half-life-2`、`batman-arkham-asylum`、`dota-2`、`half-life-2-episode-two`。其中部分是非传统评分评测或文章，需要先确认页面是否实际给分。

## 其他未完成工作

- 继续复核 `sources[].kind`，特别是 DLC、资料片、重制版、皇家版、加强版、合集和跨版本文章，确保 `review` 精确对应当前条目；不精确时改为合适的 `feature` 或 `essay`。例如 Fami通 `persona-5-royal` 的《ペルソナ5》10 周年“今日は何の日”专栏，讨论对象是原版而非 Royal，需确认标签。
- 复核同一 URL 被多个平台记录复用的情况，确认文章与各平台条目的对应关系没有误导性。
- 4Gamer 采集结果尾部仍带有“関連情報”链接列表（与既有文件一致），后续可统一收紧正文边界。
- 新增媒体时同步维护主数据、英文源、中文页面的 `ReviewTab`、首页媒体名称映射和生成流程。
- 后续可评估使用 Cloudflare Worker 代理 GitHub Raw 图片并设置缓存，在上线前不要删除仓库内图片。
