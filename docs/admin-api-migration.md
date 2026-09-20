# Admin Website ↔ Gateway API Compatibility Upgrade

扫描日期：2026-09-18。范围是现有 Admin Website 的兼容性升级，架构保持 Website Server Components / Server Actions → Gateway → Kovar。未修改 Gateway、上游服务或生产数据。

## 契约来源与证据

没有找到 Gateway 自身的 OpenAPI 文件或生成端点。不能把同级 Gateway 内的 Kovar OpenAPI 当作 Gateway Admin API：

| 文件                                               | 实际含义                  | Paths | `/api/v1/admin` 路由 |
| -------------------------------------------------- | ------------------------- | ----- | -------------------- |
| `../kovar-agent-gateway/new-kovar-manage-api.json` | 最新 Kovar Manage OpenAPI | 218   | 无                   |
| `../kovar-agent-gateway/kovar-manage-api.json`     | 历史 Kovar Manage OpenAPI | 131   | 无                   |
| `../kovar-agent-gateway/kovar-new-api.json`        | Kovar Model / Manage 文档 | 168   | 无                   |

最新 Manage 文档 SHA256：`929b0d98a0563b8a41f9fe840d9884e56020338991f41b0be9438950242443a0`。

因此使用 Gateway 的实际路由、DTO 和服务实现作为依据，并与其升级文档交叉核对：

- `internal/app/server.go`：完整路由、Admin Bearer / Agent 签名边界；SHA256 `0352934a4569ce3a30cd1ca3d1d11cade9ffe1df85ee441179c52b1235de7e34`。
- `internal/app/service.go`：Admin Summary、详情 Token 刷新与撤销部分成功；SHA256 `9ab78cd8c0cf83ee32bdf603f3dcc170a7f01900079311821d8a31232d1e0942`。
- `internal/identity/model.go`、`internal/binding/model.go`、`internal/binding/service.go`、`internal/platform/httpx/http.go`：字段、分页、错误与凭据范围。
- `docs/gateway-api.md`：Gateway 可用能力；SHA256 `1200b4344cd06ae8c11f32194031f222b62fc93bb4c65becc7c6a0f92fd1fb80`。
- `docs/manage-api-migration.md`、`internal/client/kovarmanage/client.go`：本次上游适配与新错误映射。

以上是本地最新源码契约，不能证明已部署的 Gateway 版本与之相同。工作目录不是 Git 仓库；未初始化 Git，也未覆盖原有 AGENTS.md、配置、依赖或环境文件。

## CURRENT ADMIN WEBSITE ARCHITECTURE

| 项目               | 当前实现                                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Framework / Router | Next.js 16.3.5、React 19.3.0、App Router                                                                         |
| UI Library         | Tailwind v4、Radix、现有 shadcn 风格 UI、Lucide                                                                  |
| State              | Server Components + Server Actions；局部 React state；无 TanStack Query / store                                  |
| API Client         | `src/features/*` → `src/lib/api/gateway.ts` → `client.ts`；服务端 fetch、no-store、timeout、无写重试、禁止重定向 |
| Auth               | Gateway `/login` 颁发不透明 Bearer；HttpOnly / SameSite Strict Cookie；生产 Secure；`/me` 校验；登出仅清 Cookie  |
| Pages              | `/login`、`/` 模块入口、`/agents`、`/agents/[agentId]`、`/whitelist`                                             |
| Queries            | `/me`、Agent 列表/详情、白名单列表；URL 保存分页/白名单状态                                                      |
| Mutations          | 登录、五种审核/状态操作、预算；确认 Dialog；revalidatePath 精确刷新相关页面                                      |
| Types              | Zod 校验及推导；lossless-json 将 int64 保留为十进制字符串；精确整数写回                                          |

