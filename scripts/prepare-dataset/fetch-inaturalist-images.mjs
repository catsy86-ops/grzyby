// Drugie (obok fetch-reference-images.mjs/Wikimedia Commons) źródło kandydatów na zdjęcia
// treningowe: obserwacje "research grade" z iNaturalist, filtrowane licencją i (domyślnie)
// lokalizacją Polska - w praktyce bliższe realnym zdjęciom robionym telefonem w lesie niż
// częściowo studyjne/encyklopedyczne fotografie z Commons, więc dobrze uzupełniają się z nimi.
//
// "Research grade" oznacza, że co najmniej dwóch niezależnych użytkowników iNaturalist zgodziło
// się co do identyfikacji gatunku - to NIE jest to samo co pewność 100%, więc (dokładnie jak przy
// Commons) KAŻDE zdjęcie nadal wymaga ręcznego przejrzenia przed treningiem, zwłaszcza przy
// gatunkach trujących/śmiertelnie trujących w src/data/species.json.
//
// Użycie:
//   node scripts/prepare-dataset/fetch-inaturalist-images.mjs [--limit 40] [--place-id 7800]
//
// --place-id domyślnie 7800 (Polska, zweryfikowane przez /v1/places/autocomplete?q=Poland) -
// przekaż 0, żeby wyłączyć filtr geograficzny (np. dla szerszego, środkowoeuropejskiego zasięgu
// gatunku). Wynik trafia do scripts/prepare-dataset/raw/<species-id>/ (prefiks nazw plików
// "inat-", żeby nie kolidować z numeracją z fetch-reference-images.mjs) razem z
// source-inaturalist.json (licencja CC wymaga zachowania atrybucji - patrz pole "attribution").

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')
const speciesPath = path.join(repoRoot, 'src/data/species.json')
const outDir = path.join(__dirname, 'raw')

const INATURALIST_API = 'https://api.inaturalist.org/v1/observations'
const USER_AGENT = 'LYSY-mushroom-app-dataset-prep/1.0 (offline educational hobby project)'
// Tylko licencje pozwalające na redystrybucję pochodnego użycia (trening modelu) z atrybucją -
// bez wariantów -ND (no derivatives), bo wytrenowany model to w istocie utwór pochodny.
const ALLOWED_LICENSES = ['cc0', 'cc-by', 'cc-by-nc', 'cc-by-sa', 'cc-by-nc-sa']
const DEFAULT_POLAND_PLACE_ID = 7800
const PER_PAGE = 30

function parseArgs(argv) {
  const limitFlagIndex = argv.indexOf('--limit')
  const limit = limitFlagIndex !== -1 ? Number(argv[limitFlagIndex + 1]) : 40
  const placeFlagIndex = argv.indexOf('--place-id')
  const placeId = placeFlagIndex !== -1 ? Number(argv[placeFlagIndex + 1]) : DEFAULT_POLAND_PLACE_ID
  return {
    limit: Number.isFinite(limit) && limit > 0 ? limit : 40,
    placeId: Number.isFinite(placeId) && placeId > 0 ? placeId : null,
    skipExisting: argv.includes('--skip-existing'),
  }
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
    console.warn(`  429 od iNaturalist API - czekam ${waitMs}ms i próbuję ponownie (${attempt}/${maxAttempts - 1})...`)
    await sleep(waitMs)
  }
  throw new Error('unreachable')
}

