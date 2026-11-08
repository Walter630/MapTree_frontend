import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { nextTick } from 'vue'
import { routerKey, routeLocationKey } from 'vue-router'

const post = vi.fn()
const get = vi.fn()

vi.mock('@/plugins/apiConnect', () => ({
  apiConnect: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
  },
}))

import PruningRegistration from '../PruningRegistration.vue'

// jsdom não implementa APIs usadas por componentes Vuetify (spinner de loading e overlay do select).
globalThis.ResizeObserver =
  globalThis.ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
// @ts-expect-error jsdom não define visualViewport, usado pelo overlay do VSelect
globalThis.visualViewport = globalThis.visualViewport || {
  addEventListener() {},
  removeEventListener() {},
  width: 0,
  height: 0,
}

const vuetify = createVuetify({ components, directives })

const route = {
  path: '/user/podas/nova',
  fullPath: '/user/podas/nova',
  params: {},
  query: {},
  hash: '',
  name: undefined,
  meta: {},
  matched: [],
}

const trees = [
  { id: 'tree-0001', species: { commonName: 'Ipê' }, latitude: -3.7, longitude: -38.5 },
  { id: 'tree-0002', species: { commonName: 'Oiti' }, latitude: -3.8, longitude: -38.6 },
]

function mountPage() {
  const push = vi.fn()
  const back = vi.fn()
  const wrapper = mount(PruningRegistration, {
    global: {
      plugins: [vuetify],
      provide: {
        [routerKey as symbol]: { push, back, currentRoute: { value: route } },
        [routeLocationKey as symbol]: route,
      },
      stubs: {
        PageHeader: true,
      },
    },
  })
  return { wrapper, push, back }
}

describe('PruningRegistration', () => {
  beforeEach(() => {
    post.mockReset()
    get.mockReset()
    get.mockResolvedValue({ data: trees })
  })

  async function fillAndSubmit(wrapper: ReturnType<typeof mountPage>['wrapper']) {
    const vm = wrapper.vm as unknown as {
      form: { idTree: string; type: string; date: string; observations: string }
      submit: () => Promise<void>
    }
    vm.form.idTree = 'tree-0001'
    vm.form.type = 'LIGHT'
    vm.form.date = '2024-05-10'
    vm.form.observations = 'Limpeza básica'
    await nextTick()
    await vm.submit()
    await flushPromises()
  }

  it('não envia idUser nem dateTree no payload de poda', async () => {
    post.mockResolvedValue({ status: 201, data: {} })
    const { wrapper } = mountPage()
    await flushPromises()

    await fillAndSubmit(wrapper)

    expect(post).toHaveBeenCalledTimes(1)
    const url = post.mock.calls[0]![0]
    const payload = post.mock.calls[0]![1] as Record<string, unknown>
    expect(url).toBe('/pruning')
    expect('idUser' in payload).toBe(false)
    expect('dateTree' in payload).toBe(false)
    expect(payload).toMatchObject({
      idTree: 'tree-0001',
      type: 'LIGHT',
      date: '2024-05-10T12:00:00-03:00',
      observations: 'Limpeza básica',
    })
  })

  it('mostra sucesso somente após resposta real da API', async () => {
    post.mockResolvedValue({ status: 201, data: {} })
    const { wrapper } = mountPage()
    await flushPromises()

    const vm = wrapper.vm as unknown as { showSuccess: boolean }
    expect(vm.showSuccess).toBe(false)

    await fillAndSubmit(wrapper)

    expect(vm.showSuccess).toBe(true)
  })

  it('em erro não declara sucesso e exibe mensagem PT-BR', async () => {
    post.mockRejectedValue({ response: { status: 401 } })
    const { wrapper } = mountPage()
    await flushPromises()

    await fillAndSubmit(wrapper)

    const vm = wrapper.vm as unknown as {
      showSuccess: boolean
      showError: boolean
      errorMessage: string
    }
    expect(vm.showSuccess).toBe(false)
    expect(vm.showError).toBe(true)
    expect(vm.errorMessage).toBe('Sua sessão expirou. Entre novamente.')
  })
})
