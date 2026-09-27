# 待办事项

本清单只记录尚未完成的采集、核对和维护工作；已完成工作的摘要见 `docs/agent-history.md`，历史细节见 git 记录。更新时间：2026-09-27。

## 评分核对

2026-09-27 已逐条核对此前清单中的 IGN 6 条与 Eurogamer 6 条入口，结论如下：

- IGN：`sid-meiers-civilization-iv` 原文给出 Overall 9，已补入 `score: 9`；`grand-theft-auto-vice-city`、`grand-theft-auto-iii` 明确声明不再给出新评分；`mario-and-luigi-superstar-saga` 为视频评测短文；`freedom-force` 正文未给出数字评分。这些没有明确评分的入口保持 `null`。
- `warcraft-iii-reign-of-chaos` 的 IGN 链接实为前瞻/预览汇编而非评测，已将其 `kind` 改为 `feature`，不补评分。
- Eurogamer：`tetris-effect-connected`、`baldurs-gate-3` 等已确认不采用数字评分；`batman-arkham-asylum` 为“2009 年游戏回顾”专题；其余入口正文没有可直接归入的数字评分，均保持 `null`。

只有在原文明示评分时才补入，没有明确评分时不要补猜测值。

## 其他未完成工作

- 继续复核 `sources[].kind`，特别是 DLC、资料片、重制版、皇家版、加强版、合集和跨版本文章，确保 `review` 精确对应当前条目；不精确时改为合适的 `feature` 或 `essay`。
- 复核同一 URL 被多个平台记录复用的情况。已确认同一作品多平台记录（PC/Switch/Switch 2）及基础版与升级版记录共用评测 URL 属预期行为，首页会按 `site` + `url` 去重；仅 `half-life-2` 上的 Eurogamer 文章实为《第二章》评测，已在标签和说明中标注版本。
- 新增媒体时同步维护主数据、英文源、中文页面的 `ReviewTab`、首页媒体名称映射和生成流程。
