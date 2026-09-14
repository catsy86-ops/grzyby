// Jednorazowy generator ikon PWA/favicon z tego samego SVG grzyba co Logo.tsx (spójna
// tożsamość wizualna), renderowany przez Playwright (Chromium) na przezroczystym/pełnym tle.
// Uruchomienie: node scripts/generate-icons.mjs
import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const mushroomPaths = `
  <path d="M12 2C6.5 2 3 6 3 9.5c0 1 .5 1.5 1.5 1.5h15c1 0 1.5-.5 1.5-1.5C21 6 17.5 2 12 2Z" fill="#B45309" />
  <circle cx="8" cy="7" r="1" fill="#FEF3C7" opacity="0.85" />
  <circle cx="14.5" cy="6" r="0.8" fill="#FEF3C7" opacity="0.85" />
  <circle cx="12" cy="8.5" r="0.7" fill="#FEF3C7" opacity="0.7" />
  <path d="M9.5 11h5l-.8 8a1.7 1.7 0 0 1-1.7 1.5h0a1.7 1.7 0 0 1-1.7-1.5l-.8-8Z" fill="#FFFBEB" />
`

function svgHtml({ size, bg, padding }) {
  const viewBoxSize = 24
  const scale = ((size - padding * 2) / viewBoxSize).toFixed(4)
  const offset = (padding / scale).toFixed(4)
  return `<!doctype html><html><head><style>
    html,body{margin:0;padding:0;width:${size}px;height:${size}px;}
    svg{display:block;}
  </style></head><body>
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      ${bg ? `<rect width="${size}" height="${size}" fill="${bg}" />` : ''}
      <g transform="translate(${padding},${padding}) scale(${scale})">
        ${mushroomPaths}
      </g>
    </svg>
  </body></html>`
}

const targets = [
  { name: 'icon-192.png', size: 192, bg: '#ffffff', padding: 24 },
  { name: 'icon-512.png', size: 512, bg: '#ffffff', padding: 64 },
  // maskable: bezpieczna strefa ~40% marginesu z każdej strony (spec PWA maskable icons)
  { name: 'icon-512-maskable.png', size: 512, bg: '#166534', padding: 96 },
]

const browser = await chromium.launch()
const page = await browser.newPage()

for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size })
  await page.setContent(svgHtml(t))
  const el = await page.$('svg')
  const buf = await el.screenshot({ omitBackground: !t.bg })
  writeFileSync(join(outDir, t.name), buf)
  console.log('wrote', t.name)
}

// Favicon (32x32, przezroczyste tło - świeci na pasku kart przeglądarki)
await page.setViewportSize({ width: 32, height: 32 })
await page.setContent(svgHtml({ size: 32, bg: null, padding: 2 }))
const faviconEl = await page.$('svg')
const faviconBuf = await faviconEl.screenshot({ omitBackground: true })
writeFileSync(join(__dirname, '..', 'public', 'favicon.png'), faviconBuf)
console.log('wrote favicon.png')

await browser.close()
