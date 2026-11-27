# 访客地图部署说明

问卷本体仍由 GitHub Pages 静态托管；访客地理信息由 Cloudflare Worker 接收并写入 D1。原问卷答案、浏览器本地存档和判定逻辑不会上传。

## 1. 创建 D1 数据库

在本目录（worker）执行：

```powershell
npx wrangler d1 create uwaki-visitor-map
```

复制命令返回的 database_id，填入 `wrangler.toml` 的 `database_id`，替换占位符。

初始化表结构：

```powershell
npx wrangler d1 execute uwaki-visitor-map --remote --file=./schema.sql
```

## 2. 设置管理员密钥

生成一个至少 32 字节的随机密钥：

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

复制输出并妥善保存，然后设置 Worker Secret：

```powershell
npx wrangler secret put ADMIN_TOKEN
```

粘贴刚才生成的密钥。不要把密钥写入 Git 仓库、网页 JS、README 或截图。

## 3. 部署 Worker

```powershell
npx wrangler deploy
```

部署成功后会得到类似：

`https://uwaki-visitor-collector.<你的子域>.workers.dev`

检查：

```powershell
curl https://你的-worker地址/api/health
```

预期返回 `{"status":"ok"}`。

## 4. 配置 GitHub Pages 前端

编辑仓库中的 `public/visitor-config.js`：

```js
window.VISITOR_MAP_CONFIG = {
  apiBase: "https://你的-worker地址"
};
```

提交并推送后，GitHub Actions 会部署 Pages。

网站地址仍是原来的问卷地址。管理员地图地址：

`https://ste-tian.github.io/uwaki-sheet/admin/`

打开地图时输入第 2 步创建的管理员密钥。密钥仅保存在当前浏览器标签页的 sessionStorage，关闭标签页后需要重新输入。

## 5. 隐私与安全边界

- Worker 使用 Cloudflare 请求元数据估算 IP 地理位置；应用代码不读取或保存原始 IP。
- 数据库只保存国家/地区、城市、保留两位小数的估算坐标、ASN、页面路径和必要的粗粒度设备信息。
- 不收集问卷答案，不读取 localStorage 中的问卷状态，不使用 Cookie 或浏览器指纹。
- 页面提供“拒绝统计”选项；选择后在本浏览器停止发送统计事件。
- Worker 每天定时清理 30 天以前的事件。
- 管理 API 使用独立随机密钥；Dashboard 静态页面本身可被访问，但没有密钥无法读取统计数据。不要将密钥分享给他人。
- CORS 白名单只允许指定网站浏览器跨域调用，不是身份认证，也不能阻止伪造 HTTP 请求。公开采集端点可能收到伪造事件。
- IP 地理位置是网络出口位置估算，不是 GPS。VPN、代理、移动网络和运营商 NAT 都可能造成偏差。

## 6. 常见问题

### 地图没有数据
确认 Worker 已部署、D1 初始化成功、`public/visitor-config.js` 已填写正确 Worker URL，并且网站访问地址的主机名是 `ste-tian.github.io`。

### 管理员密钥错误
重新执行 `npx wrangler secret put ADMIN_TOKEN` 设置密钥；刷新 Dashboard 后重新输入。

### 想关闭采集
将 `public/visitor-config.js` 的 `apiBase` 设置为空字符串并重新部署 Pages。访客也可以点击页面底部“拒绝统计”。

### 想删除全部记录
在 Cloudflare D1 控制台执行：

```sql
DELETE FROM visitor_events;
```

## 7. 成本与配额

Cloudflare Workers、D1 的免费额度和限制可能调整。部署前请在 Cloudflare 控制台确认当前套餐、请求额度、D1 存储/读写限制及地图底图服务的使用政策。
