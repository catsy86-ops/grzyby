import { chromium } from 'playwright'
const [out, tab] = [process.argv[2], process.argv[3] || 'Mapa']
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: {width:360,height:740}, isMobile: true, hasTouch: true })
await ctx.addInitScript(() => { localStorage.setItem('lysy-onboarding-seen','1') })
const p = await ctx.newPage(); await p.goto('http://localhost:5190/'); await p.waitForTimeout(3500)
await p.locator('nav:visible button', { hasText: tab }).first().click(); await p.waitForTimeout(1200)
await p.screenshot({ path: out + '-a.png' })
await p.evaluate(() => document.documentElement.classList.add('forest-mode')); await p.waitForTimeout(500)
await p.screenshot({ path: out + '-f.png' })
await b.close()
