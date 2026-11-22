import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import type { PruningApiRecord } from '@/types/treeApi'
import ManagerReportsView from '../ManagerReportsView.vue'

const get = vi.fn()

function mountPage() {
  return mount(ManagerReportsView, {
    global: {
      plugins: [createVuetify({ components, directives })],
      mocks: {
        $api: { get: (...args: unknown[]) => get(...args) },
        $router: { push: vi.fn() },
      },
      stubs: { PageHeader: true, VDataTable: true },
    },
  })
}

describe('ManagerReportsView', () => {
  beforeEach(() => {
    get.mockReset()
    const date = new Date().toISOString()
    const prunings: PruningApiRecord[] = Array.from({ length: 9 }, (_, index) => ({
      id: `pruning-${index}`,
      idTree: `tree-${index}`,
      date,
      type: (['LIGHT', 'MODERATE', 'HEAVY'] as const)[index % 3],
      tree: null,
      user: null,
    }))
    get.mockImplementation((path: string) =>
      Promise.resolve({ data: path === '/pruning' ? prunings : [] }),
    )
  })

  it('uses API pruning rows for the monthly chart and keeps total/type statistics', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const vm = wrapper.vm as unknown as {
      prunings: PruningApiRecord[]
      chartData: Array<{ count: number; percent: number }>
      pruningStats: Array<{ value: number }>
    }
    expect(vm.prunings).toHaveLength(9)
    expect(vm.chartData.at(-1)).toMatchObject({ count: 9, percent: 100 })
    expect(vm.pruningStats.map(({ value }) => value)).toEqual([33, 33, 33])
    expect(get).toHaveBeenCalledWith('/pruning')
  })
})
