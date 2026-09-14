---
title: 收录说明
sidebar_position: 1
description: Playbook 的 Metacritic 高分游戏收录规则
---

# 收录说明

这是一个个人用的高分游戏橱窗，不是媒体榜单。

## 当前规则

- 首页只展示 Metacritic 总分 **90 分及以上**的游戏。
- 每条记录包含：游戏名、MC 分数、发行年份、平台和类型。
- 数据统一维护在 `src/data/games.ts`。
- 暂时没有游戏条目时，首页会显示空状态，不放示例数据。

## 新增游戏

在 `src/data/games.ts` 的 `games` 数组中加入一条记录：

```ts
{
  title: '游戏名称',
  score: 90,
  releaseYear: 2024,
  platforms: ['PC'],
  genre: 'RPG',
}
```
