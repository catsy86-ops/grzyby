import { chromium } from 'playwright'
const out = process.argv[2]
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: {width:360,height:740}, isMobile: true, hasTouch: true })
await ctx.addInitScript(() => { localStorage.setItem('lysy-onboarding-seen','1') })
const p = await ctx.newPage(); await p.goto('http://localhost:5190/'); await p.waitForTimeout(3500)
await p.getByRole('button', { name: /Dodaj znalezisko/i }).first().click(); await p.waitForTimeout(1200)
await p.screenshot({ path: out + '-1.png' })
const info = await p.evaluate(() => { const els=[...document.querySelectorAll('[data-slot=drawer-popup] *')].filter(e=>e.scrollHeight>e.clientHeight+2 && /auto|scroll/.test(getComputedStyle(e).overflowY)); return els.map(e=>e.tagName+'.'+String(e.className).slice(0,80)+' '+e.scrollHeight+'/'+e.clientHeight) })
console.log(info)
await b.close()
