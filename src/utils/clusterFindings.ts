export interface ClusterPoint {
  id: number
  lat: number
  lng: number
}

export interface FindingCluster {
  lat: number
  lng: number
  points: ClusterPoint[]
}

// Grupowanie kubełkowe w przestrzeni pikseli mapy (a nie stopni geograficznych) - odległość
// "40px na ekranie" ma stały, przewidywalny sens wizualny niezależnie od poziomu zoomu, w
// przeciwieństwie do stałej odległości w stopniach lat/lng (na niskim zoomie zbyt duża, na
// wysokim zbyt mała). `project` powinno zwracać współrzędne piksela świata dla danego zoomu
// (np. `map.project(latlng, zoom)`) - niezmienne względem przesunięcia (pan) mapy, więc
// przeliczanie wystarczy robić przy zmianie zoomu, nie przy każdym ruchu mapy.
export function clusterFindings(
  points: ClusterPoint[],
  project: (lat: number, lng: number) => { x: number; y: number },
  distancePx: number,
): FindingCluster[] {
  const buckets = new Map<string, ClusterPoint[]>()

  for (const point of points) {
    const { x, y } = project(point.lat, point.lng)
    const key = `${Math.floor(x / distancePx)}:${Math.floor(y / distancePx)}`
    const bucket = buckets.get(key)
    if (bucket) bucket.push(point)
    else buckets.set(key, [point])
  }

  return Array.from(buckets.values()).map((bucketPoints) => ({
    lat: bucketPoints.reduce((sum, p) => sum + p.lat, 0) / bucketPoints.length,
    lng: bucketPoints.reduce((sum, p) => sum + p.lng, 0) / bucketPoints.length,
    points: bucketPoints,
  }))
}
