import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AgentTable } from '@/features/agents/components/agent-table'
import { BudgetForm } from '@/features/agents/components/budget-form'
import { ReviewActions } from '@/features/agents/components/review-dialog'
import { reviewAgent, updateBudget } from '@/features/agents/actions'

import { agentFixture } from './fixtures'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/features/agents/actions', () => ({ reviewAgent: vi.fn(), updateBudget: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())

describe('Agent management UI', () => {
  it('renders a real row and the empty state', () => {
    const { rerender } = render(<AgentTable agents={[agentFixture]} />)
    expect(screen.getByRole('link', { name: agentFixture.agent_id })).toHaveAttribute(
      'href',
      `/agents/${agentFixture.agent_id}`,
    )
    rerender(<AgentTable agents={[]} />)
    expect(screen.getByText('暂无 Agent')).toBeInTheDocument()
  })
  it('validates budgets before any mutation', async () => {
    const user = userEvent.setup()
    render(<BudgetForm agentId={agentFixture.agent_id} policy={agentFixture} />)
    await user.clear(screen.getByLabelText('每日上限'))
    await user.type(screen.getByLabelText('每日上限'), '-1')
    await user.click(screen.getByRole('button', { name: '保存预算' }))
    expect(await screen.findByText('请输入非负整数')).toBeInTheDocument()
    expect(updateBudget).not.toHaveBeenCalled()
  })
  it('saves budgets successfully', async () => {
    vi.mocked(updateBudget).mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    render(<BudgetForm agentId={agentFixture.agent_id} policy={agentFixture} />)
    await user.clear(screen.getByLabelText('每日上限'))
    await user.type(screen.getByLabelText('每日上限'), '9223372036854775807')
    await user.click(screen.getByRole('button', { name: '保存预算' }))
    await waitFor(() =>
      expect(updateBudget).toHaveBeenCalledWith(
        agentFixture.agent_id,
        expect.objectContaining({ daily_limit: '9223372036854775807' }),
      ),
    )
    await waitFor(() => expect(screen.getByRole('button', { name: '保存预算' })).toBeDisabled())
  })
  it('preserves entered budgets when saving fails', async () => {
    vi.mocked(updateBudget).mockResolvedValue({ ok: false, message: '当前账号没有操作权限。' })
    const user = userEvent.setup()
    render(<BudgetForm agentId={agentFixture.agent_id} policy={agentFixture} />)
    await user.clear(screen.getByLabelText('每日上限'))
    await user.type(screen.getByLabelText('每日上限'), '123')
    await user.click(screen.getByRole('button', { name: '保存预算' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('没有操作权限')
    expect(screen.getByLabelText('每日上限')).toHaveValue('123')
  })
  it('requires confirmation before revoke and keeps the dialog open on failure', async () => {
    vi.mocked(reviewAgent).mockResolvedValue({ ok: false, message: '服务暂时不可用' })
    const user = userEvent.setup()
    render(<ReviewActions agent={agentFixture} />)
    await user.click(screen.getByRole('button', { name: '撤销授权' }))
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveTextContent(agentFixture.agent_id)
    expect(reviewAgent).not.toHaveBeenCalled()
    await user.type(within(dialog).getByLabelText('审核备注（可选）'), '审核原因')
    await user.click(within(dialog).getByRole('button', { name: '确认撤销授权' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('服务暂时不可用')
    expect(screen.getByLabelText('审核备注（可选）')).toHaveValue('审核原因')
  })
  it('displays partial revoke success persistently', async () => {
    vi.mocked(reviewAgent).mockResolvedValue({ ok: true, warning: '上游 Token 删除尚未完成' })
    const user = userEvent.setup()
    render(<ReviewActions agent={agentFixture} />)
    await user.click(screen.getByRole('button', { name: '撤销授权' }))
    await user.click(screen.getByRole('button', { name: '确认撤销授权' }))
    expect(await screen.findByRole('status')).toHaveTextContent('上游 Token 删除尚未完成')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
  it('cancels a destructive operation without calling Gateway', async () => {
    const user = userEvent.setup()
    render(<ReviewActions agent={agentFixture} />)
    await user.click(screen.getByRole('button', { name: '撤销授权' }))
    await user.click(screen.getByRole('button', { name: '取消' }))
    expect(reviewAgent).not.toHaveBeenCalled()
  })
})
