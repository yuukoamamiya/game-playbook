# Game Playbook 协作说明

这份文件是给参与本仓库的 AI、自动化工具和人类维护者看的。目标是让不同 AI 在切换后仍然遵守相同的数据边界、内容流程和部署约定。

## 项目目标

这是一个个人使用的 Docusaurus 游戏档案库，用来筛选和阅读 Metacritic 高分游戏，并集中保存 IGN 与 GameSpot 的评测入口和中文译文。

当前收录条件：

- Metacritic 总分不低于 90。
- 必须带有 Metacritic Must-Play 标记。
- 平台范围为 PC、Nintendo Switch、Nintendo Switch 2。

不要擅自放宽或改变这些条件。若需要改变，先在对话中说明影响。

## 内容分层

仓库中的内容分为三层，不要混用：

```text
data/metacritic-games.csv     抓取与 AI 之间交换数据的中间层
content/reviews/en/           英文评测资料，仅供 AI 翻译和整理
docs/games/                   网站前台公开的中文译文与媒体评测页
```

### `data/metacritic-games.csv`

- 保存游戏元数据、Metacritic 分数、Must-Play 状态、平台和评测链接。
- 是方便多个 AI 之间交换和批量处理的中间层。
- 不要把英文评测正文写进 CSV。
- 除非用户明确要求，不要擅自修改已有评分或伪造链接。

### `content/reviews/en/`

- 保存英文评测 Markdown，供后续 AI 翻译、摘要和核对。
- 该目录必须位于 `docs/` 之外。
- 英文源文件不能被 Docusaurus 文档插件扫描，也不能被首页组件读取正文。
- 推荐文件名为 `content/reviews/en/<slug>.md`。
- 可以保留来源 URL 和站点名称，但不要把抓取凭据、Cookie、API key 或个人隐私写入文件。

### `docs/games/`

- 保存网站前台可见的中文译文和媒体评测页。
- 不保存个人备注，也不把英文评测原文作为公开正文。
- 每个游戏页面使用媒体标签页切换 IGN、GameSpot 等来源。
- 每个公开游戏文档使用 `docs/games/_template.mdx` 的 frontmatter 结构。
- 文档的 `slug` 必须与 CSV 中对应游戏的 `slug` 一致。
- 只有存在对应中文文档时，首页才显示“中文译文已收录”并提供站内链接。

## 推荐工作流

处理一款新游戏时按以下顺序：

1. 确认它在 CSV 中满足 `metacritic_score >= 90` 且 `must_play=true`。
2. 补充 Metacritic、IGN 和 GameSpot 链接；找不到的链接留空并在 `notes` 说明。
3. 将英文评测资料放入 `content/reviews/en/<slug>.md`。
4. 用 AI 将英文资料翻译或整理为中文，写入 `docs/games/<slug>.mdx`。
5. 在对应媒体标签页写入中文译文，并保留来源链接。
6. 运行 `npm run generate-data` 更新 `src/generated/games.json`。
7. 运行 `npm run typecheck` 做静态检查。
8. 将改动交给用户审阅；除非用户明确要求，不要自行提交或推送 Git，也不要在 Cloudflare 外发布。

## 网站与部署

- 网站使用 Docusaurus。
- Cloudflare Pages 构建命令：`npm run build`。
- 构建输出目录：`build`。
- Node.js：20 或更高版本。
- `npm run build` 会先执行 `npm run generate-data`，再进行 Docusaurus 构建。
- 用户明确要求由 Cloudflare Pages 构建；除非用户要求，不执行本地生产构建。
- `src/generated/games.json` 是生成文件，不要手工维护内容；应修改 CSV、公开文档或生成脚本后重新生成。

## 修改原则

- 先读取现有文件和 Git 工作区状态，保留用户已有改动，不做破坏性覆盖。
- 使用补丁方式编辑文件，避免通过 shell 重定向覆盖文件。
- 不删除用户未明确要求删除的抓取结果、链接或文档。
- 不引入新的运行时依赖，除非确有必要并说明原因。
- 不把英文资料目录加入 Docusaurus 的 `docs`、sidebar、搜索索引或首页数据读取逻辑。
- 不在 React 页面中硬编码游戏列表；列表来自生成的 JSON。
- 保持首页简洁、易扫读，不添加与选游戏无关的煽情文案或复杂功能。

## 模型与跨 AI 协同

- 当前协作偏好：GPT-5.6 Luna。若平台无法使用该模型，必须在回复中明确说明，不要静默声称仍在使用 Luna。
- 不同 AI 接手时，先查看本文件、`README.md`、`DESIGN.md` 和当前 Git 状态。
- 交接时说明：已完成的文件、待办事项、验证结果、是否有未提交改动，以及是否有外部阻塞。
- 不要因为切换模型而重新抓取或重写已完成的数据；优先增量修改。
- 不确定评分、链接、译文状态或用户意图时，保留现状并标记待确认，不要猜测。

## 交付前检查

至少确认以下事项：

- CSV 记录仍满足 MC 90+ 与 Must-Play 交集条件。
- 英文资料位于 `content/reviews/en/`，不在 `docs/` 下。
- `docs/games/` 公开文档只展示中文译文和必要的来源链接。
- 生成数据只包含游戏元数据和译文状态，不读取英文评测正文。
- `npm run generate-data` 成功。
- `npm run typecheck` 成功。
- 没有未经用户要求的 Git 提交、推送、生产发布或本地生产构建。
