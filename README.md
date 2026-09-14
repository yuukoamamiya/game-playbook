# Playbook / 游戏档案库

一个用于记录、筛选和查询个人游戏体验的 Docusaurus 站点。

## 内容存储位置

- `docs/games/`：每个游戏一篇 Markdown 文件，是后续维护的主要位置。
- `docs/games/_template.md`：新增游戏时复制的模板。
- `docs/criteria.md`：评分、状态和推荐等级说明。
- `DESIGN.md`：给 AI 和后续维护者使用的视觉与内容规则。

## Cloudflare Pages

推荐配置：

- Build command：`npm run build`
- Build output directory：`build`
- Node.js version：`20` 或更高

站点配置和内容提交到 Git 后，由 Cloudflare Pages 自动构建发布。本地不需要执行生产构建。
