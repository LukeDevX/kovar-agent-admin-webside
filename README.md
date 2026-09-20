# Kovar Agent Admin

基于同级 `kovar-agent-gateway` 真实管理接口构建的管理后台。提供管理员登录、Agent 列表/详情、白名单筛选、批准/拒绝/暂停/恢复/撤销授权和预算更新。首页仅提供模块入口。

2026-09-18 已核对 Gateway 升级后的实际路由与 DTO：Admin 接口保持不变，补充错误映射、响应脱敏与契约回归覆盖。新增模型/充值状态/Axone 能力目前仅接受 Agent 签名，没有对应 Admin 接口，因此本后台不接入。完整范围、端点迁移矩阵和验证边界见 [兼容性升级报告](docs/admin-api-migration.md)。

## 技术与前置条件

Next.js App Router、React 19、TypeScript strict、Tailwind CSS v4、shadcn 风格 UI 原语与 Radix、Lucide、React Hook Form、Zod。Server Components 读取数据，Server Actions 提交表单；不需要额外客户端缓存库。

需要 Node.js 22.14+、Corepack、pnpm 10.15.1；运行时需要已启动并完成 migration 的 Gateway 和管理员账号。Gateway 默认监听 `127.0.0.1:8080`，来源是其 `internal/platform/config/config.go`。

## 安装与启动

```sh
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

访问 `http://localhost:3000`，使用 Gateway 的管理员用户名和密码登录。前端不创建管理员、不存储密码，也不提供账号注册接口。

| 环境变量           | 用途                                                                        |
| ------------------ | --------------------------------------------------------------------------- |
| GATEWAY_API_URL    | 必填，服务端 Gateway 根地址；不允许 URL 中携带凭据、路径、query 或 fragment |
| GATEWAY_TIMEOUT_MS | 可选，默认 135000，范围 1000..300000；默认覆盖 Gateway 的 130 秒请求超时    |

没有 `NEXT_PUBLIC_` 密钥或浏览器直连 Gateway。环境变量在开发启动和生产构建时校验；构建不需要连接实际 Gateway。

## 页面与 API

| 页面              | Gateway API（前缀 /api/v1/admin）                                         |
| ----------------- | ------------------------------------------------------------------------- |
| /login            | POST /login                                                               |
| /                 | GET /me；管理模块入口                                                     |
| /agents           | GET /agents?page=&page_size=                                              |
| /whitelist        | GET /whitelist?page=&page_size=&status=                                   |
| /agents/[agentId] | GET /agents/{agent_id}；五种 POST 状态操作；PUT /agents/{agent_id}/budget |

完整字段、权限、状态转换和范围排除见 [接口清单](docs/gateway-api.md)。没有管理端创建/删除 Agent 接口，因此没有对应按钮。撤销授权会尝试删除上游 Token，失败会显示部分成功提示。

分页使用 Gateway 的 `page/page_size`，白名单支持 `status`。无搜索、可选排序或 total；满页时允许进入下一页，末尾可能出现空页。URL 保留筛选与分页。

预算、额度与 int64 ID 使用无损 JSON 解析，前端以十进制字符串保存，写入时发送 JSON 整数。预算单位是 Kovar quota units；用量优先实际值，否则为保守估算。时间统一显示 UTC。界面跟随操作系统深浅主题。

## 验证

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm knip
pnpm exec playwright install chromium
pnpm test:e2e
```

`pnpm check` 串联格式、Lint、类型、测试和构建。CI 使用 frozen lockfile 并运行完整检查与 Chromium E2E。

Vitest 验证真实接口契约、int64 精度、字节长度、状态转换、HTTP 错误、服务端校验和表单交互。Playwright 启动仅用于测试的 Gateway 契约替身（127.0.0.1:18080）和独立前端（localhost:3100），覆盖桌面浅色与移动端深色的登录、列表、筛选、分页、授权、预算、撤销、错误/空数据和权限状态。测试不修改真实 Gateway 数据；测试替身不属于生产运行路径。

## 目录

- `src/app`：路由、布局与页面边界。
- `src/features/auth`：Gateway 登录和管理员身份校验。
- `src/features/agents`：Agent/白名单、Schema、预算与审核操作。
- `src/components/ui`：UI 原语；`components/layout`：导航和页面状态。
- `src/lib/api`：认证请求、无损 JSON、超时与安全错误映射。
- `tests`、`e2e`：契约、组件、服务端和浏览器测试。
- `docs/gateway-api.md`：接口来源与 API 映射。

## 部署

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

部署为 Node 服务，设置 `GATEWAY_API_URL`，通过 HTTPS 反向代理对外提供访问。生产 Cookie 设置 Secure/HttpOnly/SameSite=Strict，需 HTTPS。反向代理保留正确的 Host/Origin，服务端超时至少覆盖 Gateway 的请求超时。远程 Gateway 使用 HTTPS 或受信任私有网络；不需要配置浏览器 CORS。此交付未向任何生产环境部署。

Next.js Server Actions 校验来源，所有管理读写最终由 Gateway 验证 Bearer Token。退出操作仅清理当前浏览器 Cookie：Gateway 没有注销/撤销会话接口，上游会话到期前仍有效。Gateway 登录限流按直连 IP，多用户前端共享出口 IP 的限流窗口。不要将 Token、密码写入 URL、日志或 Local Storage。

## 常见故障与验证边界

- 环境配置错误：复制 `.env.example` 并配置 Gateway 根地址，重启前端。
- 登录失败：核对 Gateway 管理员账号；连续失败可能触发其登录限流。
- 401：重新登录；403：当前账号没有权限。错误不会展示上游内部 message。
- 列表不可用：检查 Gateway 健康、数据库 migration 与网络；可凭页面请求编号定位 Gateway 日志。
- 详情 Token 刷新失败：基础信息仍展示，Token 信息标注为本地数据；稍后刷新。
- 撤销后 Token 待删除：再次执行“重试撤销清理”，由 Gateway 重试上游清理。
- `pnpm typecheck` 先生成路由类型，再检查应用和第三方声明；strict 开启、skipLibCheck 关闭。检查使用生产路由声明，排除重复的 `.next/dev` 生成声明，避免开发和构建产物重复定义。工具版本按 peer compatibility 固定。
- 浏览器测试通过表示与已读源码契约兼容，不等同于真实生产联调。实际 Gateway 管理员凭据和测试数据尚未提供；上线前应在 staging 执行同样的登录、审核、预算和上游 Token 异常流程。

工程创建前目录只有 `AGENTS.md`，不是 Git 仓库。本次不初始化 Git，不修改原有规范文件，也不修改 Gateway。
