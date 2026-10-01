# Game Playbook 维护说明

## 仓库用途

个人使用的 Docusaurus 静态网站，把值得留档的游戏和它们的媒体文章整理成一份可检索的档案。每个游戏一个中文页面，汇总 Metacritic 资料、外部评测/评论入口和核对过的中文译文。

网站不使用运行时数据库。主数据、英文来源和中文页面都保存在仓库中，网站构建时生成前台所需的数据文件。

### 收录范围

满足下面任意一条就可以收录，由用户最终判断，拿不准就问，不要自行扩大或缩小：

- Metacritic 带 Must-Play 标记的游戏；
- 用户点名要加的作品，不要求 Must-Play，也不限平台。

`must_play` 只是"已收录"标记，当前恒为 `true`；记录是怎么进来的看 `content_status`，不要用 `must_play` 区分来源。

### 维护原则

- 主数据是唯一事实源：游戏事实只改 `data/metacritic-games.json`，其它地方不要重复维护。
- 用户指令优先于本文件的默认规则；两者冲突时按用户说的做，拿不准先问。
- 不知道的信息留空或填 `null`，不要编造评分、日期或链接。
- 每次改完跑 `npm run verify`，并确认 `src/generated/` 没有意外改动。
- 除非用户明确要求，不自动提交、推送或发布。

## 目录结构

```text
data/metacritic-games.json       主数据：游戏 × 平台记录及 sources
src/generated/                   由主数据和英文源生成的前台数据，不手工编辑（含 games、reviews 和媒体名称映射）
src/pages/index.tsx              首页：合并游戏记录、筛选、评分和媒体入口
src/pages/index.module.css       首页样式
src/components/                  可复用 React 组件，例如 ReviewTabs
src/theme/                       Docusaurus 主题组件注册
content/reviews/en/              私有英文来源，不会随 docs 发布
docs/games/                      公开的中文游戏页面，每个 slug 一页
static/img/reviews-webp/         游戏页面使用的头图
scripts/                         数据校验、生成和仍在使用的采集脚本
scripts/archive/                 已完成的一次性迁移/批处理脚本，仅作历史参考，不再运行
.github/workflows/ci.yml         持续集成：数据校验、生成物漂移、类型检查和脚本语法
DESIGN.md                        网站视觉和内容规则
TODO.md                          当前未完成的采集、核对和维护事项
docs/agent-history.md            历史决策记录，不作为当前待办清单
```

## 任务速查

| 要做的事 | 主要改这些 | 相关命令 |
| --- | --- | --- |
| 收录一个 Must-Play 游戏 | `data/metacritic-games.json` + 新建 `docs/games/<slug>.mdx` + 头图 | `node scripts/collect-game-images.mjs`、`npm run verify` |
| 收录用户点名的作品 | 同上，记录设 `content_status: manually-added` | `npm run verify` |
| 给已有游戏加文章入口 | `data/metacritic-games.json` 的 `sources` | `npm run verify` |
| 采集英文正文 | `content/reviews/en/` | `node scripts/collect-media-reviews.mjs` |
| 翻译进页面 | `docs/games/<slug>.mdx` 里的 `ReviewTab` | `npm run verify` |
| 改首页 / 筛选 / 排序 | `src/pages/index.tsx` 及样式 | `npm run verify` |
| 改视觉 | `src/css/custom.css`、`DESIGN.md` | `npm run build` |
| 改数据校验或生成逻辑 | `scripts/validate-games-data.mjs`、`scripts/generate-games-data.mjs` | `npm run verify` |

## 数据和内容职责

`data/metacritic-games.json` 是唯一主数据层。一条记录 = 一个游戏在一个平台上的 Metacritic 条目，同一游戏可以有多条平台记录。媒体文章统一放在 `sources` 数组里，不要为某个媒体新增顶层字段。游戏事实（平台、评分、年份、链接）只写在这里，其它地方都不要重复维护。

### 记录字段

| 字段 | 说明 |
| --- | --- |
| `slug` / `platform` | 记录主键（小写连字符 slug + 平台），同一 `slug` 可对应多个平台 |
| `title` | 英文原名，用于比对和显示回退 |
| `metacritic_score` / `release_year` | 显示和排序用，缺失填 `null` |
| `must_play` | 收录标记，当前恒为 `true` |
| `page_slug` | 该记录并入别的共用页面时，指向那个页面的 slug（见下） |
| `metacritic_url` | 只有 `manually-added` 记录允许为空 |
| `content_status` | 来源溯源，仅元数据，不参与前台逻辑 |
| `genre` | 保留字段，通常为空，暂未采集 |
| `notes` | 人可读的收录说明（Metacritic 来源页码等） |
| `sources` | 媒体文章入口数组 |