已扫描整个应用及测试、文档、CI、环境变量模板、锁文件和构建配置。没有顶层 app/pages/routes/services/api/lib/hooks/store/types/utils 目录，也没有前端 openapi.json、gateway-api.json、swagger.json、api-types.ts；对应能力位于 src 下，不新建平行架构。

## GATEWAY CAPABILITY MAP

| 能力                                          | Gateway 范围                                                                                                | Admin Website 处理                            |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 登录、身份、Agent、白名单、审核、预算         | Admin Bearer                                                                                                | 已有功能继续使用                              |
| Agent ↔ User ↔ Model Key 元数据、预算用量     | Admin Agent 列表/详情字段                                                                                   | 保留并明确标识；不返回完整 Key                |
| User Available Models                         | Agent 签名 `GET /api/v1/models`，绑定用户的可用模型 `{data:[{id}]}`                                         | 不是 Admin 查询用户模型的能力；不接入         |
| Model Metadata / Enabled Models / Channels    | 无 Gateway 路由                                                                                             | 不使用上游文档中的接口替代                    |
| Pricing                                       | Agent 签名 `GET /api/v1/pricing`                                                                            | 无 Admin 接口                                 |
| Topup Info / History                          | Agent 签名 `GET /api/v1/account/topup/info`、`/api/v1/account/topups`                                       | 无 Admin 接口                                 |
| Topup Status                                  | Agent 签名 `GET /api/v1/account/topup/status?trade_no=`                                                     | 无 Admin 接口；订单归属绑定用户               |
| Axone Chains / Order                          | Agent 签名 `GET /api/v1/account/topup/axone/chains`、`POST /api/v1/account/topup` (`provider=axone`)        | 无 Admin 接口                                 |
| Axone Wallets / PayGo                         | Gateway 未暴露                                                                                              | 不接入                                        |
| Tasks / Usage / Logs                          | Agent 签名 `/api/v1/tasks`、`/api/v1/tasks/{task_id}`、`/api/v1/usage`、`/api/v1/logs`、`/api/v1/logs/stat` | 不以管理员会话调用；保留 Admin Agent 详情汇总 |
| System                                        | 公开 `/health`、`/ready`，无 Admin metrics                                                                  | 不伪造系统指标页                              |
| Model Performance / Subscription / Deployment | Gateway 未暴露                                                                                              | 不接入                                        |

## CURRENT API USAGE MAP

全部应用网络请求来自 `src/lib/api/client.ts`，基地址来自服务端 `GATEWAY_API_URL`；`gateway.ts` 固定添加 `/api/v1/admin`。没有浏览器直连上游、任意 URL 代理、New-Api-User 或 Agent 签名请求。

以下路径统一以 `/api/v1/admin` 开头：

| 调用位置                     | Method / Endpoint                 | 参数、返回与用途                                                                           |
| ---------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------ |
| `features/auth/actions.ts`   | POST `/login`                     | username/password → access_token/token_type/expires_in/admin；Token 不出现在 action result |
| `features/auth/session.ts`   | GET `/me`                         | `{id, username}`；401 重新登录                                                             |
| `features/agents/api.ts`     | GET `/agents`                     | page/page_size → items/page/page_size                                                      |
| `features/agents/api.ts`     | GET `/whitelist`                  | page/page_size/status → 同上                                                               |
| `features/agents/api.ts`     | GET `/agents/{agent_id}`          | Agent、Binding、Usage、可选刷新状态                                                        |
| `features/agents/actions.ts` | POST `/agents/{agent_id}/approve` | remark → Agent                                                                             |
| `features/agents/actions.ts` | POST `/agents/{agent_id}/reject`  | remark → Agent                                                                             |
| `features/agents/actions.ts` | POST `/agents/{agent_id}/suspend` | remark → Agent                                                                             |
| `features/agents/actions.ts` | POST `/agents/{agent_id}/resume`  | remark → Agent                                                                             |
| `features/agents/actions.ts` | POST `/agents/{agent_id}/revoke`  | remark → Agent、可选 token_deletion_pending/error                                          |
| `features/agents/actions.ts` | PUT `/agents/{agent_id}/budget`   | 三个 int64 预算值 → Policy                                                                 |

