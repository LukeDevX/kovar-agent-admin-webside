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
    expect(screen.getByText('No Agents')).toBeInTheDocument()
  })
  it('validates budgets before any mutation', async () => {
    const user = userEvent.setup()
    render(<BudgetForm agentId={agentFixture.agent_id} policy={agentFixture} />)
    await user.clear(screen.getByLabelText('Daily limit'))
    await user.type(screen.getByLabelText('Daily limit'), '-1')
    await user.click(screen.getByRole('button', { name: 'Save budget' }))
    expect(await screen.findByText('Enter a non-negative integer')).toBeInTheDocument()
    expect(updateBudget).not.toHaveBeenCalled()
  })
  it('saves budgets successfully', async () => {
    vi.mocked(updateBudget).mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    render(<BudgetForm agentId={agentFixture.agent_id} policy={agentFixture} />)
    await user.clear(screen.getByLabelText('Daily limit'))
    await user.type(screen.getByLabelText('Daily limit'), '9223372036854775807')
    await user.click(screen.getByRole('button', { name: 'Save budget' }))
    await waitFor(() =>
      expect(updateBudget).toHaveBeenCalledWith(
        agentFixture.agent_id,
        expect.objectContaining({ daily_limit: '9223372036854775807' }),
      ),
    )
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save budget' })).toBeDisabled())
  })
  it('preserves entered budgets when saving fails', async () => {
    vi.mocked(updateBudget).mockResolvedValue({
      ok: false,
      message: 'Your account does not have permission to perform this action.',
    })
    const user = userEvent.setup()
    render(<BudgetForm agentId={agentFixture.agent_id} policy={agentFixture} />)
    await user.clear(screen.getByLabelText('Daily limit'))
    await user.type(screen.getByLabelText('Daily limit'), '123')
    await user.click(screen.getByRole('button', { name: 'Save budget' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('does not have permission')
    expect(screen.getByLabelText('Daily limit')).toHaveValue('123')
  })
  it('requires confirmation before revoke and keeps the dialog open on failure', async () => {
    vi.mocked(reviewAgent).mockResolvedValue({
      ok: false,
      message: 'The service is temporarily unavailable. Please try again later.',
    })
    const user = userEvent.setup()
    render(<ReviewActions agent={agentFixture} />)
    await user.click(screen.getByRole('button', { name: 'Revoke access' }))
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveTextContent(agentFixture.agent_id)
    expect(reviewAgent).not.toHaveBeenCalled()
    await user.type(within(dialog).getByLabelText('Review remark (optional)'), 'Review reason')
    await user.click(within(dialog).getByRole('button', { name: 'Confirm Revoke access' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('temporarily unavailable')
    expect(screen.getByLabelText('Review remark (optional)')).toHaveValue('Review reason')
  })
  it('displays partial revoke success persistently', async () => {
    vi.mocked(reviewAgent).mockResolvedValue({
      ok: true,
      warning:
        'Agent authorization has been revoked, but upstream token deletion is still pending.',
    })
    const user = userEvent.setup()
    render(<ReviewActions agent={agentFixture} />)
    await user.click(screen.getByRole('button', { name: 'Revoke access' }))
    await user.click(screen.getByRole('button', { name: 'Confirm Revoke access' }))
    expect(await screen.findByRole('status')).toHaveTextContent('deletion is still pending')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
  it('cancels a destructive operation without calling Gateway', async () => {
    const user = userEvent.setup()
    render(<ReviewActions agent={agentFixture} />)
    await user.click(screen.getByRole('button', { name: 'Revoke access' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(reviewAgent).not.toHaveBeenCalled()
  })
})