`content_status` 取值：`metacritic-must-play`（Must-Play 扫描直接新增）、`metacritic-filtered`（早期分数筛选遗留）、`links-collected`（已补采集链接）、`manually-added`（手动收录，通常就是用户点名）。历史上按 Metacritic 翻页用的 `page` 字段已移除，页码只保留在 `notes`。

### source 字段

| 字段 | 说明 |
| --- | --- |
| `site` | 稳定小写标识；新增时同步在 `scripts/media-sources.mjs` 的 `mediaLabels` 补显示名，否则校验告警 |
| `kind` | `review`、`essay`、`feature` 或 `score` |
| `language` | 通常 `en`，日文等来源用对应代码 |
| `score` | 0–10，不知道就用 `null`，不要猜 |
| `url` | 文章最终地址 |
| `filter_group` | 可选，仅用于首页筛选分类，不改原始 `site` |

`filter_group` 只标记符合条件的单篇文章，例如确认是学者个人文章时设为 `scholar`；不要因为某家媒体发过一篇学者文章就把该媒体所有文章都归进去。首页按 `filter_group`（存在时）或 `site` 生成筛选项，卡片仍显示原始媒体名。

### 版本处理

- 同一作品因平台升级版、发行版本不同而出现多个 Metacritic 条目时，在非主记录上设 `page_slug` 指向共用的中文页面；各条记录保留自己的 `slug`、平台评分和 `sources`。
- 如果列表里只有某个特定版本，其他版本、DLC、重制版、皇家版、加强版或合集的文章，确认相关后可以作为补充来源，但标签或说明里要写明实际对应哪个版本，也不能把补充文章的评分当成当前版本的评分。
- 真正不同的 DLC、资料片或重制作品，不要只凭名字相似就合并；版本关系不明确时先不收。
- 文化评论、设计分析和历史回顾，在明确讨论该作品时可以用 `essay` 或 `feature`。

### 生成物和英文来源

`src/generated/games.json` 和 `src/generated/reviews.json` 都是生成文件，改完主数据或英文源后运行 `npm run generate-data`，不要直接编辑。

英文来源放在 `content/reviews/en/`，只用于翻译、摘要和核对；公开内容放在对应的 `docs/games/<slug>.mdx`。命名约定：新记录统一存为 `content/reviews/en/<slug>/<site>.md`；早期记录的主来源（基本是 IGN）是扁平的 `content/reviews/en/<slug>.md`，保留现状、不要搬迁。同一媒体有多篇时文件名要能区分文章，中文页 frontmatter 的 `source_file` 指向该页实际使用的那份，校验会检查它存在。一个游戏只有一个公开页，多个媒体通过 `ReviewTabs` / `ReviewTab` 切换，同一媒体多篇时为每个标签设唯一 `id`。

## 常见修改方式

### 收录用户点名的作品

1. 在 `data/metacritic-games.json` 新建记录，`content_status: manually-added`、`must_play: true`；没有 Metacritic 条目时 `metacritic_url` 留空、`metacritic_score` 填 `null`。
2. 从 `docs/games/_template.mdx` 复制出页面，文件名与 `slug` 一致。
3. 补 `sources`（用户给的文章优先）和头图，再翻译。
4. 运行 `npm run verify`。

### 修改游戏和媒体入口

1. 在 `data/metacritic-games.json` 中按 `slug` 和 `platform` 找到记录。
2. 核对文章最终 URL、文章类型、语言、对应作品/版本和评分。
3. 用 `scripts/media-sources.mjs` 的 `addSource` / `hasSource` 或相应采集脚本写入 `sources`，避免重复 URL。
4. 运行数据校验和生成命令。

只做入口时保存并核对 URL 即可，不抓正文；需要翻译时再存英文源并改公开页面。搜索结果页、新闻、攻略、宣传稿和只是顺带提到游戏的文章都不算评测入口。

### 采集英文正文

正文用 `scripts/collect-media-reviews.mjs` 采集到 `content/reviews/en/`，只用于翻译和核对，不进入前台。脚本按站点配置正文边界，已知约束：

- Unwinnable、Aftermath、Rock Paper Shotgun、Eurogamer、Game Studies、The Atlantic 直连会返回 403 或超时，在脚本里标记 `proxy: true`，需要本地代理（v2rayN）在运行。
- Unwinnable 对并发请求会返回 Cloudflare 403，用 `--concurrency=1` 串行采集。
- curl 不要加 `--ssl-no-revoke`，该参数会让 Cloudflare 拒绝请求。
- curl 加代理仍取不到正文的页面（例如 RPGamer），改用浏览器 MCP（Browser MCP 扩展 + opencode 的 `browsermcp`）读取真实页面后再保存。