// Zbiera zdjęcia ze strony wyników aż do `limit` albo wyczerpania obserwacji - jedna obserwacja
// może mieć kilka zdjęć, więc liczba stron potrzebnych do `limit` zdjęć nie jest znana z góry.
async function searchINaturalistImages(latinName, limit, placeId) {
  const collected = []
  let page = 1
  while (collected.length < limit) {
    const url = new URL(INATURALIST_API)
    url.searchParams.set('taxon_name', latinName)
    url.searchParams.set('quality_grade', 'research')
    url.searchParams.set('photos', 'true')
    url.searchParams.set('photo_license', ALLOWED_LICENSES.join(','))
    url.searchParams.set('per_page', String(PER_PAGE))
    url.searchParams.set('page', String(page))
    url.searchParams.set('order_by', 'votes')
    if (placeId) url.searchParams.set('place_id', String(placeId))

    const response = await fetchWithRetry(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } })
    if (!response.ok) throw new Error(`iNaturalist API zwróciło ${response.status} dla "${latinName}"`)
    const data = await response.json()
    const results = data.results ?? []
    if (results.length === 0) break

    for (const observation of results) {
      for (const photo of observation.photos ?? []) {
        if (!ALLOWED_LICENSES.includes(photo.license_code)) continue
        collected.push({
          // "square"/"small"/"medium"/"large"/"original" - podmiana rozmiaru w tym samym URL-u,
          // zamiast osobnego pola w odpowiedzi API (patrz dokumentacja iNaturalist - photo.url
          // domyślnie wskazuje na miniaturkę "square").
          url: photo.url.replace('square.', 'medium.'),
          license: photo.license_code,
          attribution: photo.attribution,
          observationUrl: `https://www.inaturalist.org/observations/${observation.id}`,
        })
        if (collected.length >= limit) break
      }
      if (collected.length >= limit) break
    }

    if (results.length < PER_PAGE) break // ostatnia strona
    page += 1
    await sleep(1200) // iNaturalist prosi o max ~1 zapytanie/sekundę
  }
  return collected
}

async function downloadImage(url, destPath) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) throw new Error(`Nie udało się pobrać ${url} (${response.status})`)
  const buffer = Buffer.from(await response.arrayBuffer())
  await writeFile(destPath, buffer)
}

async function main() {
  const { limit, placeId, skipExisting } = parseArgs(process.argv.slice(2))
  const species = JSON.parse(await readFile(speciesPath, 'utf-8'))

  console.log(
    placeId
      ? `Filtr geograficzny: place_id=${placeId} (domyślnie Polska - przekaż --place-id 0, żeby wyłączyć).`
      : 'Filtr geograficzny wyłączony (--place-id 0) - obserwacje z całego świata.',
  )

  for (const entry of species) {
    const speciesDir = path.join(outDir, entry.id)
    if (skipExisting) {
      try {
        await readFile(path.join(speciesDir, 'source-inaturalist.json'), 'utf-8')
        console.log(`\n=== ${entry.id} - pominięto (już pobrane, --skip-existing) ===`)
        continue
      } catch {
        // brak source-inaturalist.json - pobierz normalnie
      }
    }

    const latinName = entry.nameLatin
    if (!latinName) {
      console.warn(`\n=== ${entry.id} - pominięto (brak nameLatin w species.json) ===`)
      continue
    }

    console.log(`\n=== ${entry.id} (${latinName}) ===`)
    await sleep(1200)
    let results = []
    try {
      results = await searchINaturalistImages(latinName, limit, placeId)
    } catch (error) {
      console.error(`  Błąd wyszukiwania: ${error.message}`)
      continue
    }

    if (results.length === 0) {
      console.warn(
        '  Brak wyników research-grade z dopuszczalną licencją' +
          (placeId ? ' w wybranym regionie' : '') +
          ' - spróbuj --place-id 0 albo sprawdź pisownię nazwy łacińskiej w species.json.',
      )
      continue
    }

    await mkdir(speciesDir, { recursive: true })

    const sources = []
    let index = 0
    for (const result of results) {
      index += 1
      const ext = path.extname(new URL(result.url).pathname) || '.jpg'
      const fileName = `inat-${String(index).padStart(3, '0')}${ext}`
      const destPath = path.join(speciesDir, fileName)
      try {
        await downloadImage(result.url, destPath)
        sources.push({ file: fileName, ...result })
        console.log(`  ✓ ${fileName} <- ${result.observationUrl}`)
      } catch (error) {
        console.error(`  ✗ ${fileName}: ${error.message}`)
      }
    }

    await writeFile(path.join(speciesDir, 'source-inaturalist.json'), JSON.stringify(sources, null, 2), 'utf-8')
  }

  console.log(
    `\nGotowe. Przejrzyj zdjęcia w ${path.relative(repoRoot, outDir)}/<gatunek>/ (prefiks "inat-"), ` +
      'usuń błędne/nieostre/nie-ten-gatunek, i uwzględnij zaakceptowane nazwy plików w manifeście ' +
      'scripts/prepare-dataset/reviewed/<gatunek>.json (patrz README.md, sekcja "Bramka recenzji") ' +
      'przed przepuszczeniem przez sanity-filter.mjs + review-gate.mjs.',
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
