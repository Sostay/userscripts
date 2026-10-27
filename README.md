# Userscripts (油猴脚本合集)

个人维护的浏览器用户脚本（Greasy Fork / Tampermonkey / Violentmonkey / ScriptCat）统一管理仓库。

本仓库配置了 **Greasy Fork Webhook 自动化同步**：本地代码修改并推送（`git push`）到 GitHub 后，Greasy Fork 将自动拉取最新代码并完成版本发布。

---

## 📦 脚本列表

| 脚本名称 | 当前版本 | Greasy Fork 主页 | 原始代码 (Raw Sync URL) | 说明 |
| :--- | :---: | :--- | :--- | :--- |
| **Photopea 完整工作区** | `3.2.7` | [Greasy Fork #599353](https://greasyfork.org/zh-CN/scripts/599353) | [photopea-workspace.user.js](https://raw.githubusercontent.com/Sostay/userscripts/main/scripts/photopea-workspace/photopea-workspace.user.js) | 收回 Photopea 广告预留宽度，彻底解决高内存、卡顿与视口横向漂移问题。（回退恢复至 3.2.2 稳定代码） |
| **质感 HTML5 播放器** | `1.65` | [Greasy Fork #554122](https://greasyfork.org/zh-CN/scripts/554122) | [html5-player.user.js](https://raw.githubusercontent.com/Sostay/userscripts/main/scripts/html5-player/html5-player.user.js) | 质感 HTML5 播放器，全局支持所有视频页面快捷键增强与 OSD 提示，完美破除包含块陷阱的真顶层网页全屏、ComfyUI画布节点专属放行、右键显示控件即时同步、YouTube/B站自定义播放器放行空格暂停 |
| **飞书网页链接自动跳转** | `1.0` | [Greasy Fork #558411](https://greasyfork.org/zh-CN/scripts/558411) | [feishu-link-redirect.user.js](https://raw.githubusercontent.com/Sostay/userscripts/main/scripts/feishu-link-redirect/feishu-link-redirect.user.js) | 将飞书 applink 链接自动跳转到 oa.feishu.cn 网页版 |

---

## 🛠️ 目录结构

```text
userscripts/
├── scripts/
│   ├── photopea-workspace/
│   │   ├── photopea-workspace.user.js
│   │   └── README.md
│   ├── html5-player/
│   │   ├── html5-player.user.js
│   │   └── README.md
│   └── feishu-link-redirect/
│       ├── feishu-link-redirect.user.js
│       └── README.md
├── README.md
└── .gitignore
```

---

## 🚀 自动发布流程

1. **修改代码**：在对应脚本中完善功能或修复问题。
2. **递增版本号**：修改脚本头部元信息中的 `// @version x.y.z`（版本号递增才会触发 Greasy Fork 发布新版本）。
3. **提交与推送**：
   ```bash
   git add .
   git commit -m "更新说明：此处的内容将自动作为 Greasy Fork 的更新日志 (Changelog)"
   git push origin main
   ```
4. **自动生效**：Greasy Fork 收到 GitHub Webhook 推送通知后，会自动拉取最新版本并在几秒内上线。
