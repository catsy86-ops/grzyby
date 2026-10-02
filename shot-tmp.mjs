import { chromium } from 'playwright'
const out = process.argv[2], tag = process.argv[3]
const tabs = ['Mapa','Rozpoznaj','Dziennik','Baza wiedzy']
const b = await chromium.launch()
for (const [name, vp, dark] of [['desktop',{width:1280,height:800},false],['mobile',{width:390,height:844},false],['mobiledark',{width:390,height:844},true]]) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1, colorScheme: dark ? 'dark' : 'light' })
  await ctx.addInitScript(() => { localStorage.setItem('lysy-onboarding-seen','1') })
  const p = await ctx.newPage(); await p.goto('http://localhost:5173/'); await p.waitForTimeout(2500)
  for (const [i,t] of tabs.entries()) {
    await p.locator(':is(nav,aside):visible button', { hasText: t }).first().click().catch(e=>console.log('miss',t))
    await p.waitForTimeout(1500)
    await p.screenshot({ path: `${out}/${tag}-${name}-${i}.png` })
  }
  await ctx.close()
}
await b.close()
