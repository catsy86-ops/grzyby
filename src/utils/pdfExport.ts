import type { Finding } from '../db/schema'
import { countSpeciesDiversity, formatDuration, formatWeight, sumWeightGrams } from './tripStats'

export interface PdfExportOptions {
  title: string
  subtitle?: string
  tripInfo?: { startedAt: number; endedAt: number | null }
}

const MARGIN = 14
const LINE_HEIGHT = 6

// Generowane w 100% po stronie klienta (jsPDF) - bez wysyłania danych na żaden serwer, spójne
// z offline-first charakterem apki. Prosty, tekstowy układ zamiast pełnego layoutu (react-pdf)
// - to eksport podsumowania do wydruku/archiwum, nie osobny silnik renderowania dokumentów.
export async function exportFindingsToPdf(findings: Finding[], options: PdfExportOptions): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  let y = MARGIN

  doc.setFontSize(16)
  doc.text(options.title, MARGIN, y)
  y += LINE_HEIGHT + 2

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

  doc.setDrawColor(200)
  doc.line(MARGIN, y, 210 - MARGIN, y)
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
      const noteLines = doc.splitTextToSize(finding.notes, 210 - MARGIN * 2) as string[]
      doc.text(noteLines, MARGIN, y)
      y += LINE_HEIGHT * noteLines.length
    }

    y += 3
  }

  return doc.output('blob')
}
