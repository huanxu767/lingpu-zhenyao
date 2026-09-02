# AGENT.md

给后续维护《灵圃镇妖》用：本地开发、GitHub 发布、itch.io 上线。

## 项目是什么

- 中式妖怪花园塔防，Phaser 3 + Vite，纯前端。
- 进度存在浏览器 `localStorage`，键名 `lingpu-zhenyao-save`。
- 没有后端。`npm run build` 之后，`dist/` 就是完整可玩网站。

## 账号与地址

| 用途 | 值 |
| --- | --- |
| GitHub 用户 | `huanxu767` |
| GitHub 仓库 | https://github.com/huanxu767/lingpu-zhenyao |
| itch.io 用户 | `huanxu767` |
| itch.io 游戏页 | https://huanxu767.itch.io/lingpu-zhenyao |
| butler 目标 | `huanxu767/lingpu-zhenyao:html` |
| GitHub Secret | `ITCH_API_KEY` |

游戏页必须先在 itch.io 创建好，butler 才能推送到这个 slug。

## 日常开发

```bash
npm install
npm run dev
```

默认打开 http://localhost:5173 。

| 操作 | 作用 |
| --- | --- |
| 点选种子再点草地 | 种植 |
| 1-9 | 快捷选择仙草 |
| S / X | 铲子 |
| Q | 开关自动收灵露 |
| Esc | 暂停 |
| M | 静音 |

本地改完后先自己跑一遍：

```bash
npm run build
npm run preview
```

## 发布流程

1. 把改动提交到 `main`。
2. `git push origin main`。
3. GitHub Actions 工作流 `.github/workflows/publish-itch.yml` 会：
   - `npm ci`
   - `npm run build`
   - 用 butler 把 `dist/` 推到 `huanxu767/lingpu-zhenyao:html`
4. 打开 https://huanxu767.itch.io/lingpu-zhenyao 确认能玩。

也可以在 GitHub 仓库的 Actions 页手动跑 `Publish to itch.io`。

## 第一次配置（已经做过，坏了再看）

1. itch.io 创建游戏：Title `灵圃镇妖`，URL slug `lingpu-zhenyao`，Kind 选 **HTML**，定价 **No payments**。
2. 打开 https://itch.io/user/settings/api-keys ，生成 API key。
3. GitHub 仓库 → Settings → Secrets and variables → Actions，新增 `ITCH_API_KEY`，值就是上一步的 key。
4. 推送 `main`，让 Actions 上传第一版。

不要把 API key 写进代码、README 或 AGENT.md。

## 手动上传（Actions 挂了时）

```bash
npm run build
butler push dist huanxu767/lingpu-zhenyao:html --userversion local
```

butler 安装：https://itch.io/docs/butler/

本机如果 `git` / `curl` 连不上 GitHub，先走系统代理，例如：

```bash
export https_proxy=http://127.0.0.1:7897
export http_proxy=http://127.0.0.1:7897
git -c http.version=HTTP/1.1 push origin main
```

## itch.io 页面注意点

- Kind 必须是 **HTML**，channel 必须是 `html`，玩家才能在网页里直接玩。
- Vite 的 `base: './'` 不能改回 `'/'`，否则 itch 嵌入页会 404。
- Embed 尺寸按游戏画布来：宽 `1280`，高 `620`。HUD 在画布外，itch 嵌入框可能只显示战场；完整 HUD 依赖页面 CSS，所以 zip 根目录必须有 `index.html`。
- 封面用 `public/assets/ui/title-hero.jpg`。itch 建议封面约 `630x500`，没有专门封面时先用这张。
- Google Fonts 在国内可能加载失败。CSS 已回退到 `PingFang SC` / 系统宋体，标题仍能看。

## 目录

| 路径 | 作用 |
| --- | --- |
| `src/main.js` | Phaser 入口 |
| `src/ui/app.js` | 标题、关卡、HUD、暂停 |
| `src/scenes/battle.js` | 战斗场景 |
| `src/battle/sim.js` | 战斗逻辑 |
| `src/data/` | 仙草、妖怪、关卡数据 |
| `public/assets/` | 图片资源 |
| `vite.config.js` | `base: './'`，给 itch 用 |
| `.github/workflows/publish-itch.yml` | 推送到 itch.io |

改玩法优先动 `src/data/` 和 `src/battle/sim.js`。改界面文案看 `index.html` 和 `src/ui/app.js`。

## 常见故障

| 现象 | 处理 |
| --- | --- |
| itch 打开白屏 / 资源 404 | 确认 `vite.config.js` 里 `base: './'`，重新 build 再推 |
| Actions 失败：`Missing ITCH_API_KEY` | 检查仓库 Secret 名称必须是 `ITCH_API_KEY` |
| Actions 失败：`invalid game` | itch 游戏页还没创建，或 slug 不是 `lingpu-zhenyao` |
| 能下载不能在线玩 | 游戏 Kind 不是 HTML，或 butler channel 不是 `html` |
| 本机 `git push` SSL 失败 | 走本地代理，并加上 `git -c http.version=HTTP/1.1` |
