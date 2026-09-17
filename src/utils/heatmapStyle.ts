// Styl punktu "mapy cieplnej" własnych znalezisk (patrz docs/MAP-ROADMAP.md, Część 1 pkt 4) -
// gęstość wyrażona przez rozmiar/przezroczystość okręgu, nie przez osobną bibliotekę
// (leaflet.heat) - CircleMarker z react-leaflet wystarcza i nie dodaje nowej zależności.

export interface HeatmapPointStyle {
  radius: number
  fillOpacity: number
}

const MIN_RADIUS = 12
const MAX_RADIUS = 32
const MIN_OPACITY = 0.25
const MAX_OPACITY = 0.65

// Poniżej tej liczby znalezisk mapa cieplna wyglądałaby ubogo/losowo (kilka rozrzuconych,
// niewielkich kółek nie tworzy żadnego czytelnego wzorca "gorących miejsc") - patrz zastrzeżenie
// w MAP-ROADMAP.md. Przełącznik w UI jest wyłączony poniżej tego progu.
export const MIN_FINDINGS_FOR_HEATMAP = 10

export function heatmapStyleForCount(count: number, maxCount: number): HeatmapPointStyle {
  const ratio = maxCount > 1 ? Math.min(count / maxCount, 1) : 1
  return {
    radius: MIN_RADIUS + ratio * (MAX_RADIUS - MIN_RADIUS),
    fillOpacity: MIN_OPACITY + ratio * (MAX_OPACITY - MIN_OPACITY),
  }
}
