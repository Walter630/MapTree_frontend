import {
  getTreeDensityCategory,
  type TreeDensityDimension,
  type TreeDensityInput,
} from './treeDensity'

export type TreeMapQuickFilter = 'CRITICAL' | 'TO_PRUNE' | 'ALL'

export function selectTreeMapTrees<T extends TreeDensityInput>(
  trees: readonly T[],
  statusFilter: TreeMapQuickFilter,
  dimension: TreeDensityDimension,
  category = 'all',
): T[] {
  return trees.filter((tree) => {
    const status = tree.effectiveStatus || tree.status
    const statusMatches = statusFilter === 'ALL' || status === statusFilter
    const categoryMatches =
      category === 'all' || getTreeDensityCategory(tree, dimension) === category
    return statusMatches && categoryMatches
  })
}
