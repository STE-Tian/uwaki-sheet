# 这算出轨吗？ / これって浮気？

简体中文与日语双语恋爱界限判定表，适用于聊天、直播和朋友间的交流。

网站：**https://zerobeyondlogic.github.io/uwaki-sheet/**

同系列：[重女判定表 / これって重い？判定シート](https://zerobeyondlogic.github.io/uwaki-sheet/omonna/)。包含 30 道三选一题和自由填写栏，按选项统计结果，支持简中／日语和三页图片导出。

- 左上角一键切换简体中文／日本語，保留当前题目、所有答案和换位思考答案。
- 保留参考网站的居中窄版、灰底粉字、两侧粉色竖线、原版字体和按钮样式。
- 40 道三选一题目，以及独立的换位思考题；支持点击选项自动进入下一题、整表填写和修改答案。
- 简中按大陆语境意译：LINE → 微信，SNS → 社交媒体，カラオケ → KTV 唱歌。日语保留原题。
- 浏览器自动保存；没有账户、后端、统计或答案上传。清空答案前会提示。
- 判定类型和分值区间沿用参考网站；支持保存结果图、三页完整判定表 PNG 和复制结果文字。
- 结果页提供 X、Bilibili 和小红书分享入口。Bilibili／小红书按钮会复制当前文案、下载结果图，并打开对应发布页；用户自行粘贴文案、添加图片和发布。剪贴板不可用时，可复制页面中的文案。
- 手机与桌面自适应；支持键盘、屏幕阅读器和减少动画偏好。

## 本地使用

无第三方依赖。直接打开 `public/index.html` 也可填写；推荐使用 Node.js 20+ 启动静态服务：

```sh
npm start
```

访问 http://127.0.0.1:4173。检查数据及存档逻辑：

```sh
npm test
```

## GitHub Pages

这是静态站点。仓库的 Settings → Pages → Source 选择 **GitHub Actions**，推送到 `main` 后会自动验证并部署 `public/`。没有构建依赖，也不需要付费服务。修改域名或仓库名时，同步更新 README、`public/app.js` 的源码链接和图片页脚。

## 来源与翻译

- 原题：健屋花那「これって浮気？判定シート」[原始发布](https://x.com/sukosuko_sukoya/status/2107121927278166034)
- 原版表格设计：ありあ（[@air_trpg](https://x.com/air_trpg)）
- 布局、样式与判定规则参考：[ikura1 的在线版](https://ikura1.github.io/uwaki-hantei/)。按用户要求保留参考站外观，增加简中／日语切换、整表填写和三页表格导出。
- 字体：Google Fonts 的 Dela Gothic One、Zen Maru Gothic、Archivo，以及简中使用的 Noto Sans SC。字体子集在站点本地提供，SIL OFL 许可证保留于 `public/fonts/`。
- 翻译以用户提供的三页日语原图为准，并参考用户提供的三页繁中图；措辞说明见 [翻译说明](docs/translation-notes.md)。原始参考图片保留在本地资料目录，不随网站上传。
- 重女判定表原题：健屋花那「これって重い？判定シート」[原始发布](https://x.com/sukosuko_sukoya/status/2117217868073013621)
- 网页制作：[beyondlogic](https://space.bilibili.com/337168962)

这是非官方双语版本。原题及原版设计归原作者所有。类型与分值区间来自参考网页版，用于娱乐，不代表原题作者提供了官方评分标准。
