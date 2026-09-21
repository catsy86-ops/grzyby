import type { EdibilityStatus, Finding, Species } from '../db/schema'
import { countSpeciesDiversity, formatDuration, formatWeight, sumWeightGrams } from './tripStats'

export interface PdfExportOptions {
  title: string
  subtitle?: string
  tripInfo?: { startedAt: number; endedAt: number | null }
}

const MARGIN = 14
const LINE_HEIGHT = 6
const PAGE_WIDTH = 210
const HEADER_HEIGHT = 24

// Te same kolory co --primary/--brand-accent w index.css (light), przepisane na RGB - jsPDF nie
// czyta zmiennych CSS, więc wartości muszą być zduplikowane ręcznie tu.
const BRAND_GREEN: [number, number, number] = [22, 101, 52] // odpowiednik --color-green-800
const BRAND_AMBER: [number, number, number] = [180, 83, 9] // odpowiednik --color-amber-700

// Generowane w 100% po stronie klienta (jsPDF) - bez wysyłania danych na żaden serwer, spójne
// z offline-first charakterem apki. Prosty, tekstowy układ zamiast pełnego layoutu (react-pdf)
// - to eksport podsumowania do wydruku/archiwum, nie osobny silnik renderowania dokumentów.
export async function exportFindingsToPdf(findings: Finding[], options: PdfExportOptions): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()

  // Nagłówek marki - dotąd eksport był czysto tekstowym dokumentem, nieodróżnialnym od dowolnego
  // innego PDF-a. Pasek w kolorze --primary + odznaka gatunku (kapelusz+trzon w --brand-accent,
  // ta sama para barw co reszta apki) + nazwa apki - dokument rozpoznawalny na pierwszy rzut oka
  // jako "z Grzybobrania", nawet wydrukowany i wyjęty z kontekstu przeglądarki.
  doc.setFillColor(...BRAND_GREEN)
  doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, 'F')
  doc.setFillColor(...BRAND_AMBER)
  doc.ellipse(MARGIN + 4, 11, 4.5, 3.2, 'F')
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(MARGIN + 2.6, 11, 2.8, 5.5, 1, 1, 'F')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text('Grzybobranie', PAGE_WIDTH - MARGIN, 8, { align: 'right' })
  doc.setFontSize(16)
  doc.text(options.title, MARGIN + 13, 14)
  doc.setTextColor(0)

  let y = HEADER_HEIGHT + LINE_HEIGHT

  if (options.subtitle) {
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(options.subtitle, MARGIN, y)
    doc.setTextColor(0)
    y += LINE_HEIGHT
  }

  if (options.tripInfo) {
    doc.setFontSize(10)
    doc.setTextColor(100)
    const { startedAt, endedAt } = options.tripInfo
    doc.text(
      `${new Date(startedAt).toLocaleString('pl-PL')}${endedAt != null ? ` - ${new Date(endedAt).toLocaleString('pl-PL')}` : ''} (${formatDuration(startedAt, endedAt)})`,
      MARGIN,
      y,
    )
    doc.setTextColor(0)
    y += LINE_HEIGHT
  }

  y += 2
  doc.setFontSize(11)
  const weightGrams = sumWeightGrams(findings)
  doc.text(
    `${findings.length} znalezisk · ${countSpeciesDiversity(findings)} gatunków${weightGrams > 0 ? ` · ${formatWeight(weightGrams)}` : ''}`,
    MARGIN,
    y,
  )
  y += LINE_HEIGHT + 4

  doc.setDrawColor(...BRAND_AMBER)
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
  y += 6

  doc.setFontSize(10)
  const pageHeight = doc.internal.pageSize.getHeight()
  const sorted = [...findings].sort((a, b) => b.createdAt - a.createdAt)

  for (const finding of sorted) {
    if (y > pageHeight - MARGIN - LINE_HEIGHT * 2) {
      doc.addPage()
      y = MARGIN
    }

    doc.setFont('helvetica', 'bold')
    doc.text(finding.speciesNameGuess ?? 'Nieokreślony gatunek', MARGIN, y)
    doc.setFont('helvetica', 'normal')
    y += LINE_HEIGHT

    doc.setTextColor(100)
    const metaParts = [new Date(finding.createdAt).toLocaleString('pl-PL')]
    if (finding.latitude != null && finding.longitude != null) {
      metaParts.push(`${finding.latitude.toFixed(4)}, ${finding.longitude.toFixed(4)}`)
    }
    if (finding.weightGrams != null) metaParts.push(formatWeight(finding.weightGrams))
    doc.text(metaParts.join(' · '), MARGIN, y)
    doc.setTextColor(0)
    y += LINE_HEIGHT

    if (finding.notes) {
      const noteLines = doc.splitTextToSize(finding.notes, PAGE_WIDTH - MARGIN * 2) as string[]
      doc.text(noteLines, MARGIN, y)
      y += LINE_HEIGHT * noteLines.length
    }

    y += 3
  }

  return doc.output('blob')
}

