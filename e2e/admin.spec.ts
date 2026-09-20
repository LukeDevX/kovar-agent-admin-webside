import { test, expect, type Page } from '@playwright/test'

const AGENT_ID = '0x1111111111111111111111111111111111111111'
async function signIn(page: Page, username = 'admin') {
  await page.goto('/login')
  await page.getByLabel('用户名').fill(username)
  await page.getByLabel('密码', { exact: true }).fill('test-password')
  await page.getByRole('button', { name: '登录管理后台' }).click()
  await expect(page.getByRole('heading', { name: '工作台' })).toBeVisible()
}

test('unauthenticated pages redirect and invalid credentials stay on login', async ({ page }) => {
  await page.goto('/agents')
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('用户名').fill('admin')
  await page.getByLabel('密码', { exact: true }).fill('incorrect')
  await page.getByRole('button', { name: '登录管理后台' }).click()
  await expect(page.getByRole('alert').filter({ hasText: '用户名或密码不正确' })).toBeVisible()
})

test('login, list, approve, exact budget update, confirmed revoke and logout', async ({
  page,
  context,
}, testInfo) => {
  await signIn(page)
  const cookie = (await context.cookies()).find((item) => item.name === 'kovar_admin_session')
  expect(cookie?.httpOnly).toBe(true)
  expect(cookie?.sameSite).toBe('Strict')
  expect(await page.evaluate(() => document.cookie)).not.toContain('kovar_admin_session')
  await page.goto('/agents')
  await expect(page.getByRole('table')).toBeVisible()
  await page.getByRole('link', { name: AGENT_ID, exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Agent 详情' })).toBeVisible()
  await page.getByRole('button', { name: '批准', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toContainText(AGENT_ID)
  await page.getByLabel('审核备注（可选）').fill('通过审核')
  await page.getByRole('button', { name: '确认批准' }).click()
  await expect(page.getByRole('button', { name: '暂停', exact: true })).toBeVisible()
  await page.getByLabel('每日上限').fill('9223372036854775807')
  await page.getByRole('button', { name: '保存预算' }).click()
  await expect(page.getByRole('button', { name: '保存预算' })).toBeDisabled()
  await page.reload()
  await expect(page.getByLabel('每日上限')).toHaveValue('9223372036854775807')
  await page.getByRole('button', { name: '撤销授权', exact: true }).click()
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await expect(page.getByRole('button', { name: '暂停', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '撤销授权', exact: true }).click()
  await page.getByRole('button', { name: '确认撤销授权' }).click()
  await expect(page.getByRole('button', { name: '重试撤销清理' })).toBeVisible()
  await expect(
    page
      .getByText('Agent 授权已撤销，但上游 Token 删除尚未完成。可再次执行撤销授权以重试清理。', {
        exact: true,
      })
      .first(),
  ).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: testInfo.outputPath('agent-detail.png'), fullPage: true })
  await page.getByRole('button', { name: '退出', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/agents')
  await expect(page).toHaveURL(/\/login$/)
})

test('whitelist filters and pagination survive reload and history', async ({ page }) => {
  await signIn(page)
  await page.goto('/whitelist?page=1&page_size=1')
  await page.getByRole('button', { name: '下一页' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByText('暂无 Agent')).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('table')).toBeVisible()
  await page.getByLabel('审核状态').selectOption('APPROVED')
  await page.getByRole('button', { name: '应用', exact: true }).click()
  await expect(page).toHaveURL(/status=APPROVED/)
  await page.reload()
  await expect(page.getByLabel('审核状态')).toHaveValue('APPROVED')
  await expect(page.getByText('暂无 Agent')).toBeVisible()
})

for (const scenario of [
  { username: 'empty', message: '暂无 Agent' },
  { username: 'failure', message: '暂时无法加载' },
  { username: 'forbidden', message: '无权访问' },
  { username: 'rate-limited', message: '暂时无法加载', detail: '请求过于频繁' },
  { username: 'business-failure', message: '暂时无法加载', detail: '上游服务未接受该操作' },
]) {
  test(`list state: ${scenario.username}`, async ({ page }) => {
    await signIn(page, scenario.username)
    await page.goto('/agents')
    await expect(page.getByRole('heading', { name: scenario.message })).toBeVisible()
    await expect(page.locator('body')).not.toContainText('secret database')
    await expect(page.locator('body')).not.toContainText('sensitive internal')
    if (scenario.detail)
      await expect(page.getByRole('main').getByRole('alert')).toContainText(scenario.detail)
  })
}

for (const username of ['bound', 'stale-binding']) {
  test(`binding identities and safe model key metadata: ${username}`, async ({
    page,
  }, testInfo) => {
    await signIn(page, username)
    await page.goto(`/agents/${AGENT_ID}`)
    const binding = page.locator('section').filter({
      has: page.getByRole('heading', { name: '账户与模型 API Key 绑定', exact: true }),
    })
    await expect(binding.getByText('Kovar 用户 ID', { exact: true }).locator('..')).toContainText(
      '7',
    )
    await expect(
      binding.getByText('Agent 模型 API Key ID', { exact: true }).locator('..'),
    ).toContainText('11')
    await expect(
      binding.getByText('模型 Key 剩余额度', { exact: true }).locator('..'),
    ).toContainText('9,007,199,254,740,993')
    if (username === 'stale-binding') {
      await expect(binding.getByRole('status')).toContainText('Token 信息暂未刷新')
      await expect(page).toHaveURL(new RegExp(`/agents/${AGENT_ID}$`))
    }
    // Check serialized RSC props as well as visible text.
    expect(await page.content()).not.toContain('sensitive-fixture-secret')
    expect(await page.content()).not.toContain('KOVAR_AUTH_FAILED')
    expect(await page.evaluate(() => ({ ...localStorage, ...sessionStorage }))).toEqual({})
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('binding-detail.png'), fullPage: true })
  })
}

test('missing agent renders the resource-not-found page', async ({ page }) => {
  await signIn(page)
  await page.goto('/agents/0x2222222222222222222222222222222222222222')
  await expect(page.getByRole('heading', { name: '未找到页面或 Agent' })).toBeVisible()
})

test('expired Gateway token redirects back to login', async ({ page }) => {
  await signIn(page, 'expired')
  await page.goto('/agents')
  await expect(page).toHaveURL(/\/login$/)
})

test('loading, keyboard navigation and responsive sidebar', async ({
  page,
  isMobile,
}, testInfo) => {
  await signIn(page, 'slow')
  if (isMobile) {
    await page.getByRole('button', { name: '打开导航' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: '打开导航' })).toBeFocused()
  }
  await page.getByRole('link', { name: 'Agents 查看注册信息、账户绑定、用量与预算。' }).click()
  await expect(page.getByRole('status', { name: '正在加载页面' })).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('agent-list.png'), fullPage: true })
})
