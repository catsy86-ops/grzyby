import { describe, expect, it } from 'vitest'
import { buildLocationSmsUrl } from './locationSms'

describe('buildLocationSmsUrl', () => {
  it('buduje URL sms: z zaokrągloną lokalizacją i linkiem do Google Maps', () => {
    const url = buildLocationSmsUrl(52.1, 19.5, 'Mozilla/5.0 (Linux; Android 13)')

    expect(url).toContain('sms:?body=')
    expect(decodeURIComponent(url)).toContain('52.10000, 19.50000')
    expect(decodeURIComponent(url)).toContain('https://www.google.com/maps?q=52.1,19.5')
  })

  it('używa `&` zamiast `?` przed body na iOS', () => {
    const url = buildLocationSmsUrl(52.1, 19.5, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')

    expect(url.startsWith('sms:&body=')).toBe(true)
  })

  it('używa `?` przed body na Androidzie/desktopie', () => {
    const url = buildLocationSmsUrl(52.1, 19.5, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')

    expect(url.startsWith('sms:?body=')).toBe(true)
  })
})
