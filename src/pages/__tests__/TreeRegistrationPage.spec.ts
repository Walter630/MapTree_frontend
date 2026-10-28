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

import TreeRegistrationPage from '../TreeRegistrationPage.vue'

// jsdom não implementa APIs usadas por componentes Vuetify (spinner de loading e overlay do select).
globalThis.ResizeObserver = globalThis.ResizeObserver || class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error jsdom não define visualViewport, usado pelo overlay do VSelect
globalThis.visualViewport = globalThis.visualViewport || { addEventListener() {}, removeEventListener() {}, width: 0, height: 0 }

const vuetify = createVuetify({ components, directives })

const route = { path: '/user', fullPath: '/user', params: {}, query: {}, hash: '', name: undefined, meta: {}, matched: [] }

const species = [
  { id: 'sp-1', commonName: 'Ipê', scientificName: 'Handroanthus' },
  { id: 'sp-2', commonName: 'Oiti', scientificName: 'Licania tomentosa' },
]

function mountPage() {
  const push = vi.fn()
  const wrapper = mount(TreeRegistrationPage, {
    global: {
      plugins: [vuetify],
      provide: {
        [routerKey as symbol]: { push, back: vi.fn(), currentRoute: { value: route } },
        [routeLocationKey as symbol]: route,
      },
      stubs: {
        PageHeader: true,
      },
    },
  })
  return { wrapper, push }
}

describe('TreeRegistrationPage', () => {
  beforeEach(() => {
    post.mockReset()
    get.mockReset()
    get.mockResolvedValue({ data: species })
    post.mockResolvedValue({ status: 201, data: {} })
  })

  async function fillAndSubmit(wrapper: ReturnType<typeof mountPage>['wrapper'], overrides: {
    latitude?: string
    longitude?: string
    age?: string
    speciesId?: string
  } = {}) {
    const vm = wrapper.vm as unknown as {
      form: { speciesId: string, latitude: string, longitude: string, age: string }
      submit: () => Promise<void>
    }
    vm.form.speciesId = overrides.speciesId ?? 'sp-2'
    vm.form.latitude = overrides.latitude ?? '-3.7319'
    vm.form.longitude = overrides.longitude ?? '-38.5267'
    vm.form.age = overrides.age ?? ''
    await nextTick()
    await vm.submit()
    await flushPromises()
  }

  it('monta o payload com idSpecies/latitude/longitude numéricos e omite age quando vazio', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    await fillAndSubmit(wrapper, { speciesId: 'sp-2', latitude: '-3.7319', longitude: '-38.5267', age: '' })

    expect(post).toHaveBeenCalledTimes(1)
    const url = post.mock.calls[0]![0]
    const payload = post.mock.calls[0]![1] as Record<string, unknown>
    expect(url).toBe('/trees')
    expect(payload.idSpecies).toBe('sp-2')
    expect(payload.latitude).toBe(-3.7319)
    expect(payload.longitude).toBe(-38.5267)
    expect(typeof payload.latitude).toBe('number')
    expect(typeof payload.longitude).toBe('number')
    expect('age' in payload).toBe(false)
    expect('speciesId' in payload).toBe(false)
    expect('lat' in payload).toBe(false)
    expect('lng' in payload).toBe(false)
  })

  it('envia age em ISO quando preenchido', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    await fillAndSubmit(wrapper, { age: '2010' })

    const payload = post.mock.calls[0]![1] as Record<string, unknown>
    expect(payload.age).toBe(new Date('2010-01-01').toISOString())
  })

  it('usa o id selecionado como idSpecies', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    await fillAndSubmit(wrapper, { speciesId: 'sp-1' })

    expect((post.mock.calls[0]![1] as Record<string, unknown>).idSpecies).toBe('sp-1')
  })

  it('rejeita coordenada fora de limite sem chamar a API', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    await fillAndSubmit(wrapper, { latitude: '200' })

    expect(post).not.toHaveBeenCalled()
  })
})
