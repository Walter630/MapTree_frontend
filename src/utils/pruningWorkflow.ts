import type { TreeApiRecord } from '@/types/treeApi'

export const pruningTypes = [
  { value: 'LIGHT', title: 'Leve — limpeza básica' },
  { value: 'MODERATE', title: 'Moderada — redução de copa' },
  { value: 'HEAVY', title: 'Pesada — intervenção intensa' },
]
export function localDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}
export function treeIdentity(tree: Pick<TreeApiRecord, 'id' | 'species'>): string {
  return `${tree.species?.commonName || 'Árvore'} · #${tree.id}`
}
export function treeCoordinates(
  tree: Pick<TreeApiRecord, 'latitude' | 'longitude' | 'lat' | 'lng'>,
): string {
  const lat = tree.latitude ?? tree.lat
  const lng = tree.longitude ?? tree.lng
  if (
    lat === null ||
    lat === undefined ||
    lng === null ||
    lng === undefined ||
    !Number.isFinite(Number(lat)) ||
    !Number.isFinite(Number(lng))
  )
    return 'Localização não informada'
  return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`
}
export interface RoutePruning {
  id: string
  idTree: string
  scheduleId?: string
  date: string
  type: string
  observations?: string
  user?: { id: string; name: string }
}
export function pruningTypeLabel(type: string) {
  return pruningTypes.find((item) => item.value === type)?.title || type
}