同一媒体有多篇文章时，英文源文件名要能区分文章。采集后按「修改中文页面和翻译」把正文翻译进对应 `ReviewTab`。

### 修改中文页面和翻译

复制 `docs/games/_template.mdx` 创建新页面，文件名与数据中的 `slug` 一致。页面只放中文译文、必要的原文链接和页面结构，不粘贴英文原文或个人备注。译文中的裸 `{`、`}` 会被 MDX 当成表达式，改用中文括号或其他写法；不要用 `<http://…>` 自动链接，用普通 Markdown 链接。

页面 frontmatter 只保留展示和翻译相关字段：`title`、`display_title`、`slug`、`translation_status`、`source_file`。平台、评分、年份等游戏事实以 `data/metacritic-games.json` 为准，不要写进 MDX，避免两处不一致。

文章头图属于游戏页面，不属于某个媒体标签，图片放在 `static/img/reviews-webp/<slug>.webp`，页面级头图和媒体译文分开。

缺少头图时运行 `node scripts/collect-game-images.mjs`。脚本从对应的 Metacritic 游戏页获取图像候选，只补缺失文件，并同步在页面里加头图；已有图片不要用 `--force` 覆盖，除非明确要重新采集。

### 修改首页或组件

首页数据来自 `src/generated/games.json`，不要在 React 页面里硬编码游戏列表。首页先按平台和媒体筛选平台记录，再按 `slug` 合并为游戏；媒体名称映射和 `sources` 展示逻辑要同步。要改标签显示、译文识别或页面交互时，看 `src/components/ReviewTabs.tsx` 及相关样式。

## 脚本清单

维护流程常用的：

- `validate-games-data.mjs`（`npm run validate-data`）：校验主数据和中文页。
- `generate-games-data.mjs`（`npm run generate-data`）：生成 `src/generated/` 下的前台数据。
- `check-scripts-syntax.mjs`（`npm run check:scripts`）：检查所有 `.mjs` 脚本语法。
- `content-manifest.mjs`、`data-store.mjs`、`media-sources.mjs`：被上述脚本复用的工具模块；改数据结构时看它们。

采集脚本（按需运行，行为各不相同，运行前先看脚本顶部注释确认读什么来源、默认是否写入）：

- `collect-metacritic-intersection.mjs`：重新扫描 Metacritic Must-Play 列表，需本地代理。
- `collect-ign-links.mjs`、`collect-gamespot-links.mjs`：从站点找评测入口，加 `--write` 才写入。
- `collect-review-links.mjs [start] [limit]`、`collect-additional-review-links.mjs [start] [limit] [sites] [--dry-run]`：批量补通用媒体入口。
- `collect-4gamer-links.mjs [--dry-run] [--slug=...]`、`collect-rps-links.mjs`、`collect-aftermath-links.mjs`、`collect-rpgamer-links.mjs`、`collect-theorist-links.mjs`：单一媒体的入口补充。
- `collect-media-reviews.mjs [site] [--site=a,b] [--slug=x,y] [--concurrency=N]`：按站点抓英文正文到 `content/reviews/en/`。
- `collect-ign-reviews.mjs [--force]`：抓 IGN 正文。
- `collect-game-images.mjs [--force]`、`collect-ign-images.mjs [--force]`：补游戏头图。

`scripts/archive/` 里的脚本已经用过，只作参考，不要在维护流程里运行。

## 验证

修改数据、脚本或网站后至少运行：

```text
npm run verify
git diff --check
```

`npm run verify` 依次执行数据校验、生成前台数据、脚本语法检查和类型检查。运行后确认 `src/generated/` 没有未提交的意外改动（生成物应与主数据保持一致）。只有需要验证完整静态构建或用户明确要求时才运行 `npm run build`；构建产物 `build/` 不提交。

`.github/workflows/ci.yml` 在 push 和 PR 时自动执行同样的校验（数据校验、生成物漂移、类型检查和脚本语法）。

## Git 协作约定

- 开始工作前先看 `AGENTS.md`、`README.md`、`DESIGN.md` 和 `git status`。
- 保留工作区已有改动，不用破坏性重置或覆盖方式清理文件。
- 用补丁方式编辑文件；不要把凭据、Cookie、API key、个人隐私或英文正文写进主数据。
- 提交前检查 `git diff --check`、`git status` 和相关 diff。
- 除非用户明确要求，不自动提交、推送或发布；提交时说明改动范围和验证结果。
