# Playbook / 游戏档案库

一个用于记录、筛选和查询个人游戏体验的 Docusaurus 站点。

## 内容存储位置

- `data/metacritic-games.json`：抓取和不同 AI 之间交换数据的主中间层，使用 JSON 避免 CSV 列错位。
- `data/metacritic-games.json` 中的媒体入口统一放在 `sources` 数组，每项记录站点、文章类型、语言、评分和 URL，同一媒体可有多篇文章。
- `content/reviews/en/`：英文评测资料，仅供 AI 翻译使用；它位于 `docs/` 之外，不会发布到网站。
- `docs/games/`：网站前台使用的中文译文，每款游戏一篇；页面内按媒体标签切换评测。
- `docs/games/_template.mdx`：新增游戏文档时使用的模板。
- `DESIGN.md`：给 AI 和后续维护者使用的视觉与内容规则。
- `AGENTS.md`：跨 AI 协作、内容边界、验证和交接规则。
- `TODO.md`：当前未完成的媒体正文、评分核对和其他维护事项。

## Cloudflare Pages

推荐配置：

- Build command：`npm run build`
- Build output directory：`build`
- Node.js version：`20` 或更高

站点配置和内容提交到 Git 后，由 Cloudflare Pages 自动构建发布。本地不需要执行生产构建。构建前会从 JSON 生成带有 Must-Play 标记的候选游戏数据，再根据 `docs/games/` 中是否存在对应译文标记状态。
