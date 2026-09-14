---
title: 收录说明
sidebar_position: 1
description: Playbook 的 Metacritic 高分游戏收录规则
---

# 收录说明

这是一个个人用的高分游戏橱窗，不是媒体榜单。

## 当前规则

- 首页只展示 Metacritic 总分 **90 分及以上**且带有 **Must-Play** 金标的游戏。
- 当前平台范围：PC、Nintendo Switch、Nintendo Switch 2。
- 有中文译文的游戏对应 `docs/games/` 下的一篇文档；没有译文的游戏仍会在首页显示为待补状态。
- 英文评测资料放在 `content/reviews/en/`，不会进入 Docusaurus 前台。
- CSV 只作为抓取和 AI 之间交换数据的中间层，不参与网站构建。

## 新增游戏

先把抓取结果整理到 `data/metacritic-games.csv`，确认无误后，把英文资料放到 `content/reviews/en/<slug>.md`，再为有译文的游戏复制 `docs/games/_template.mdx` 并补充中文内容与 IGN / GameSpot 链接。
