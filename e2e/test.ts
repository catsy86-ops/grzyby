import { test as base } from '@playwright/test'

export { expect } from '@playwright/test'

// Wspólny `test` dla wszystkich scenariuszy: oznacza onboarding jako obejrzany, zanim wystartuje
// aplikacja - inaczej OnboardingOverlay (pokazywany raz, przy pustym localStorage czystego profilu
// Playwrighta) przykrywa całą apkę i każde kliknięcie wisi do timeoutu.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      localStorage.setItem('lysy-onboarding-seen', '1')
    })
    await use(page)
  },
})
