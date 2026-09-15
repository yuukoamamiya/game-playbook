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
- 已完成 IGN、GameSpot 以及 PC Gamer、Eurogamer、RPG Site、Rock Paper Shotgun、RPGamer、4Gamer、Fami通、Unwinnable、Aftermath、The CRPG Addict、Radical Philosophy、Jesper Juul 等来源的部分链接采集。
- `indienova` 曾临时加入，因用户确认存在版权风险已全部删除；不要恢复。
- Early Access 评测可以保留。具体版本的评测仍需严格对应；文化评论、专题、历史回顾可以放宽版本对应。
- 已检查齐泽克、加洛维、东浩纪、杰斯伯·尤尔和伊安·博格斯特。当前只有加洛维和尤尔确认有文章可对应现有目录游戏；博格斯特的已确认文章对应目录外作品，因此没有落库。

## 部署

- GitHub 与 Cloudflare Pages 已连通，Cloudflare 构建命令为 `npm run build`，输出目录为 `build`，Node.js 使用 20 或更高版本。
- 图片仍保留在 GitHub 的 `static/img/reviews/`；图片代理加速方案尚未实现，后续计划使用 Cloudflare Worker 从 GitHub Raw 读取并缓存。
