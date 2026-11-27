# 这算出轨吗？ / これって浮気？

简体中文与日语双语恋爱界限判定表，适用于聊天、直播和朋友间的交流。

网站：**https://ste-tian.github.io/uwaki-sheet/**

- 左上角一键切换简体中文／日本語，保留当前题目、所有答案和换位思考答案。
- 保留参考网站的居中窄版、灰底粉字、两侧粉色竖线、原版字体和按钮样式。
- 40 道三选一题目，以及独立的换位思考题；支持点击选项自动进入下一题、整表填写和修改答案。
- 简中按大陆语境意译：LINE → 微信，SNS → 社交媒体，カラオケ → KTV 唱歌。日语保留原题。
- 问卷答案只保存在访客自己的浏览器，不会上传到统计服务。
- 判定类型和分值区间沿用参考网站；支持保存结果图、三页完整判定表 PNG 和复制结果文字。
- 结果页提供 X、Bilibili 和小红书分享入口。Bilibili／小红书按钮会复制当前文案、下载结果图，并打开对应发布页；用户自行粘贴文案、添加图片和发布。剪贴板不可用时，可复制页面中的文案。
- 手机与桌面自适应；支持键盘、屏幕阅读器和减少动画偏好。
- 新增可选的匿名访客地理统计：仅处理请求 IP 对应的粗粒度地理元数据，不保存原始 IP、不采集问卷答案；页面提供拒绝统计入口。管理员地图需要单独的 Worker 密钥。

## 访客地图功能

- 管理员地图：**https://ste-tian.github.io/uwaki-sheet/admin/**
- Worker 和 D1 部署说明：[worker/README.md](worker/README.md)
- 前端采集配置：[public/visitor-config.js](public/visitor-config.js)
- 地图显示的是 IP 数据库估算的网络出口位置，不是访客 GPS 位置。
- Dashboard 页面地址本身是公开静态页面；统计数据 API 由随机管理员密钥保护。请勿公开该密钥。

## 本地使用

无第三方前端依赖。直接打开 `public/index.html` 也可填写；推荐使用 Node.js 20+ 启动静态服务：

```sh
npm start
```

访问 http://127.0.0.1:4173。检查数据及存档逻辑：

```sh
npm test
```

## GitHub Pages

仓库的 Settings → Pages → Source 选择 **GitHub Actions**，推送到 `main` 后会自动验证并部署 `public/`。问卷本身仍为静态站点；访客地图采集后端需按 [部署说明](worker/README.md) 单独部署 Cloudflare Worker 和 D1。

## 来源与翻译

- 原题：健屋花那「これって浮気？判定シート」[原始发布](https://x.com/sukosuko_sukoya/status/2107121927278166034)
- 原版表格设计：ありあ（[@air_trpg](https://x.com/air_trpg)）
- 布局、样式与判定规则参考：[ikura1 的在线版](https://ikura1.github.io/uwaki-hantei/)。按用户要求保留参考站外观，增加简中／日语切换、整表填写和三页表格导出。
- 字体：Google Fonts 的 Dela Gothic One、Zen Maru Gothic、Archivo，以及简中使用的 Noto Sans SC。字体子集在站点本地提供，SIL OFL 许可证保留于 `public/fonts/`。
- 翻译以用户提供的三页日语原图为准，并参考用户提供的三页繁中图；措辞说明见 [翻译说明](docs/translation-notes.md)。原始参考图片保留在本地资料目录，不随网站上传。
- 网页制作：[beyondlogic](https://space.bilibili.com/337168962)

这是非官方双语版本。原题及原版设计归原作者所有。类型与分值区间来自参考网页版，用于娱乐，不代表原题作者提供的官方评分标准。
