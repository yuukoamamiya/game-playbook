# Playbook / 游戏档案库

一个用于记录、筛选和查询个人游戏体验的 Docusaurus 站点。

## 内容存储位置

- `data/metacritic-games.csv`：抓取和不同 AI 之间交换数据的中间层。
- `docs/games/`：网站真正使用的游戏文档，每款游戏一篇。
- `docs/games/_template.mdx`：新增游戏文档时使用的模板。
- `docs/criteria.md`：高分游戏的收录说明。
- `DESIGN.md`：给 AI 和后续维护者使用的视觉与内容规则。

## Cloudflare Pages

推荐配置：

- Build command：`npm run build`
- Build output directory：`build`
- Node.js version：`20` 或更高

站点配置和内容提交到 Git 后，由 Cloudflare Pages 自动构建发布。本地不需要执行生产构建。构建前会从游戏文档生成首页橱窗数据。
