// Pobiera przykładowe, wolno licencjonowane zdjęcia z Wikimedia Commons dla każdego gatunku
// zdefiniowanego w src/data/species.json - jako PUNKT STARTOWY do ręcznej kuracji, NIE jako
// gotowy zbiór treningowy. Zdjęcia z automatycznego wyszukiwania po nazwie łacińskiej bywają
// błędnie skategoryzowane lub przedstawiają nie ten gatunek/nie ten etap rozwoju grzyba -
// przy grzybach trujących vs jadalnych to kwestia bezpieczeństwa, więc KAŻDE zdjęcie trzeba
// obejrzeć i odrzucić błędne, zanim trafi do dataset/<species-id>/ używanego przez train.py.
//
// Użycie:
//   node scripts/prepare-dataset/fetch-reference-images.mjs [--limit 40]
//
// Wynik trafia do scripts/prepare-dataset/raw/<species-id>/ (obok pliku source.json z licencją
// i adresem źródłowym każdego zdjęcia). Po ręcznym przejrzeniu przenieś zaakceptowane zdjęcia do
// dataset/<species-id>/ (katalog oczekiwany przez scripts/train-model/train.py).

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')
const speciesPath = path.join(repoRoot, 'src/data/species.json')
const outDir = path.join(__dirname, 'raw')

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
const USER_AGENT = 'LYSY-mushroom-app-dataset-prep/1.0 (offline educational hobby project)'

function parseArgs(argv) {
  const limitFlagIndex = argv.indexOf('--limit')
  const limit = limitFlagIndex !== -1 ? Number(argv[limitFlagIndex + 1]) : 40
  return {
    limit: Number.isFinite(limit) && limit > 0 ? limit : 40,
    skipExisting: argv.includes('--skip-existing'),
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Commons API rate-limituje (429) przy wielu zapytaniach pod rząd - kilka prób z rosnącym
// odstępem, zanim faktycznie zrezygnujemy z tego gatunku.
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
  url.searchParams.set('gsrnamespace', '6') // namespace 6 = File:
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
  const { limit, skipExisting } = parseArgs(process.argv.slice(2))
  const species = JSON.parse(await readFile(speciesPath, 'utf-8'))

  for (const entry of species) {
    if (skipExisting) {
      try {
        await readFile(path.join(outDir, entry.id, 'source.json'), 'utf-8')
        console.log(`\n=== ${entry.id} - pominięto (już pobrane, --skip-existing) ===`)
        continue
      } catch {
        // brak source.json - pobierz normalnie
      }
    }

    const query = entry.nameLatin || entry.nameCommon
    console.log(`\n=== ${entry.id} (${query}) ===`)
    await sleep(1500) // odstęp między gatunkami, żeby nie prowokować rate-limitu Commons
    let results = []
    try {
      results = await searchCommonsImages(query, limit)
    } catch (error) {
      console.error(`  Błąd wyszukiwania: ${error.message}`)
      continue
    }

    if (results.length === 0) {
      console.warn('  Brak wyników - spróbuj ręcznie wyszukać na commons.wikimedia.org')
      continue
    }

    const speciesDir = path.join(outDir, entry.id)
    await mkdir(speciesDir, { recursive: true })

    const sources = []
    let index = 0
    for (const result of results) {
      if (!result.thumbUrl) continue
      index += 1
      const ext = path.extname(new URL(result.thumbUrl).pathname) || '.jpg'
      const fileName = `${String(index).padStart(3, '0')}${ext}`
      const destPath = path.join(speciesDir, fileName)
      try {
        await downloadImage(result.thumbUrl, destPath)
        sources.push({ file: fileName, ...result })
        console.log(`  ✓ ${fileName} <- ${result.pageUrl}`)
      } catch (error) {
        console.error(`  ✗ ${fileName}: ${error.message}`)
      }
    }

    await writeFile(path.join(speciesDir, 'source.json'), JSON.stringify(sources, null, 2), 'utf-8')
  }

  console.log(
    `\nGotowe. Przejrzyj zdjęcia w ${path.relative(repoRoot, outDir)}/<gatunek>/, usuń błędne/` +
      `nieostre/nie-ten-gatunek, i przenieś zaakceptowane do dataset/<gatunek>/ przed treningiem.`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
