// Filtr TECHNICZNY (nie merytoryczny) nad kandydatami z fetch-reference-images.mjs /
// fetch-negative-images.mjs: usuwa zerowe/uszkodzone pliki, oczywiste duplikaty (identyczna
// zawartość) i podejrzanie małe obrazy, po czym kopiuje ocalałe zdjęcia do dataset/<id>/ (katalog
// oczekiwany przez scripts/train-model/train.py, ignorowany przez git - patrz .gitignore).
//
// WAŻNE: to NIE jest kuracja merytoryczna. Skrypt nie wie, czy zdjęcie faktycznie przedstawia
// zadeklarowany gatunek - tylko usuwa szum techniczny (uszkodzone pliki, duplikaty, miniaturki).
// Przy grzybach trujących vs jadalnych błędna etykieta gatunku w danych treningowych to kwestia
// bezpieczeństwa użytkownika apki - ten krok jej NIE adresuje. Docelowo wciąż potrzebny jest ręczny
// przegląd opisany w scripts/prepare-dataset/README.md.
//
// Użycie:
//   node scripts/prepare-dataset/sanity-filter.mjs

import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')
const rawDir = path.join(__dirname, 'raw')
const datasetDir = path.join(repoRoot, 'dataset')

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png'])
const MIN_BYTES = 8 * 1024 // proxy dla "podejrzanie mała rozdzielczość" bez dekodowania obrazu

// Magic bytes - odrzuca pliki, które mają rozszerzenie .jpg ale nie są w ogóle obrazem (np. strona
// błędu HTML zapisana przez pomyłkę przy nieudanym pobieraniu).
function looksLikeImage(buffer) {
  if (buffer.length < 12) return false
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  const isPng =
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
  return isJpeg || isPng
}

async function filterSpeciesDir(speciesId) {
  const srcDir = path.join(rawDir, speciesId)
  const entries = await readdir(srcDir, { withFileTypes: true })
  const imageFiles = entries
    .filter((e) => e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
    .map((e) => e.name)

  const seenHashes = new Set()
  const kept = []
  const rejected = []

  for (const fileName of imageFiles) {
    const srcPath = path.join(srcDir, fileName)
    const buffer = await readFile(srcPath)

    if (buffer.length < MIN_BYTES) {
      rejected.push(`${fileName}: za mały plik (${buffer.length}B < ${MIN_BYTES}B)`)
      continue
    }
    if (!looksLikeImage(buffer)) {
      rejected.push(`${fileName}: nie wygląda na JPEG/PNG (uszkodzony lub błędny plik)`)
      continue
    }
    const hash = createHash('sha256').update(buffer).digest('hex')
    if (seenHashes.has(hash)) {
      rejected.push(`${fileName}: duplikat treści innego już zaakceptowanego pliku`)
      continue
    }
    seenHashes.add(hash)
    kept.push({ fileName, buffer })
  }

  if (kept.length === 0) return { speciesId, kept: 0, rejected }

  const destDir = path.join(datasetDir, speciesId)
  await mkdir(destDir, { recursive: true })
  for (const { fileName, buffer } of kept) {
    await writeFile(path.join(destDir, fileName), buffer)
  }

  return { speciesId, kept: kept.length, rejected }
}

async function main() {
  const rawEntries = await readdir(rawDir, { withFileTypes: true })
  const speciesDirs = rawEntries.filter((e) => e.isDirectory()).map((e) => e.name)

  if (speciesDirs.length === 0) {
    console.error(
      `Brak podkatalogów w ${path.relative(repoRoot, rawDir)} - uruchom najpierw ` +
        'fetch-reference-images.mjs (i opcjonalnie fetch-negative-images.mjs).',
    )
    process.exitCode = 1
    return
  }

  let totalKept = 0
  let totalRejected = 0
  for (const speciesId of speciesDirs) {
    const dirStat = await stat(path.join(rawDir, speciesId))
    if (!dirStat.isDirectory()) continue
    const result = await filterSpeciesDir(speciesId)
    totalKept += result.kept
    totalRejected += result.rejected.length
    console.log(`${result.speciesId}: ${result.kept} zachowane, ${result.rejected.length} odrzucone`)
    for (const reason of result.rejected) console.log(`  ✗ ${reason}`)
  }

  console.log(
    `\nRazem: ${totalKept} zdjęć skopiowanych do ${path.relative(repoRoot, datasetDir)}/, ` +
      `${totalRejected} odrzuconych z powodów technicznych.`,
  )
  console.log(
    'Przypomnienie: to filtr techniczny, nie merytoryczny - gatunek na zdjęciu wciąż nie jest ' +
      'zweryfikowany. Patrz scripts/prepare-dataset/README.md.',
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