## ADMIN WEBSITE API MIGRATION MATRIX

路径前缀仍为 `/api/v1/admin`。不存在接口的功能不标为已迁移。

| Feature         | Current Frontend Endpoint                                        | New Gateway Endpoint | Method    | Request Changed? | Response Changed? | Auth Changed? | Pagination Changed? | Breaking? | Affected Files                              | Required Change                               |
| --------------- | ---------------------------------------------------------------- | -------------------- | --------- | ---------------- | ----------------- | ------------- | ------------------- | --------- | ------------------------------------------- | --------------------------------------------- |
| Auth            | /login, /me                                                      | 同路径               | POST, GET | 否               | 否                | 否            | 不适用              | 否        | features/auth/*                             | 保持登录和 HttpOnly Cookie，补 403 / 失效测试 |
| Dashboard       | /me；首页模块入口                                                | 同路径               | GET       | 否               | 否                | 否            | 不适用              | 否        | app/(admin)/page.tsx                        | 无统计 API，不改 Dashboard                    |
| Agents          | /agents, /agents/{agent_id}                                      | 同路径               | GET       | 否               | DTO 不变          | 否            | 否                  | 否        | features/agents/schemas.ts、detail-page.tsx | 刷新错误转安全标志，补契约测试                |
| Agent Mutations | /agents/{agent_id}/{approve,reject,suspend,resume,revoke,budget} | 同路径               | POST, PUT | 否               | DTO 不变          | 否            | 不适用              | 否        | features/agents/actions.ts                  | 保留确认、撤销部分成功与局部刷新              |
| Bindings        | Agent Summary/Detail                                             | 同路径               | GET       | 否               | 否                | 否            | 否                  | 否        | features/agents/detail-page.tsx             | 区分 Agent、用户 ID、模型 Key ID              |
| Users           | 未接入                                                           | 无 Admin API         | —         | —                | —                 | —             | —                   | —         | 无                                          | 不新增用户 CRUD/模型/充值页                   |
| Tokens          | Agent Detail 元数据                                              | 同路径               | GET       | 否               | 否                | 否            | 不适用              | 否        | schemas.ts、detail-page.tsx                 | 明确模型 Key；过滤 raw key 和不需要的错误信息 |
| Models          | 未接入                                                           | 无 Admin API         | —         | —                | —                 | —             | —                   | —         | 无                                          | 不把 Agent 用户模型当 metadata/enabled models |
| Channels        | 未接入                                                           | 无 Admin API         | —         | —                | —                 | —             | —                   | —         | 无                                          | 不增加模型获取、测试 Channel 等上游操作       |
| Pricing         | 未接入                                                           | 无 Admin API         | —         | —                | —                 | —             | —                   | —         | 无                                          | 记录 Agent-only 权限和错误语义                |
| Topups          | 未接入                                                           | 无 Admin API         | —         | —                | —                 | —             | —                   | —         | 无                                          | 不接 Agent-only status/history/info           |
| Payments        | 未接入                                                           | 无 Admin API         | —         | —                | —                 | —             | —                   | —         | 无                                          | 不创建支付或虚假成功状态                      |
| Axone           | 未接入                                                           | 无 Admin API         | —         | —                | —                 | —             | —                   | —         | 无                                          | 记录 chains/order 的签名边界                  |
| Tasks           | 仅 Agent Detail 任务数                                           | 同路径               | GET       | 否               | 否                | 否            | 不适用              | 否        | features/agents/*                           | 保留历史汇总，不增加任务管理接口              |
| Usage           | Admin Agent Summary/Detail                                       | 同路径               | GET       | 否               | 否                | 否            | 否                  | 否        | features/agents/*                           | 保留 Gateway 计算数值和估算说明               |
| Logs            | 未接入                                                           | 无 Admin API         | —         | —                | —                 | —             | —                   | —         | 无                                          | 不读取个人日志                                |
| System          | 未接入                                                           | 无 Admin metrics API | —         | —                | —                 | —             | —                   | —         | 无                                          | health/ready 不等同于系统监控                 |

## BREAKING CHANGES / NON-BREAKING CHANGES

Admin 路径、请求/响应字段、认证和分页没有发现破坏性变化。仍然没有 total，不把 Agent 充值历史的新 total 套用到 Admin 列表；不增加未支持的搜索/筛选参数。

Gateway 内部上游升级包括 Masked Key 的专门提取、管理认证和业务错误判断；这不要求浏览器获取 Kovar 凭据。HTTP 200 上游业务失败由 Gateway 转为 502 `KOVAR_REQUEST_REJECTED`。Admin 成功响应是直接 DTO，不是统一的 success/data 包裹；前端继续 Zod 校验，拒绝不匹配的 response，不自行增加解包协议。

新错误映射包括 `KOVAR_INVALID_REQUEST` (400)、`KOVAR_AUTH_FAILED` (401)、`KOVAR_FORBIDDEN` (403)、`KOVAR_NOT_FOUND` (404)、`KOVAR_CONFLICT` (409)、`UPSTREAM_RATE_LIMITED` (429)、`KOVAR_REQUEST_REJECTED` / 上游异常 (502)。Admin 详情的模型 Key 刷新错误通过 HTTP 200 的可选 `token_refresh_error` 表示，撤销清理错误通过 `token_deletion_pending` 表示，不把它们当成管理员登录失效或全量成功。

NEW ADMIN CAPABILITIES：无。

GATEWAY CAPABILITIES NOT EXPOSED TO ADMIN UI：Agent 的模型、Pricing、账户、充值、Axone、Tasks、Usage、Logs。原因是认证主体不同，没有 Admin 授权路由。

## MINIMAL CHANGE PLAN 与实际实施

1. 保持已有 Gateway DTO 字段和 URL；只在现有 Schema 边界将 token_refresh_error 映射为布尔标志，移除无需消费的 token_deletion_error。Gateway wire contract 不变，页面保留部分数据提示。
2. 在统一 AppError 中补齐 HTTP 状态提示和已确认的 Gateway 错误码，不展示 raw upstream message。Kovar 认证错误文案与 Gateway 管理员认证区分。
3. 保持原详情区块，明确 Agent 模型 API Key 与 Kovar 用户的关系，仅展示 ID、状态、额度；不请求/保存完整 Key。
4. 先跑回归测试复现，再验证精确金额、身份、分页、认证头、部分失败、错误码与浏览器序列化；运行现有全部验收命令。

## NOT IMPLEMENTED BECAUSE GATEWAY DOES NOT EXPOSE IT

此处指没有 **Admin** API；部分功能已经有 Agent-only API，不能复用 Admin Token 调用。

| 检查项                           | 结论                                                           |
| -------------------------------- | -------------------------------------------------------------- |
| Admin Auth                       | 未变化，继续 Gateway 登录                                      |
| Agent API                        | 未变化，小写 EVM 地址身份保留                                  |
| Binding API                      | Admin 仅 Agent Summary/Detail；无独立管理接口                  |
| User API                         | 无 Admin 用户列表、搜索、详情、状态或额度修改接口              |
| Token API                        | Admin 仅脱敏元数据；无 Raw Key / 重置接口                      |
| Models / Model Metadata          | 无 Admin 模型元数据接口                                        |
| User Available Models            | `/api/v1/models` 已切到绑定用户可用模型，但只接受 Agent 签名   |
| Enabled Models                   | 无 Gateway 路由；不使用上游 `/api/channel/models_enabled`      |
| Channel Models / Upstream Models | 无 Admin 路由                                                  |
| Pricing                          | Agent-only；不接入 Admin UI                                    |
| Topup Info                       | Agent-only；无 Admin provider metadata                         |
| Topup History                    | Agent-only；已支持 page/page_size/keyword、上游 total          |
| Topup Status                     | 新增 Agent-only GET；本 UI 未接入                              |
| trade_no                         | Agent status 必填；本 UI 无合法查询接口，因此未添加搜索/复制   |
| Axone                            | Agent topup 新支持 provider=axone；本 UI 未接入                |
| Axone Chains                     | 新增 Agent-only GET；本 UI 未接入，不硬编码链                  |
| Axone Order                      | Agent-only POST；创建 pending 不等于到账                       |
| Axone Wallet                     | Gateway 未暴露                                                 |
| Axone PayGo                      | Gateway 未暴露                                                 |
| Model Performance                | Gateway 未暴露                                                 |
| Subscription                     | Gateway 未暴露                                                 |
| Deployment                       | Gateway 未暴露                                                 |
| System Metrics                   | Gateway 未暴露；公开健康探针不扩展成 metrics                   |
| Task API                         | Agent task contract 未变；无 Admin list/detail；仅保留已有统计 |
| Usage API                        | Admin 汇总未变；独立 usage 为 Agent-only                       |
| Logs API                         | Agent-only；无 Admin logs                                      |

三类模型语义明确分开：Model Metadata 是描述信息；Enabled Models 是系统启用集合；User Available Models 是绑定用户的可用集合。本次没有模型 UI 可供升级，未将任何一种替代另一种，也未把暂未接入写成已实现。

订单实际状态只可来自 Gateway。其文档记录上游常见 pending/success/failed/expired，并保留其他状态；不能猜测 completed 映射、计算到账额度或添加未经返回的 provider / chain。

## 修改文件与原因

| 文件                                  | 原因                                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| `src/lib/api/errors.ts`               | 补充 HTTP 状态安全提示及新 Gateway 错误语义                                      |
| `src/features/agents/schemas.ts`      | 在已有 DTO 边界减少错误字段暴露；不保留原始上游错误文本                          |
| `src/features/agents/detail-page.tsx` | 保留布局，明确绑定用户与 Agent 专属模型 Key                                      |
| `tests/errors.test.ts`                | 验证 400/401/403/404/409/422/429/500/502/503 与新错误码                          |
| `tests/gateway-contract.test.ts`      | 使用真实 client/schema 验证 Admin 路径、认证头、分页、绑定、精度、部分失败与脱敏 |
| `tests/client.test.ts`                | 增加 HTTP 502/503 不泄露 raw message、不重试覆盖                                 |
| `tests/auth.test.ts`                  | 增加 403 登录不创建 Cookie 覆盖                                                  |
| `tests/gateway-fixture.ts`            | 扩展仅用于 E2E 的契约替身：绑定/刷新失败/新错误码；不进入生产代码                |
| `e2e/admin.spec.ts`                   | 检查 UI、绑定身份、长整数、部分刷新失败、RSC 无密钥、404、新错误提示             |
| `docs/gateway-api.md`                 | 更新错误映射、边界和本次迁移报告入口                                             |
| `docs/admin-api-migration.md`         | 保存能力核对、完整迁移矩阵、逐项交付与验证边界                                   |
| `README.md`                           | 说明兼容性升级范围和报告位置                                                     |

所有旧前端 Endpoint → 新 Gateway Endpoint 均为原路径 → 原路径，完整映射见 CURRENT API USAGE MAP。无新增 API 调用。

## 安全与架构结论

| 问题                                            | 结论                                                                                          |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Website → Kovar / Axone / 支付 Provider 直连    | **NO**；唯一 fetch 使用服务端配置的 Gateway 地址和固定 Admin 前缀                             |
| Raw Kovar API Key 泄漏                          | 已检查生产代码路径：无获取、保存或展示；Schema 过滤额外字段，错误文本不传客户端；新增测试验证 |
| Browser Environment Variables                   | 无新增；无 NEXT_PUBLIC_KOVAR / VITE_KOVAR 配置                                                |
| Admin Login Flow                                | 未修改；Gateway Admin Cookie 不等于 Kovar Management Token                                    |
| Router                                          | 未修改                                                                                        |
| UI Framework / Sidebar / Dashboard 布局         | 未修改；仅详情绑定区块文案明确化                                                              |
| State Management / Query Library                | 未修改                                                                                        |
| Gateway API / 数据库 / Agent Identity / Binding | 未修改                                                                                        |
| 生产 Mock / 自动支付 / Key 创建                 | 未新增；所有替身只在测试目录                                                                  |

## 验证记录

- 修改前现有 48 项 Vitest 通过。
- 先新增回归测试，19 项失败：14 项错误提示、4 项刷新错误文本过滤、1 项撤销错误过滤；再修复实现。
- 最终检查结果：

| 命令 / 检查                                                  | 结果                                                                                                                                                 |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm exec prettier --write`（仅本次修改的 12 个文件）       | 通过，未格式化无关代码                                                                                                                               |
| `pnpm format:check`                                          | 通过                                                                                                                                                 |
| `pnpm lint`                                                  | 通过，零 warning                                                                                                                                     |
| `pnpm typecheck`                                             | 通过，strict 保持开启                                                                                                                                |
| `pnpm test`                                                  | 7 个测试文件、90 项通过                                                                                                                              |
| `pnpm build`                                                 | 通过；页面路由与原项目一致                                                                                                                           |
| `pnpm test:e2e`                                              | 首次 22 项通过、4 项因定位器同时匹配页面 alert 与 Next 路由播报而失败                                                                                |
| 修正测试定位范围后 `pnpm exec playwright test --last-failed` | 4 项全部通过；合计 26 个场景均验证通过，无生产代码变更                                                                                               |
| 桌面浅色 / 移动端深色截图                                    | 已人工查看绑定详情和刷新失败状态；长地址、长整数、提示与表单无页面横向溢出                                                                           |
| 安全搜索                                                     | src 无 localStorage/sessionStorage、业务 console、New-Api-User、上游 URL；只有统一 client 使用 fetch；实际 env 与模板均仅有两个服务端 Gateway 配置项 |
| `pnpm knip`                                                  | 未通过：既有 `src/features/auth/schemas.ts:12` 的 `LoginInput` 未使用导出；已与修改前副本核对该文件完全未变，遵循精准修改要求保留                    |

未暴露模块的 Models/Channels/Pricing/Topups/Axone/Tasks 管理测试为不适用，不用虚构接口编写成功测试。已有 Agent List/Detail/Empty/Error、Binding、Auth、Mutation、Usage Summary、统一错误处理由现有与新增测试覆盖。

## 未确认的 Gateway 行为及联调方式

没有提供可验证的 Gateway 自身 OpenAPI、部署版本、管理员测试凭据或 staging 测试数据。当前验证针对已读源码契约和隔离测试替身，不代表真实生产联调完成。

上线前在 staging 确认 Gateway 与上述源码版本一致，使用专用管理员和测试 Agent 执行登录、列表/详情、审核、预算、撤销重试；测试绑定 Key 刷新失败时基础详情仍可读，确认服务端和浏览器响应均无密钥。真实上游配置、权限、Key 获取、支付结算、Axone 链支持均需相应 Gateway 集成环境验证；本次前端没有调用这些上游能力。

Gateway 已支持但本次 UI 暂未接入的功能：所有上表 Agent-only 能力及公开健康探针；没有遗漏已暴露的 Admin 管理路由。未来只有 Gateway 明确提供 Admin 授权接口和 DTO 后，才可扩展相关页面。
