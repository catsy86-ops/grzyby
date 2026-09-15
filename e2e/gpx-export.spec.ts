import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PHOTO_FIXTURE = path.join(__dirname, 'fixtures', 'finding.png')

test('eksport GPX pobiera plik dla znaleziska z lokalizacją', async ({ page }) => {
  await page.goto('/')

  // Znalezisko musi mieć lokalizację, żeby trafić do eksportu GPX (patrz utils/gpxExport.ts) -
  // kliknięcie mapy przed otwarciem formularza ustawia pinezkę kandydata, której pozycja trafia
  // do initialPosition AddFindingForm.
  await page.locator('.leaflet-container').click({ position: { x: 300, y: 300 } })
  await page.getByRole('button', { name: '+ Dodaj znalezisko' }).click()
  await page.setInputFiles('input[type="file"]', PHOTO_FIXTURE)
  await page.getByRole('button', { name: 'Zapisz' }).click()

  await page.getByRole('button', { name: /Dziennik/ }).click()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Eksport i import danych' }).click()
  await page.getByText('Eksportuj trasę (GPX)').click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/\.gpx$/)
})
