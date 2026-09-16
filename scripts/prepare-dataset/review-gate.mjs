// Bramka RĘCZNEJ RECENZJI - w odróżnieniu od sanity-filter.mjs (filtr techniczny) ten skrypt
// wymusza, żeby do dataset/<id>/ trafiły WYŁĄCZNIE zdjęcia jawnie zaakceptowane przez człowieka.
// Bez tego kroku sanity-filter.mjs sam w sobie tworzy pełny dataset/ (bo tylko odsiewa uszkodzone
// pliki/duplikaty), więc README-owa instrukcja "obejrzyj każde zdjęcie" była łatwa do pominięcia
// w praktyce - dokładnie to się stało (dataset/ = raw/ minus szum techniczny, zero realnej
// weryfikacji). Ten skrypt czyni pominięcie recenzji niemożliwym mechanicznie, nie tylko
// niezalecanym w dokumentacji.
//
// Użycie (po sanity-filter.mjs, PRZED train.py):
//   1. Dla każdego gatunku utwórz scripts/prepare-dataset/reviewed/<species-id>.json:
//        {
//          "reviewer": "twoje-imie-lub-nick",
//          "reviewedAt": "2026-09-16",
//          "acceptedFiles": ["001.jpg", "003.jpg", ...]
//        }
//      (tylko nazwy plików faktycznie obejrzanych i potwierdzonych jako właściwy gatunek/etap
//      rozwoju/jakość zdjęcia - patrz kryteria w scripts/prepare-dataset/README.md).
//   2. node scripts/prepare-dataset/review-gate.mjs
//      Usuwa z dataset/<id>/ każdy plik, którego nie ma na liście acceptedFiles - dataset/
//      po przejściu tego skryptu zawiera TYLKO zrecenzjonowane zdjęcia. Brakujący manifest dla
//      danego katalogu w dataset/ = błąd (exit 1), nie cichy no-op.

import { readdir, readFile, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')
const datasetDir = path.join(repoRoot, 'dataset')
const reviewedDir = path.join(__dirname, 'reviewed')

async function loadManifest(speciesId) {
  const manifestPath = path.join(reviewedDir, `${speciesId}.json`)
  let raw
  try {
    raw = await readFile(manifestPath, 'utf-8')
  } catch {
    return null
  }
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed.acceptedFiles) || !parsed.acceptedFiles.every((f) => typeof f === 'string')) {
    throw new Error(`${manifestPath}: pole "acceptedFiles" musi być tablicą nazw plików (string[])`)
  }
  return parsed
}

async function gateSpeciesDir(speciesId) {
  const manifest = await loadManifest(speciesId)
  if (!manifest) {
    return { speciesId, error: `brak manifestu scripts/prepare-dataset/reviewed/${speciesId}.json` }
  }

  const dirPath = path.join(datasetDir, speciesId)
  const accepted = new Set(manifest.acceptedFiles)
  const entries = await readdir(dirPath, { withFileTypes: true })
  const files = entries.filter((e) => e.isFile()).map((e) => e.name)

  let removed = 0
  for (const fileName of files) {
    if (!accepted.has(fileName)) {
      await rm(path.join(dirPath, fileName))
      removed++
    }
  }

  const missingFromDataset = manifest.acceptedFiles.filter((f) => !files.includes(f))
  const kept = files.length - removed

  return { speciesId, kept, removed, missingFromDataset }
}

async function main() {
  const entries = await readdir(datasetDir, { withFileTypes: true })
  const speciesDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name)

  if (speciesDirs.length === 0) {
    console.error(
      `Brak podkatalogów w ${path.relative(repoRoot, datasetDir)} - uruchom najpierw sanity-filter.mjs.`,
    )
    process.exitCode = 1
    return
  }

  const errors = []
  let totalKept = 0
  for (const speciesId of speciesDirs) {
    const dirStat = await stat(path.join(datasetDir, speciesId))
    if (!dirStat.isDirectory()) continue
    const result = await gateSpeciesDir(speciesId)
    if (result.error) {
      errors.push(result)
      console.log(`${result.speciesId}: BŁĄD - ${result.error}`)
      continue
    }
    totalKept += result.kept
    console.log(
      `${result.speciesId}: ${result.kept} zrecenzjonowanych zachowanych, ${result.removed} niezrecenzjonowanych usuniętych` +
        (result.missingFromDataset.length > 0
          ? ` (UWAGA: ${result.missingFromDataset.length} plików z manifestu nie znaleziono w dataset/ - literówka w nazwie?)`
          : ''),
    )
  }

  if (errors.length > 0) {
    console.error(
      `\n${errors.length} gatunków bez manifestu recenzji - dataset/ NIE jest gotowy do treningu. ` +
        'Zobacz komentarz na górze tego pliku, jak utworzyć scripts/prepare-dataset/reviewed/<id>.json.',
    )
    process.exitCode = 1
    return
  }

  console.log(`\nRazem: ${totalKept} zrecenzjonowanych zdjęć w ${path.relative(repoRoot, datasetDir)}/.`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
