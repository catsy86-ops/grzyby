import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { AddFindingForm } from './AddFindingForm'

describe('AddFindingForm', () => {
  beforeEach(async () => {
    await db.findings.clear()
    await db.photos.clear()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('zapisuje znalezisko i wywołuje onClose(true) przy sukcesie', async () => {
    const onClose = vi.fn()
    render(<AddFindingForm initialPosition={[52.1, 19.5]} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }))

    await waitFor(() => expect(onClose).toHaveBeenCalledWith(true))
    expect(await db.findings.count()).toBe(1)
  })

  it('pokazuje komunikat o braku miejsca i NIE zamyka formularza przy QuotaExceededError', async () => {
    const quotaError = new DOMException('quota', 'QuotaExceededError')
    vi.spyOn(db.findings, 'add').mockRejectedValueOnce(quotaError)
    const onClose = vi.fn()

    render(<AddFindingForm initialPosition={[52.1, 19.5]} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }))

    expect(await screen.findByText(/Brak miejsca na urządzeniu/)).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('pokazuje generyczny komunikat błędu przy innym niepowodzeniu zapisu', async () => {
    vi.spyOn(db.findings, 'add').mockRejectedValueOnce(new Error('boom'))
    const onClose = vi.fn()

    render(<AddFindingForm initialPosition={[52.1, 19.5]} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }))

    expect(await screen.findByText('Nie udało się zapisać znaleziska. Spróbuj ponownie.')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('przywraca przycisk "Zapisz" po nieudanym zapisie (nie zostaje zablokowany na "Zapisywanie...")', async () => {
    vi.spyOn(db.findings, 'add').mockRejectedValueOnce(new Error('boom'))
    render(<AddFindingForm initialPosition={[52.1, 19.5]} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Zapisz' })).not.toBeDisabled())
  })
})
