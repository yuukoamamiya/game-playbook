# 待办事项

本清单只记录尚未完成的采集、核对和维护工作；已完成工作的摘要见 `docs/agent-history.md`，历史细节见 git 记录。更新时间：2026-09-17。

## 评分待核对

以下入口已有文章，但 source 的 `score` 仍为空。只有在原文章明确给出评分时才补入；没有评分的文章保持 `null`。

- **IGN（6 条）**：`mario-and-luigi-superstar-saga`、`grand-theft-auto-vice-city`、`sid-meiers-civilization-iv`、`grand-theft-auto-iii`、`warcraft-iii-reign-of-chaos`、`freedom-force`。
- **Eurogamer（6 条）**：`tetris-effect-connected`、`baldurs-gate-3`、`half-life-2`、`batman-arkham-asylum`、`dota-2`、`half-life-2-episode-two`。其中部分是非传统评分评测或文章，需要先确认页面是否实际给分。

4Gamer、Rock Paper Shotgun、Unwinnable、Aftermath 及学者个人文章目前没有确认到可直接归入对应入口的数字评分，没有明确评分时不补猜测值。

## 其他未完成工作

- 继续复核 `sources[].kind`，特别是 DLC、资料片、重制版、皇家版、加强版、合集和跨版本文章，确保 `review` 精确对应当前条目；不精确时改为合适的 `feature` 或 `essay`。
- 复核同一 URL 被多个平台记录复用的情况，确认文章与各平台条目的对应关系没有误导性。
- 4Gamer 采集结果尾部仍带有“関連情報”链接列表（与既有文件一致），后续可统一收紧正文边界。
- 新增媒体时同步维护主数据、英文源、中文页面的 `ReviewTab`、首页媒体名称映射和生成流程。
- 后续可评估使用 Cloudflare Worker 代理 GitHub Raw 图片并设置缓存，在上线前不要删除仓库内图片。
