# Gateway 管理接口清单

事实来源：同级 `kovar-agent-gateway` 的 `internal/app/server.go`、`internal/app/service.go`、`internal/identity/{model,service,repository}.go`、`internal/binding/{model,service}.go`、`internal/task/{model,repository,service}.go`、`internal/platform/httpx/http.go` 和 `migrations/001_initial.up.sql`。扫描日期：2026-09-18。Gateway 保持只读。

已与本次升级后的路由源码及 Gateway 文档复核，Admin 路径/字段/认证/分页未变。未找到 Gateway 自身的 OpenAPI；仓库里的 Kovar OpenAPI 不是 Admin Website 契约。完整能力核对、迁移矩阵、排除项与验证记录见 [Admin API 迁移报告](admin-api-migration.md)。

## 路由与权限

以下路径统一以 `/api/v1/admin` 开头。除登录外均要求 Gateway 验证有效的 `Authorization: Bearer <token>`；没有额外角色分级。

| 模块   | Method | Endpoint                   | Request                                       | Response                                               | 前端              |
| ------ | ------ | -------------------------- | --------------------------------------------- | ------------------------------------------------------ | ----------------- |
| 认证   | POST   | /login                     | username, password                            | access_token, token_type=Bearer, expires_in, admin     | /login            |
| 认证   | GET    | /me                        | 无                                            | {id, username}                                         | 后台布局          |
| Agent  | GET    | /agents                    | page, page_size                               | {items: AgentSummary[], page, page_size}               | /agents           |
| 白名单 | GET    | /whitelist                 | page, page_size, status 可选                  | 同上                                                   | /whitelist        |
| Agent  | GET    | /agents/{agent_id}         | EVM 地址                                      | AgentSummary + 可选 TokenInfo / token_refresh_error    | /agents/[agentId] |
| 审核   | POST   | /agents/{agent_id}/approve | {remark?}                                     | Agent                                                  | 详情：批准        |
| 审核   | POST   | /agents/{agent_id}/reject  | {remark?}                                     | Agent                                                  | 详情：拒绝        |
| 状态   | POST   | /agents/{agent_id}/suspend | {remark?}                                     | Agent                                                  | 详情：暂停        |
| 状态   | POST   | /agents/{agent_id}/resume  | {remark?}                                     | Agent                                                  | 详情：恢复        |
| 状态   | POST   | /agents/{agent_id}/revoke  | {remark?}                                     | Agent + token_deletion_pending?, token_deletion_error? | 详情：撤销授权    |
| 预算   | PUT    | /agents/{agent_id}/budget  | per_request_limit, daily_limit, monthly_limit | 同请求 Policy                                          | 详情：预算表单    |

## 数据契约

- Agent：`agent_id`（规范化小写 EVM 地址）、`agent_status`（REGISTERED/ACTIVE/SUSPENDED/REVOKED）、`whitelist_status`（PENDING/APPROVED/REJECTED/REVOKED）、`created_at`、可空 `last_seen_at/reviewed_at/reviewed_by`、`remark`、三个预算字段。
- Binding Summary：可空 `kovar_user_id/kovar_token_id/token_binding_status/kovar_token_status/expired_at/remain_quota` 和 `key_bound`。本地 Token 状态为 CREATING/ACTIVE/DELETE_PENDING/DELETED/UNKNOWN；上游 `kovar_token_status` 仅确定为整数，不猜其枚举。
- Usage Summary：`today_usage/month_usage/task_count/tasks_without_actual_cost`。UTC 日/月累计；actual_cost 存在时用实际值，否则使用 estimated_cost；单位 Kovar quota units，不是支付凭证。
- 详情可能追加 `token_id/status`（TokenInfo）。`status` 是 Token 状态，不能覆盖或混淆 `agent_status`。
- 详情的 Token 刷新失败不导致整体请求失败，以 `token_refresh_error` 表示；撤销授权后上游 Token 删除失败以 `token_deletion_pending` 表示，必须展示部分成功。
- 前端 Schema 将 `token_refresh_error` 字符串转为布尔标志，仅供显示本地数据提示；不保留 `token_deletion_error` 原文。模型 API Key ID、绑定 Kovar 用户 ID 与管理员登录凭据是不同概念，列表/详情不展示完整 Key。
- int64 字段全程用十进制字符串保存，通过无损 JSON 解析/序列化与 Gateway 数字字段往返，支持 0..9223372036854775807 的预算值。
- 时间字段为 Go time.Time JSON（RFC3339）；UI 使用 UTC 标识。
- 错误：`{code, message, request_id}`，以及 `X-Request-Id`；UI 只使用稳定 code 映射安全信息，不直接展示原始 message。
- Gateway 成功响应是直接 DTO；上游 HTTP 200 业务失败由 Gateway 转为 502 `KOVAR_REQUEST_REJECTED`，不在前端增加 Kovar success/data 解包。新 `KOVAR_*`、`UPSTREAM_RATE_LIMITED` 等错误由统一 AppError 安全映射，详情刷新失败不触发管理员退出。

## 请求约束与状态转换

- page 默认 1，范围 1..1000000；page_size 默认 20，范围 1..100；响应无 total/has_more。下一页根据本页数量启用，满页后的下一页可能为空，不推算总页数。
- 只有 whitelist 支持 status 筛选。排序固定 created_at DESC, address；无搜索和可选排序。
- approve：REGISTERED + PENDING/REJECTED → ACTIVE + APPROVED。
- reject：REGISTERED + PENDING → REGISTERED + REJECTED。
- suspend：ACTIVE + APPROVED → SUSPENDED + APPROVED。
- resume：SUSPENDED + APPROVED → ACTIVE + APPROVED。
- revoke：任意状态 → REVOKED + REVOKED，随后尝试删除上游 Key；再次调用可重试清理。
- remark 最多 1000 **UTF-8 字节**，非字符数。
- Policy：三个非负 int64，无大小关系约束；Go 解码缺失字段默认 0，UI 显式提交全部字段，避免意外清零。
- Login：username 最多 128 字节，password 最多 72 字节。Gateway 颁发随机 64 字符不透明 Token，非 JWT；没有 refresh/logout/revoke-session API。前端退出仅清理 HttpOnly Cookie。

## 排除范围与限制

Agent 自助签名接口、上游 `kovar-manage-api.json` 内没有在 Gateway 注册的路由均不属于管理端。无管理端 Agent 创建/删除、独立 Token 管理、用户/角色/模型/Provider/MCP/任务列表/审计日志/系统配置/全局 Dashboard API，故不创建这些功能。审计数据库表的存在不等于有管理接口。

前端仅使用 Server Components + Server Actions 调用已确认路由。Server Actions 使用框架同源校验，Gateway 再次认证所有管理请求；无任意路径代理。浏览器 JavaScript 无法读取 Bearer Token。所有表单双端校验，写请求不自动重试。Gateway 登录限流按直连 IP，部署多用户前端后会共享前端出口 IP 的限流窗口。
