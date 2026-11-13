export interface CatalogSpecies {
  id: string
  commonName: string
  scientificName?: string
  _count?: { Tree?: number; trees?: number }
}

export const NEST_ICON = '🪺'

// Símbolos de identificação visual usados no catálogo e nos marcadores.
export function speciesIcon(name = ''): string {
  const key = normalizeSpeciesName(name)
  switch (key) {
    case 'ipe amarelo':
    case 'handroanthus albus':
      return '🌼'
    case 'oiticica':
    case 'licania rigida':
      return '🌳'
    case 'mangueira':
      return '🥭'
    case 'coqueiro':
      return '🌴'
    default:
      return '🌿'
  }
}

function normalizeSpeciesName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[-\s]+/g, ' ')
    .trim()
}

export function catalogCount(species: {
  _count?: { Tree?: number; trees?: number }
}): number | undefined {
  return species._count?.Tree ?? species._count?.trees
}
