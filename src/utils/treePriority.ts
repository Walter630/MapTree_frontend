export type TreeUrgency = 'CRITICAL' | 'HIGH' | 'MEDIUM'

export interface TreePriorityInput {
  id?: string | number
  status?: string | null
  lat?: number | string | null
  lng?: number | string | null
  latitude?: number | string | null
  longitude?: number | string | null
  aiPrediction?: {
    estimated_height_m?: number | null
    wire_height_m?: number | null
    will_reach_wire?: boolean | null
    days_to_wire?: number | null
    risk_status?: string | null
  } | null
  currentHeight?: number | null
  wireHeight?: number | null
}

export interface PrioritizedTree<T extends TreePriorityInput = TreePriorityInput> {
  tree: T
  priorityScore: number
  urgency: TreeUrgency | null
  needsPruning: boolean
  reason: string
  recommendedAction: string
  heightRatio: number | null
  daysToWire: number | null
}

const PRUNING_STATUSES = new Set(['TO_PRUNE', 'CRITICAL'])

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function getTreeHeightRatio(tree: TreePriorityInput): number | null {
  const prediction = tree.aiPrediction
  const height = numberOrNull(prediction?.estimated_height_m ?? tree.currentHeight)
  const wire = numberOrNull(prediction?.wire_height_m ?? tree.wireHeight)

  if (height === null || wire === null || wire <= 0) return null
  return height / wire
}

export function isTreeForPruning(tree: TreePriorityInput): boolean {
  const status = String(tree.status || '').toUpperCase()
  const ratio = getTreeHeightRatio(tree)
  const prediction = tree.aiPrediction

  return (
    PRUNING_STATUSES.has(status) ||
    ratio !== null && ratio >= 0.9 ||
    prediction?.will_reach_wire === true
  )
}

export function prioritizeTree<T extends TreePriorityInput>(tree: T): PrioritizedTree<T> {
  const status = String(tree.status || '').toUpperCase()
  const ratio = getTreeHeightRatio(tree)
  const prediction = tree.aiPrediction
  const daysToWire = numberOrNull(prediction?.days_to_wire)
  const needsPruning = isTreeForPruning(tree)

  let priorityScore = 0
  if (status === 'CRITICAL') priorityScore += 70
  else if (status === 'TO_PRUNE') priorityScore += 55
  else if (status === 'UNDER_OBSERVATION') priorityScore += 20

  if (ratio !== null) priorityScore += Math.min(Math.round(ratio * 30), 35)
  if (prediction?.will_reach_wire) priorityScore += 20
  if (daysToWire !== null && daysToWire <= 30) priorityScore += 15
  else if (daysToWire !== null && daysToWire <= 90) priorityScore += 8

  priorityScore = Math.min(priorityScore, 100)

  let urgency: TreeUrgency | null = null
  if (needsPruning) {
    urgency = status === 'CRITICAL' || (ratio !== null && ratio >= 1) || prediction?.will_reach_wire
      ? 'CRITICAL'
      : 'HIGH'
  } else if (status === 'UNDER_OBSERVATION') {
    urgency = 'MEDIUM'
  }

  let reason = 'Sem indicação de poda no momento.'
  let recommendedAction = 'Acompanhar normalmente.'
  if (urgency === 'CRITICAL') {
    reason = 'A árvore está em contato ou com risco iminente na fiação.'
    recommendedAction = 'Programar poda urgente.'
  } else if (urgency === 'HIGH') {
    reason = 'A árvore foi marcada para poda ou está próxima da fiação.'
    recommendedAction = 'Incluir na próxima rota de poda.'
  } else if (urgency === 'MEDIUM') {
    reason = 'A árvore está em observação e precisa de acompanhamento.'
    recommendedAction = 'Reavaliar antes de montar a rota.'
  }

  return {
    tree,
    priorityScore,
    urgency,
    needsPruning,
    reason,
    recommendedAction,
    heightRatio: ratio,
    daysToWire,
  }
}

export function prioritizeTrees<T extends TreePriorityInput>(trees: T[]): PrioritizedTree<T>[] {
  return trees
    .map(prioritizeTree)
    .sort((a, b) => b.priorityScore - a.priorityScore)
}

export function urgencyLabel(urgency: TreeUrgency | null): string {
  const labels: Record<string, string> = {
    CRITICAL: 'Urgente',
    HIGH: 'Prioridade alta',
    MEDIUM: 'Observar',
  }
  return labels[urgency || ''] || 'Sem ação'
}

export function urgencyColor(urgency: TreeUrgency | null): string {
  const colors: Record<string, string> = {
    CRITICAL: 'error',
    HIGH: 'warning',
    MEDIUM: 'info',
  }
  return colors[urgency || ''] || 'success'
}
