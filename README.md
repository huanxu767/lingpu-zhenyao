# 灵圃镇妖

一款类似《植物大战僵尸》的中式妖怪花园塔防。收集灵露、在五路花圃种植仙草，挡住纸人、游魂和山魈。

角色与美术全部原创，不使用植物大战僵尸的既有形象。

## 怎么玩

```bash
npm install
npm run dev
```

浏览器打开终端里给出的本地地址（默认 [http://localhost:5173](http://localhost:5173)）。

| 操作 | 作用 |
| --- | --- |
| 点选种子再点草地 | 种植 |
| 点下落的金色灵露 | 手动收取（默认会自动飞来） |
| 1-9 | 快捷选择仙草 |
| S / X | 铲子 |
| Q | 开关自动收灵露 |
| Esc | 暂停 |
| M | 静音 |

撑过本关全部波次即获胜。每路祠堂前有一台一次的桃符扫，用掉后再被突破就会失败。

进度存在浏览器 `localStorage`（键名 `lingpu-zhenyao-save`）。

在线玩：[https://huanxu767.itch.io/lingpu-zhenyao](https://huanxu767.itch.io/lingpu-zhenyao)

源码：[https://github.com/huanxu767/lingpu-zhenyao](https://github.com/huanxu767/lingpu-zhenyao)

## 仙草

| 仙草 | 灵露 | 作用 |
| --- | --- | --- |
| 聚灵莲 | 50 | 持续产出灵露 |
| 桃木箭 | 100 | 向本行发射桃木箭 |
| 镇宅石 | 50 | 高生命路障 |
| 霜梅 | 175 | 射击并减速 |
| 铜钱阵 | 100 | 扎伤路过的妖怪，可与仙草叠格 |
| 爆竹莲 | 150 | 短暂点燃后 3×3 爆炸 |
| 并蒂桃 | 200 | 本行双发 |
| 长明灯 | 175 | 点燃本行飞过的桃木箭 |
| 三才竹 | 250 | 同时打上中下三行 |

## 构建

```bash
npm run build
npm run preview
```

推到 `main` 后，GitHub Actions 会把 `dist/` 发布到 itch.io。维护细节见 [AGENT.md](AGENT.md)。
