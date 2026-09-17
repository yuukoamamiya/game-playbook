# Game Playbook 维护说明

## 仓库用途

这是一个个人使用的 Docusaurus 静态网站，用来整理带有 Metacritic Must-Play 标记的游戏，并集中展示：

- 游戏的平台、Metacritic 分数和基本资料；
- 外部媒体评测、文化评论和其他合适的文章入口；
- 已核对英文来源对应的中文译文。

网站不使用运行时数据库。主数据、英文来源和中文页面都保存在仓库中，网站构建时生成前台所需的数据文件。

## 目录结构

```text
data/metacritic-games.json       主数据：游戏 × 平台记录及 sources
src/generated/                   由主数据和英文源生成的前台数据，不手工编辑
src/pages/index.tsx              首页：合并游戏记录、筛选、评分和媒体入口
src/pages/index.module.css       首页样式
src/components/                  可复用 React 组件，例如 ReviewTabs
src/theme/                       Docusaurus 主题组件注册
content/reviews/en/              私有英文来源，不会随 docs 发布
docs/games/                      公开的中文游戏页面，每个 slug 一页
static/img/reviews-webp/         游戏页面使用的头图
scripts/                         数据校验、生成、采集、迁移和清理脚本
DESIGN.md                        网站视觉和内容规则
TODO.md                          当前未完成的采集、核对和维护事项
docs/agent-history.md            历史决策记录，不作为当前待办清单
```

## 数据和内容职责

`data/metacritic-games.json` 是唯一主数据层。每条记录对应一个游戏在一个平台上的 Metacritic 条目；同一游戏可能有多条平台记录。媒体文章统一放在 `sources` 数组中，不要新增某个媒体专用的顶层字段。

一个 source 通常包含以下字段：

```json
{
  "site": "ign",
  "kind": "review",
  "language": "en",
  "score": 9,
  "url": "https://example.com/article"
}
```

`site` 使用稳定的小写标识；`kind` 使用 `review`、`essay`、`feature` 或 `score`。不知道评分时使用 `null`，不要猜测。`filter_group` 是可选的首页筛选分类元数据，不改变文章的原始 `site`；例如确认某篇文章属于学者个人文章时，可以设置为 `scholar`。只给符合条件的具体 source 标记，不要因为整家媒体发表过一篇学者文章就把该媒体的所有文章归入该分类。首页按 `filter_group`（存在时）或 `site` 生成筛选项，卡片仍显示原始媒体名称。

版本需要区分主评测和补充来源：如果列表中有同一作品的多个版本，文章应放在对应版本下，不能把一个版本的文章当成另一个版本的主评测；如果列表中只有一个特定版本，其他版本、DLC、重制版、皇家版、加强版或合集的文章，在确认确实相关后可以作为补充来源加入，但必须在标签或说明中标明文章实际对应的版本，也不能把补充文章的评分冒充当前版本评分。版本关系不明确时不要收录。文化评论、设计分析和历史回顾可以在文章明确讨论相关作品时使用 `essay` 或 `feature`。

`src/generated/games.json` 和 `src/generated/reviews.json` 都是生成文件。修改主数据或英文来源后运行 `npm run generate-data`，不要直接编辑这两个文件。

英文来源放在 `content/reviews/en/`，只用于翻译、摘要和核对；公开内容放在对应的 `docs/games/<slug>.mdx`。一个游戏只有一个公开页，多个媒体通过 `ReviewTabs` / `ReviewTab` 切换。同一媒体有多篇文章时，为每个标签设置唯一 `id`，英文源文件也使用能区分文章的文件名。

## 常见修改方式

### 修改游戏和媒体入口

1. 在 `data/metacritic-games.json` 中按 `slug` 和 `platform` 找到记录。
2. 核对文章最终 URL、文章类型、语言、对应作品/版本和评分。
3. 使用 `scripts/media-sources.mjs` 的 `addSource` / `hasSource` 或相应采集脚本写入 `sources`，避免重复 URL。
4. 运行数据校验和生成命令。

只需要入口时只保存并核对 URL，不抓取正文；需要翻译时再保存英文源并修改公开 MDX 页面。不要把搜索结果页、新闻、攻略、宣传稿或仅提到游戏的文章当作评测入口。

### 采集英文正文

正文用 `scripts/collect-media-reviews.mjs` 采集到 `content/reviews/en/`，只用于翻译和核对，不进入前台。脚本按站点配置正文边界，已知约束：

- Unwinnable、Aftermath、Rock Paper Shotgun、Eurogamer、Game Studies、The Atlantic 直连会返回 403 或超时，在脚本里标记 `proxy: true`，需要本地代理（v2rayN）在运行。
- Unwinnable 对并发请求会返回 Cloudflare 403，用 `--concurrency=1` 串行采集。
- curl 不要加 `--ssl-no-revoke`，该参数会让 Cloudflare 拒绝请求。
- curl 加代理仍取不到正文的页面（例如 RPGamer），改用浏览器 MCP（Browser MCP 扩展 + opencode 的 `browsermcp`）读取真实页面后再保存。

同一媒体有多篇文章时，英文源文件名要能区分文章。采集后按「修改中文页面和翻译」把正文翻译进对应 `ReviewTab`。

### 修改中文页面和翻译

复制 `docs/games/_template.mdx` 创建新页面，保持文件名与数据中的 `slug` 一致。页面只放中文译文、必要的原文链接和页面结构，不粘贴英文原文或个人备注。译文中的裸 `{`、`}` 会被 MDX 当成表达式，需改用中文括号或其他写法；不要使用 `<http://…>` 自动链接，使用普通 Markdown 链接。

文章头图属于游戏页面，不属于某个媒体标签。图片应使用 `static/img/reviews-webp/<slug>.webp`，页面级头图和媒体译文保持分离。

缺少头图时运行 `node scripts/collect-game-images.mjs`。脚本从对应的 Metacritic 游戏页获取图像候选，只补充缺失文件，并同步在 `docs/games/<slug>.mdx` 添加页面级头图；已有图片不要使用 `--force` 覆盖，除非明确需要重新采集。

### 修改首页或组件

首页数据来自 `src/generated/games.json`，不能在 React 页面硬编码游戏列表。首页应先按平台和媒体筛选平台记录，再按 `slug` 合并为游戏；媒体名称映射和通用 `sources` 展示逻辑应保持同步。需要改变标签显示、译文识别或页面交互时，检查 `src/components/ReviewTabs.tsx` 及相关样式。

## 验证

修改数据、脚本或网站后至少运行：

```text
npm run validate-data
npm run generate-data
npm run typecheck
git diff --check
```

修改 `.mjs` 脚本时，再对改动脚本运行 `node --check scripts/<name>.mjs`。只有在需要验证完整静态构建或用户明确要求时运行 `npm run build`；构建产物 `build/` 不提交。

## Git 协作约定

- 开始工作前查看 `AGENTS.md`、`README.md`、`DESIGN.md` 和 `git status`。
- 保留工作区已有改动，不使用破坏性重置或覆盖方式清理文件。
- 使用补丁方式编辑文件；不把凭据、Cookie、API key、个人隐私或英文正文写入主数据。
- 提交前检查 `git diff --check`、`git status` 和相关 diff。
- 除非用户明确要求，不自动提交、推送或发布；提交时说明改动范围和验证结果。
