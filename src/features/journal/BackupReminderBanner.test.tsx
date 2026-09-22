import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { useAppStore } from '../../stores/appStore'
import { MIN_FINDINGS_FOR_BACKUP_REMINDER } from '../../utils/backupReminder'
import { BackupReminderBanner } from './BackupReminderBanner'

const SNOOZE_KEY = 'lysy-backup-reminder-snoozed-until'

async function addFindings(count: number) {
  for (let i = 0; i < count; i++) {
    await db.findings.add({
      notes: '',
      createdAt: Date.now(),
      latitude: null,
      longitude: null,
      speciesId: null,
      speciesNameGuess: null,
    })
  }
}

beforeEach(async () => {
  await db.findings.clear()
  useAppStore.setState({ lastExportAt: null })
  localStorage.removeItem(SNOOZE_KEY)
})

afterEach(() => cleanup())

describe('BackupReminderBanner', () => {
  it('nie pokazuje się poniżej progu liczby znalezisk', async () => {
    await addFindings(MIN_FINDINGS_FOR_BACKUP_REMINDER - 1)
    render(<BackupReminderBanner onExport={vi.fn()} />)

    await waitFor(() => expect(db.findings.count()).resolves.toBe(MIN_FINDINGS_FOR_BACKUP_REMINDER - 1))
    expect(screen.queryByText(/backup/)).not.toBeInTheDocument()
  })

  it('pokazuje przypomnienie, gdy nigdy nie było eksportu i jest wystarczająco znalezisk', async () => {
    await addFindings(MIN_FINDINGS_FOR_BACKUP_REMINDER)
    render(<BackupReminderBanner onExport={vi.fn()} />)

    expect(await screen.findByText(/Nie masz jeszcze backupu/)).toBeInTheDocument()
  })

  it('nie pokazuje się, gdy ostatni eksport był niedawno', async () => {
    await addFindings(MIN_FINDINGS_FOR_BACKUP_REMINDER)
    useAppStore.setState({ lastExportAt: Date.now() })
    render(<BackupReminderBanner onExport={vi.fn()} />)

    await waitFor(() => expect(db.findings.count()).resolves.toBe(MIN_FINDINGS_FOR_BACKUP_REMINDER))
    expect(screen.queryByText(/backup/i)).not.toBeInTheDocument()
  })

  it('"Później" wycisza baner przez zapis do localStorage (współdzielony z NotificationCenter)', async () => {
    const { fireEvent } = await import('@testing-library/react')
    await addFindings(MIN_FINDINGS_FOR_BACKUP_REMINDER)
    render(<BackupReminderBanner onExport={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Później' }))

    await waitFor(() => expect(screen.queryByText(/backup/i)).not.toBeInTheDocument())
    expect(localStorage.getItem(SNOOZE_KEY)).not.toBeNull()
  })

  it('kliknięcie "Eksportuj" wywołuje onExport', async () => {
    const { fireEvent } = await import('@testing-library/react')
    const onExport = vi.fn()
    await addFindings(MIN_FINDINGS_FOR_BACKUP_REMINDER)
    render(<BackupReminderBanner onExport={onExport} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Eksportuj' }))
    expect(onExport).toHaveBeenCalledOnce()
  })
})
