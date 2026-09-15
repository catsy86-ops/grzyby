// Pobiera z Wikimedia Commons przykładowe zdjęcia NIE przedstawiające grzyba (ściółka leśna,
// liście, dłoń, puste tło) - klasa negatywna "inne" opisana w docs/MODEL-TRAINING.md. Bez niej
// model musi zawsze wskazać jakiś gatunek, nawet gdy na zdjęciu w ogóle nie ma grzyba - co
// systematycznie zawyża pewność siebie na przypadkowych zdjęciach z aparatu.
//
// Ten sam status co fetch-reference-images.mjs: to punkt startowy, nie gotowy zbiór - przejrzyj
// wynik w raw/inne/ przed treningiem (patrz scripts/prepare-dataset/README.md).
//
// Użycie:
//   node scripts/prepare-dataset/fetch-negative-images.mjs [--limit 15]

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, 'raw', 'inne')

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
const USER_AGENT = 'LYSY-mushroom-app-dataset-prep/1.0 (offline educational hobby project)'

// Kilka różnych zapytań zamiast jednego - większa różnorodność tła/kontekstu w klasie negatywnej
// (sam las bez grzyba, ściółka z bliska, dłoń/ręka, jesienne liście) niż jedno wąskie hasło dałoby.
const QUERIES = ['forest floor leaves', 'autumn forest ground', 'human hand outdoors', 'forest undergrowth']

function parseArgs(argv) {
  const limitFlagIndex = argv.indexOf('--limit')
  const limit = limitFlagIndex !== -1 ? Number(argv[limitFlagIndex + 1]) : 15
  return { limit: Number.isFinite(limit) && limit > 0 ? limit : 15 }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry(url, options, maxAttempts = 4) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(url, options)
    if (response.status !== 429) return response
    if (attempt === maxAttempts) return response
    const waitMs = attempt * 3000
    console.warn(`  429 od Commons API - czekam ${waitMs}ms i próbuję ponownie (${attempt}/${maxAttempts - 1})...`)
    await sleep(waitMs)
  }
  throw new Error('unreachable')
}

async function searchCommonsImages(query, limit) {
  const url = new URL(COMMONS_API)
  url.searchParams.set('action', 'query')
  url.searchParams.set('format', 'json')
  url.searchParams.set('generator', 'search')
  url.searchParams.set('gsrnamespace', '6')
  url.searchParams.set('gsrsearch', `${query} filetype:bitmap`)
  url.searchParams.set('gsrlimit', String(limit))
  url.searchParams.set('prop', 'imageinfo')
  url.searchParams.set('iiprop', 'url|extmetadata')
  url.searchParams.set('iiurlwidth', '800')

  const response = await fetchWithRetry(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) throw new Error(`Commons API zwróciło ${response.status} dla "${query}"`)
  const data = await response.json()
  const pages = data.query?.pages ?? {}
  return Object.values(pages)
    .map((page) => {
      const info = page.imageinfo?.[0]
      if (!info) return null
      return {
        title: page.title,
        thumbUrl: info.thumburl ?? info.url,
        pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
        license: info.extmetadata?.LicenseShortName?.value ?? 'nieznana',
        artist: info.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, '') ?? 'nieznany',
      }
    })
    .filter(Boolean)
}

async function downloadImage(url, destPath) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) throw new Error(`Nie udało się pobrać ${url} (${response.status})`)
  const buffer = Buffer.from(await response.arrayBuffer())
  await writeFile(destPath, buffer)
}

async function main() {
  const { limit } = parseArgs(process.argv.slice(2))
  await mkdir(outDir, { recursive: true })

  const sources = []
  let index = 0
  for (const query of QUERIES) {
    console.log(`\n=== inne: "${query}" ===`)
    await sleep(1500)
    let results = []
    try {
      results = await searchCommonsImages(query, limit)
    } catch (error) {
      console.error(`  Błąd wyszukiwania: ${error.message}`)
      continue
    }

    for (const result of results) {
      if (!result.thumbUrl) continue
      index += 1
      const ext = path.extname(new URL(result.thumbUrl).pathname) || '.jpg'
      const fileName = `${String(index).padStart(3, '0')}${ext}`
      const destPath = path.join(outDir, fileName)
      try {
        await downloadImage(result.thumbUrl, destPath)
        sources.push({ file: fileName, query, ...result })
        console.log(`  ✓ ${fileName} <- ${result.pageUrl}`)
      } catch (error) {
        console.error(`  ✗ ${fileName}: ${error.message}`)
      }
    }
  }

  await writeFile(path.join(outDir, 'source.json'), JSON.stringify(sources, null, 2), 'utf-8')
  console.log(
    `\nGotowe: ${sources.length} zdjęć w raw/inne/. Przejrzyj przed treningiem jak w ` +
      'scripts/prepare-dataset/README.md (tu chodzi tylko o to, by żadne nie przedstawiało grzyba).',
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
