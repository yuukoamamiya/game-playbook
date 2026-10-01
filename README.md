# Playbook / 游戏档案

给自己留的一份游戏档案。把值得记住的游戏收进来，一个游戏一页：上面是 Metacritic 的资料和外部评测入口，下面是核对过的中文译文。收录的要么是 Metacritic 的 Must-Play，要么是自己想留的。

内容其实是三层：`data/metacritic-games.json` 是唯一的事实来源（游戏、平台、评分、媒体链接都在这），`content/reviews/en/` 放翻译用的英文原文，`docs/games/` 是发出去的中文页面。首页和搜索要用的数据在构建时从这几层生成，网站本身没有数据库。

## 本地跑起来

需要 Node.js 22 或更高版本。

```bash
npm install
npm run start
```

浏览器打开终端里给出的地址就能预览，改文件会热更新。

改完数据、脚本或页面，记得验一遍：

```bash
npm run verify
```

它会依次检查数据、重新生成前台数据、检查脚本语法和类型。要验证完整静态构建再跑 `npm run build`（产物在 `build/`，不提交）。

## 目录里都有什么

- `data/` — 主数据，所有游戏事实都只在这维护
- `content/reviews/en/` — 英文原文，只用来翻译核对，不会发布
- `docs/games/` — 中文游戏页面，一个游戏一页，页内按媒体切换译文
- `static/img/reviews-webp/` — 页面头图
- `scripts/` — 校验、生成和采集脚本，`scripts/archive/` 里是已经用过的一次性脚本
- `AGENTS.md` — 字段含义、日常维护步骤和协作约定（要动这个仓库，先读它）
- `DESIGN.md` / `TODO.md` — 视觉规则 / 待办

## 部署

推送到 GitHub 后交给 Cloudflare Pages 构建，配置：

- Build command：`npm run build`
- Build output directory：`build`
- Node.js：`22` 或更高

站点地址默认是 `https://game-playbook.amamiyayuuko.com`，canonical、sitemap 和分享卡片都用它。换域名或构建预览时，用环境变量 `SITE_URL` 覆盖即可。
