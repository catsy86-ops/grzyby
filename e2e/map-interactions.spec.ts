import { expect, test } from '@playwright/test'

test('kliknięcie na mapie ustawia pinezkę kandydata na nowe znalezisko', async ({ page }) => {
  await page.goto('/')

  await page.locator('.leaflet-container').click({ position: { x: 300, y: 300 } })

  await expect(page.getByRole('img', { name: 'Wybrane miejsce nowego znaleziska' })).toBeVisible()
})

test('przełącznik Mapa/Lista pokazuje listę znalezisk i grzybowisk, a potem wraca do mapy', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Pokaż listę znalezisk i grzybowisk' }).click()

  await expect(page.getByText(/Grzybowiska \(\d+\)/)).toBeVisible()
  await expect(page.getByText(/Znaleziska na mapie \(\d+\)/)).toBeVisible()

  await page.getByRole('button', { name: 'Pokaż mapę' }).click()

  await expect(page.locator('.leaflet-container')).toBeVisible()
  await expect(page.getByText(/Grzybowiska \(\d+\)/)).not.toBeVisible()
})
