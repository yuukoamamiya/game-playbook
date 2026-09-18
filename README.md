# Game Playbook / 游戏档案库

一个个人使用的 Docusaurus 静态网站，用来整理带有 Metacritic Must-Play 标记的游戏，并集中展示媒体评测、文化评论和中文译文。

网站按游戏页面组织内容。首页支持按游戏平台和媒体筛选，并显示 Metacritic、IGN、GameSpot、Eurogamer 等来源的评分和文章入口。

## 项目结构

- `data/metacritic-games.json`：游戏 × 平台的主数据，以及统一放在 `sources` 数组中的媒体文章入口。
- `src/generated/`：由主数据和英文来源生成的前台数据，不手工编辑。
- `content/reviews/en/`：英文来源正文，仅用于翻译、摘要和核对，不会随网站公开发布。
- `docs/games/`：公开的中文游戏页面，每个游戏一个页面，通过媒体标签切换译文。
- `static/img/reviews-webp/`：游戏页面使用的头图。
- `scripts/`：数据校验、生成、媒体采集和迁移脚本。
- `DESIGN.md`：网站视觉和内容规则。
- `AGENTS.md`：仓库结构、修改方式和协作约定。
- `TODO.md`：当前尚未完成的文章正文、评分核对和其他维护事项。

## 本地开发

需要 Node.js 20 或更高版本。

```bash
npm install
npm run start
```

打开终端显示的本地地址即可预览网站。

常用检查命令：

```bash
npm run validate-data
npm run generate-data
npm run typecheck
npm run build
```

修改数据、脚本或网站后，至少运行前三项；需要验证完整静态站点时再运行 `npm run build`。

## Cloudflare Pages

推荐配置：

- Build command：`npm run build`
- Build output directory：`build`
- Node.js：`20` 或更高版本

建议在 Cloudflare 的构建环境变量中设置 `SITE_URL`，例如 `https://example.com`。它用于生成 canonical URL、sitemap 和社交分享元数据；本地构建未设置时默认使用 `http://localhost:3000`。

将改动推送到 GitHub 后，由 Cloudflare Pages 根据项目配置构建和发布网站。
