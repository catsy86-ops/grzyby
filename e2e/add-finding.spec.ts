import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PHOTO_FIXTURE = path.join(__dirname, 'fixtures', 'finding.png')

test('dodanie znaleziska ze zdjęciem pokazuje miniaturę w dzienniku', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: '+ Dodaj znalezisko' }).click()
  await page.setInputFiles('input[type="file"]', PHOTO_FIXTURE)
  await page.getByRole('button', { name: 'Zapisz' }).click()

  await page.getByRole('button', { name: /Dziennik/ }).click()

  await expect(page.getByAltText('Miniatura znaleziska')).toBeVisible()
})
