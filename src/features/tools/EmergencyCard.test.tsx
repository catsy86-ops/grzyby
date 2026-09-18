import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../../stores/appStore'
import * as geolocation from '../../utils/geolocation'
import { EmergencyCard } from './EmergencyCard'

vi.mock('../../utils/geolocation', () => ({
  getCurrentPosition: vi.fn(),
}))

describe('EmergencyCard', () => {
  beforeEach(() => {
    useAppStore.setState({ emergencyInfo: { bloodType: '', allergies: '', contactName: '', contactPhone: '' } })
    vi.mocked(geolocation.getCurrentPosition).mockReset()
  })

  afterEach(() => cleanup())

  it('zapisuje wpisane dane w appStore', () => {
    vi.mocked(geolocation.getCurrentPosition).mockResolvedValue({ latitude: 1, longitude: 2 })
    render(<EmergencyCard open onOpenChange={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('np. A Rh+'), { target: { value: '0 Rh-' } })
    fireEvent.change(screen.getByPlaceholderText(/penicylina/), { target: { value: 'orzechy' } })
    fireEvent.change(screen.getByPlaceholderText(/żona, syn/), { target: { value: 'Anna' } })
    fireEvent.change(screen.getByPlaceholderText(/\+48 600/), { target: { value: '+48111222333' } })

    expect(useAppStore.getState().emergencyInfo).toEqual({
      bloodType: '0 Rh-',
      allergies: 'orzechy',
      contactName: 'Anna',
      contactPhone: '+48111222333',
    })
  })

  it('blokuje przyciski SMS/telefon, gdy brak numeru kontaktu', () => {
    vi.mocked(geolocation.getCurrentPosition).mockResolvedValue({ latitude: 1, longitude: 2 })
    render(<EmergencyCard open onOpenChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: /SMS z lokalizacją/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Zadzwoń do kontaktu/ })).toBeDisabled()
  })

  it('pokazuje bieżącą pozycję po ustaleniu przez GPS', async () => {
    vi.mocked(geolocation.getCurrentPosition).mockResolvedValue({ latitude: 52.123456, longitude: 19.654321 })
    render(<EmergencyCard open onOpenChange={vi.fn()} />)

    expect(await screen.findByText(/52.12346, 19.65432/)).toBeInTheDocument()
  })

  it('pokazuje ostrzeżenie, gdy nie udało się ustalić pozycji', async () => {
    vi.mocked(geolocation.getCurrentPosition).mockRejectedValue(new Error('Brak sygnału GPS'))
    render(<EmergencyCard open onOpenChange={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('Brak sygnału GPS')).toBeInTheDocument())
    expect(screen.getByText(/SMS zostanie wysłany bez współrzędnych/)).toBeInTheDocument()
  })

  it('odblokowuje przyciski, gdy numer kontaktu i pozycja są dostępne', async () => {
    vi.mocked(geolocation.getCurrentPosition).mockResolvedValue({ latitude: 1, longitude: 2 })
    useAppStore.setState({
      emergencyInfo: { bloodType: '', allergies: '', contactName: 'Anna', contactPhone: '+48111222333' },
    })
    render(<EmergencyCard open onOpenChange={vi.fn()} />)

    await waitFor(() => expect(screen.getByRole('button', { name: /SMS z lokalizacją/ })).not.toBeDisabled())
    expect(screen.getByRole('button', { name: /Zadzwoń do kontaktu/ })).not.toBeDisabled()
  })
})
