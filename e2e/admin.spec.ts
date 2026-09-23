import { test, expect, type Page } from '@playwright/test'

const AGENT_ID = '0x1111111111111111111111111111111111111111'
async function signIn(page: Page, username = 'admin') {
  await page.goto('/login')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password', { exact: true }).fill('test-password')
  await page.getByRole('button', { name: 'Sign in to admin console' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
}

test('unauthenticated pages redirect and invalid credentials stay on login', async ({ page }) => {
  await page.goto('/agents')
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('Username').fill('admin')
  await page.getByLabel('Password', { exact: true }).fill('incorrect')
  await page.getByRole('button', { name: 'Sign in to admin console' }).click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'Incorrect username or password.' }),
  ).toBeVisible()
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
  await expect(page.getByRole('heading', { name: 'Agent details' })).toBeVisible()
  await page.getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toContainText(AGENT_ID)
  await page.getByLabel('Review remark (optional)').fill('Approved')
  await page.getByRole('button', { name: 'Confirm Approve' }).click()
  await expect(page.getByRole('button', { name: 'Suspend', exact: true })).toBeVisible()
  await page.getByLabel('Daily limit').fill('9223372036854775807')
  await page.getByRole('button', { name: 'Save budget' }).click()
  await expect(page.getByRole('button', { name: 'Save budget' })).toBeDisabled()
  await page.reload()
  await expect(page.getByLabel('Daily limit')).toHaveValue('9223372036854775807')
  await page.getByRole('button', { name: 'Revoke access', exact: true }).click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Suspend', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Revoke access', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm Revoke access' }).click()
  await expect(page.getByRole('button', { name: 'Retry revocation cleanup' })).toBeVisible()
  await expect(
    page
      .getByText(
        'Agent authorization has been revoked, but upstream token deletion is still pending. Run Revoke access again to retry cleanup.',
        { exact: true },
      )
      .first(),
  ).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: testInfo.outputPath('agent-detail.png'), fullPage: true })
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/agents')
  await expect(page).toHaveURL(/\/login$/)
})

test('whitelist filters and pagination survive reload and history', async ({ page }) => {
  await signIn(page)
  await page.goto('/whitelist?page=1&page_size=1')
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByText('No Agents')).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('table')).toBeVisible()
  await page.getByLabel('Review status').selectOption('APPROVED')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(page).toHaveURL(/status=APPROVED/)
  await page.reload()
  await expect(page.getByLabel('Review status')).toHaveValue('APPROVED')
  await expect(page.getByText('No Agents')).toBeVisible()
})

for (const scenario of [
  { username: 'empty', message: 'No Agents' },
  { username: 'failure', message: 'Unable to load' },
  { username: 'forbidden', message: 'Access denied' },
  {
    username: 'rate-limited',
    message: 'Unable to load',
    detail: 'Too many requests. Please try again later.',
  },
  {
    username: 'business-failure',
    message: 'Unable to load',
    detail:
      'The upstream service rejected the operation. Refresh and confirm the status before retrying.',
  },
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
      has: page.getByRole('heading', { name: 'Account & model API key bindings', exact: true }),
    })
    await expect(binding.getByText('Kovar user ID', { exact: true }).locator('..')).toContainText(
      '7',
    )
    await expect(
      binding.getByText('Agent model API key ID', { exact: true }).locator('..'),
    ).toContainText('11')
    await expect(
      binding.getByText('Model key remaining quota', { exact: true }).locator('..'),
    ).toContainText('9,007,199,254,740,993')
    if (username === 'stale-binding') {
      await expect(binding.getByRole('status')).toContainText(
        'Token information has not been refreshed yet',
      )
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
  await expect(page.getByRole('heading', { name: 'Page or Agent not found' })).toBeVisible()
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
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused()
  }
  await page
    .getByRole('link', {
      name: 'Agents View registration details, account bindings, usage, and budgets.',
    })
    .click()
  await expect(page.getByRole('status', { name: 'Loading page' })).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('agent-list.png'), fullPage: true })
})