// Te same barwy co CARD_ACCENT/CHART_COLOR w components/EdibilityBadge.tsx (skala green-500/
// yellow-500/muted/orange-500/red-600), przepisane na RGB dla jsPDF - ta sama konieczność
// duplikacji co BRAND_GREEN/BRAND_AMBER wyżej (jsPDF nie czyta tokenów CSS).
const EDIBILITY_COLOR: Record<EdibilityStatus, [number, number, number]> = {
  jadalny: [34, 197, 94],
  'warunkowo-jadalny': [234, 179, 8],
  niejadalny: [115, 115, 115],
  trujący: [249, 115, 22],
  'śmiertelnie-trujący': [220, 38, 38],
}

const EDIBILITY_LABEL: Record<EdibilityStatus, string> = {
  jadalny: 'Jadalny',
  'warunkowo-jadalny': 'Warunkowo jadalny',
  niejadalny: 'Niejadalny',
  trujący: 'Trujący',
  'śmiertelnie-trujący': 'Śmiertelnie trujący',
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    // Offline/zdjęcie niedostępne - karta i tak jest użyteczna bez zdjęcia (opis, jadalność,
    // sobowtóry to najważniejsza treść), więc to nie jest błąd blokujący cały eksport.
    return null
  }
}

// "Karta kieszonkowa" (ROZBUDOWA-ROADMAP.md Część 3 pkt 8) - jeden gatunek na jedną stronę A4,
// do wydruku i zabrania w teren bez telefonu (np. dla kogoś bez smartfona, albo jako zapasowa
// kopia offline). Drukuje WYŁĄCZNIE już zweryfikowaną treść z species.json - nie generuje ani nie
// zgaduje żadnych nowych faktów o jadalności/identyfikacji.
export async function exportSpeciesCardToPdf(species: Species, allSpecies: Species[]): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  const contentWidth = PAGE_WIDTH - MARGIN * 2

  doc.setFillColor(...BRAND_GREEN)
  doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, 'F')
  doc.setFillColor(...BRAND_AMBER)
  doc.ellipse(MARGIN + 4, 11, 4.5, 3.2, 'F')
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(MARGIN + 2.6, 11, 2.8, 5.5, 1, 1, 'F')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text('Grzybobranie - karta gatunku', PAGE_WIDTH - MARGIN, 8, { align: 'right' })
  doc.setFontSize(16)
  doc.text(species.nameCommon, MARGIN + 13, 14)
  doc.setTextColor(0)

  let y = HEADER_HEIGHT + LINE_HEIGHT + 2

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(11)
  doc.setTextColor(100)
  doc.text(species.nameLatin, MARGIN, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0)
  y += LINE_HEIGHT

  const edibilityColor = EDIBILITY_COLOR[species.edibility]
  const edibilityLabel = EDIBILITY_LABEL[species.edibility]
  const badgeWidth = doc.getTextWidth(edibilityLabel) + 6
  doc.setFillColor(...edibilityColor)
  doc.roundedRect(MARGIN, y - 4.5, badgeWidth, 6.5, 1.5, 1.5, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.text(edibilityLabel, MARGIN + 3, y)
  doc.setTextColor(0)
  doc.setFontSize(10)
  y += LINE_HEIGHT + 2

  // Zdjęcie (najlepsze dostępne w species.imageUrls) - najlepszy wysiłek, patrz
  // fetchImageAsDataUrl. Umieszczone przed opisem tekstowym, bo to pierwsze, po co ktoś sięga w
  // terenie (rozpoznanie po wyglądzie), zanim zacznie czytać.
  const imageUrl = species.imageUrls[0]
  const dataUrl = imageUrl ? await fetchImageAsDataUrl(imageUrl) : null
  if (dataUrl) {
    const imageWidth = 70
    const imageHeight = 52
    doc.addImage(dataUrl, 'JPEG', MARGIN, y, imageWidth, imageHeight)
    y += imageHeight + 4
  }

  function addField(label: string, value: string) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(label, MARGIN, y)
    doc.setFont('helvetica', 'normal')
    y += LINE_HEIGHT - 1
    doc.setFontSize(10)
    const lines = doc.splitTextToSize(value, contentWidth) as string[]
    doc.text(lines, MARGIN, y)
    y += LINE_HEIGHT * lines.length + 3
  }

  addField('Sezon', species.season)
  addField('Siedlisko', species.habitat)
  addField('Opis', species.description)

  if (species.legalProtection) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_AMBER)
    doc.text('⚠ Gatunek chroniony prawem', MARGIN, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0)
    y += LINE_HEIGHT - 1
    const lines = doc.splitTextToSize(species.legalProtection, contentWidth) as string[]
    doc.text(lines, MARGIN, y)
    y += LINE_HEIGHT * lines.length + 3
  }

  if (species.lookalikes.length > 0) {
    const names = species.lookalikes
      .map((id) => allSpecies.find((s) => s.id === id)?.nameCommon)
      .filter((name): name is string => name != null)
    if (names.length > 0) addField('Można pomylić z', names.join(', '))
  }

  if (species.preparationTips) {
    addField('Przygotowanie', species.preparationTips)
  }

  return doc.output('blob')
}
