---
title: 游戏文档库
sidebar_label: 游戏文档库
description: MC 高分游戏及其评测来源
---

# 中文译文库

每款游戏一页。前台只展示中文译文、个人备注，以及 IGN 和 GameSpot 的原文入口。

## 内容状态

具体游戏的英文评测资料放在仓库的 `content/reviews/en/`，只供 AI 翻译和整理使用，不会被 Docusaurus 发布。完成后，把中文译文放入 `docs/games/`，首页会自动显示“中文译文已收录”。

:::tip 数据流
CSV 是不同 AI 之间交换数据的中间层。网站构建会读取它来生成候选游戏卡片，再读取 `docs/games/` 判断哪些条目已经有中文译文。
:::
