// Wywołuje pobranie pliku przez przeglądarkę - generyczny helper DOM, nieprzywiązany do żadnego
// konkretnego formatu eksportu (używany dla PDF/GPX/CSV/JSON z różnych widoków).
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
