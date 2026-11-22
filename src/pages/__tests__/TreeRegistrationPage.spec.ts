import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { nextTick } from 'vue'
import { routerKey, routeLocationKey } from 'vue-router'
import { createPinia } from 'pinia'
import { useAppStore } from '@/stores/app'
import type { UserRole } from '@/plugins/apiConnect'

const post = vi.fn()
const get = vi.fn()
const patch = vi.fn()

vi.mock('@/plugins/apiConnect', () => ({
  apiConnect: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
    patch: (...args: unknown[]) => patch(...args),
    createTree: (payload: unknown, key: string) =>
      post('/trees', payload, { headers: { 'Idempotency-Key': key } }),
  },
}))

import TreeRegistrationPage from '../TreeRegistrationPage.vue'

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
  path: '/user',
  fullPath: '/user',
  params: {},
  query: {},
  hash: '',
  name: undefined,
  meta: {},
  matched: [],
}

const species = [
  { id: 'sp-1', commonName: 'Ipê', scientificName: 'Handroanthus' },
  { id: 'sp-2', commonName: 'Oiti', scientificName: 'Licania tomentosa' },
]

const municipalityGeometry = {
  type: 'Polygon',
  coordinates: [[
    [-39, -4],
    [-38, -4],
    [-38, -3],
    [-39, -3],
    [-39, -4],
  ]],
}

function mountPage(role = 'USER') {
  const push = vi.fn()
  const pinia = createPinia()
  useAppStore(pinia).setUser({
    id: 'employee-1',
    name: 'Funcionário de teste',
    cpf: '',
    email: 'employee@example.test',
    phone: '',
    role: role as UserRole,
    isActive: true,
  })
  const wrapper = mount(TreeRegistrationPage, {
    global: {
      plugins: [vuetify, pinia],
      provide: {
        [routerKey as symbol]: { push, back: vi.fn(), currentRoute: { value: route } },
        [routeLocationKey as symbol]: route,
      },
      stubs: {
        PageHeader: true,
        MunicipalityLocationPicker: true,
      },
    },
  })
  return { wrapper, push }
}

describe('TreeRegistrationPage', () => {
  beforeEach(() => {
    post.mockReset()
    get.mockReset()
    localStorage.clear()
    get.mockImplementation((url: string) => {
      if (url === '/species') return Promise.resolve({ data: species })
      if (url === '/users/me/profile') {
        return Promise.resolve({ data: { organization: { id: 'company-1' } } })
      }
      if (url === '/organizations/company-1') {
        return Promise.resolve({
          data: {
            id: 'company-1',
            municipalityName: 'Fortaleza',
            municipalityUf: 'CE',
            municipalityGeometry,
          },
        })
      }
      return Promise.reject(new Error(`GET inesperado: ${url}`))
    })
    post.mockResolvedValue({ status: 201, data: {} })
    route.path = '/user'
    route.params = {}
    route.query = {}
    patch.mockReset().mockResolvedValue({
      data: { id: 'tree-9', updatedAt: '2026-11-17T14:00:00.000Z' },
    })
  })

  it('preenche latitude e longitude vindas do mapa', async () => {
    Object.assign(route.query, { latitude: '-3.731900', longitude: '-38.526700' })
    const { wrapper } = mountPage()
    await flushPromises()

    const vm = wrapper.vm as unknown as { form: { latitude: string; longitude: string } }
    expect(vm.form.latitude).toBe('-3.731900')
    expect(vm.form.longitude).toBe('-38.526700')
  })

  it('oferece retorno ao mapa com região e posição depois de salvar', async () => {
    Object.assign(route.query, {
      latitude: '-3.7319',
      longitude: '-38.5267',
      returnMap: '/user/mapUser',
      treeMapLat: '-3.73',
      treeMapLng: '-38.52',
      treeMapZoom: '16',
      treeMapRegion: 'fortaleza',
      treeMapFilter: 'CRITICAL',
    })
    post.mockResolvedValueOnce({ status: 201, data: { id: 'tree-9' } })
    const { wrapper, push } = mountPage()
    await flushPromises()

    await fillAndSubmit(wrapper)
    await wrapper.get('[data-testid="return-to-map"]').trigger('click')

    expect(push).toHaveBeenCalledWith({
      path: '/user/mapUser',
      query: {
        treeMapLat: '-3.73',
        treeMapLng: '-38.52',
        treeMapZoom: '16',
        treeMapRegion: 'fortaleza',
        treeMapFilter: 'CRITICAL',
      },
    })
  })

  it('carrega e atualiza apenas a árvore do funcionário com controle de versão', async () => {
    const updatedAt = '2026-11-17T13:00:00.000Z'
    route.path = '/user/trees/tree-9/edit'
    route.params = { treeId: 'tree-9' }
    route.query = { returnMap: '/user/mapUser' }
    get.mockImplementation((url: string) => {
      if (url === '/species') return Promise.resolve({ data: species })
      if (url === '/trees/tree-9')
        return Promise.resolve({
          data: {
            id: 'tree-9',
            createdById: 'employee-1',
            updatedAt,
            idSpecies: 'sp-1',
            latitude: -3.73,
            longitude: -38.52,
            age: '2018-01-01T00:00:00.000Z',
            status: 'NORMAL',
            vigor: 'GOOD',
          },
        })
      throw new Error(`GET inesperado: ${url}`)
    })
    const { wrapper } = mountPage()
    await flushPromises()

    const vm = wrapper.vm as unknown as {
      form: { speciesId: string; latitude: string; longitude: string; age: string }
      submit: () => Promise<void>
    }
    expect(vm.form).toMatchObject({
      speciesId: 'sp-1',
      latitude: '-3.73',
      longitude: '-38.52',
      age: '2018',
    })
    vm.form.latitude = '-3.731'
    await vm.submit()
    await flushPromises()

    expect(patch).toHaveBeenCalledWith(
      '/trees/tree-9',
      expect.objectContaining({
        idSpecies: 'sp-1',
        latitude: -3.731,
        longitude: -38.52,
        expectedUpdatedAt: new Date(updatedAt).toISOString(),
      }),
    )
    expect(wrapper.text()).toContain('Árvore atualizada com sucesso.')
    expect(vm.form.latitude).toBe('-3.731')
  })

  it('não abre a edição direta de árvore criada por outro funcionário', async () => {
    route.path = '/user/trees/tree-9/edit'
    route.params = { treeId: 'tree-9' }
    get.mockImplementation((url: string) => {
      if (url === '/species') return Promise.resolve({ data: species })
      if (url === '/trees/tree-9')
        return Promise.resolve({
          data: {
            id: 'tree-9',
            createdById: 'employee-2',
            updatedAt: '2026-11-17T13:00:00.000Z',
          },
        })
      throw new Error(`GET inesperado: ${url}`)
    })
    const { wrapper } = mountPage()
    await flushPromises()

    expect(wrapper.get('[data-testid="edit-load-error"]').text()).toContain(
      'Você só pode editar árvores cadastradas por você',
    )
    expect(wrapper.find('[data-testid="initial-height"]').exists()).toBe(false)
    expect(patch).not.toHaveBeenCalled()
  })

  async function fillAndSubmit(
    wrapper: ReturnType<typeof mountPage>['wrapper'],
    overrides: {
      latitude?: string
      longitude?: string
      age?: string
      speciesId?: string
      height?: string
      canopyWidth?: string
    } = {},
  ) {
    const vm = wrapper.vm as unknown as {
      form: {
        speciesId: string
        latitude: string
        longitude: string
        age: string
        height: string
        canopyWidth: string
      }
      submit: () => Promise<void>
    }
    vm.form.speciesId = overrides.speciesId ?? 'sp-2'
    vm.form.latitude = overrides.latitude ?? '-3.7319'
    vm.form.longitude = overrides.longitude ?? '-38.5267'
    vm.form.age = overrides.age ?? ''
    vm.form.height = overrides.height ?? ''
    vm.form.canopyWidth = overrides.canopyWidth ?? ''
    await nextTick()
    await vm.submit()
    await flushPromises()
  }

  async function createSpecies(
    wrapper: ReturnType<typeof mountPage>['wrapper'],
    commonName = 'Oiticica',
  ) {
    const vm = wrapper.vm as unknown as {
      openSpeciesDialog: () => void
      newSpecies: { commonName: string; scientificName: string; family: string }
      saveSpecies: () => Promise<void>
    }
    vm.openSpeciesDialog()
    await nextTick()
    Object.assign(vm.newSpecies, {
      commonName,
      scientificName: 'Licania rigida',
      family: 'Chrysobalanaceae',
    })
    await nextTick()
    await vm.saveSpecies()
    await flushPromises()
  }

  it('mostra a inclusão de espécie somente para ADMIN', async () => {
    const { wrapper } = mountPage()
    await flushPromises()
    expect(wrapper.find('[data-testid="create-species-option"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Solicite a inclusão ao administrador')
    wrapper.unmount()

    const admin = mountPage('ADMIN')
    await flushPromises()
    const vm = admin.wrapper.vm as unknown as { speciesMenu: boolean; speciesDialog: boolean }
    vm.speciesMenu = true
    await nextTick()
    await flushPromises()
    const action = document.querySelector<HTMLButtonElement>(
      '[data-testid="create-species-option"]',
    )
    expect(action).not.toBeNull()
    action!.click()
    await nextTick()
    expect(vm.speciesMenu).toBe(false)
    expect(vm.speciesDialog).toBe(true)
    admin.wrapper.unmount()
  })

  it('carrega as páginas seguintes para disponibilizar todo o catálogo', async () => {
    const batch = Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      commonName: 'Espécie ' + i,
    }))
    get.mockResolvedValueOnce({ data: batch }).mockResolvedValueOnce({ data: species })
    const { wrapper } = mountPage()
    await flushPromises()
    expect(get).toHaveBeenCalledWith('/species', { params: { page: 2, limit: 100 } })
    expect((wrapper.vm as unknown as { species: unknown[] }).species).toHaveLength(102)
  })

  it('cria a espécie e usa o id retornado no cadastro da árvore', async () => {
    post.mockResolvedValueOnce({
      data: { id: 'sp-new', commonName: 'Oiticica', scientificName: 'Licania rigida' },
    })
    const { wrapper } = mountPage('ADMIN')
    await flushPromises()
    await createSpecies(wrapper)
    expect(post).toHaveBeenCalledWith('/species', {
      commonName: 'Oiticica',
      scientificName: 'Licania rigida',
      family: 'Chrysobalanaceae',
    })
    expect((wrapper.vm as unknown as { form: { speciesId: string } }).form.speciesId).toBe('sp-new')
  })

  it('preserva os dados do diálogo e informa falha da API', async () => {
    post.mockRejectedValueOnce(new Error('Falha de rede'))
    const { wrapper } = mountPage('ADMIN')
    await flushPromises()
    await createSpecies(wrapper)
    const vm = wrapper.vm as unknown as {
      speciesDialog: boolean
      speciesError: string
      newSpecies: { commonName: string }
    }
    expect(vm.speciesDialog).toBe(true)
    expect(vm.speciesError).not.toBe('')
    expect(vm.newSpecies.commonName).toBe('Oiticica')
  })

  it('reconhece espécie duplicada antes de enviar', async () => {
    const { wrapper } = mountPage('ADMIN')
    await flushPromises()
    await createSpecies(wrapper, 'Ipê')
    expect(post).not.toHaveBeenCalled()
  })

  it('oferece o mapa de calor em outra aba e mantém o cadastro aberto', () => {
    const { wrapper } = mountPage()
    const link = wrapper.get('a[href="/user/mapUser?camada=calor"]')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.text()).toContain('Abrir mapa')
  })

  it('monta o payload com idSpecies/latitude/longitude numéricos e omite age quando vazio', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    await fillAndSubmit(wrapper, {
      speciesId: 'sp-2',
      latitude: '-3.7319',
      longitude: '-38.5267',
      age: '',
    })

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

  it('explica quando o funcionário precisa de vínculo a uma empresa para cadastrar', async () => {
    post.mockRejectedValueOnce({
      response: {
        status: 403,
        data: { message: 'Vincule sua conta a uma empresa antes de cadastrar árvores.' },
      },
    })
    const { wrapper } = mountPage()
    await flushPromises()

    await fillAndSubmit(wrapper, { latitude: '-3.7319' })

    expect(wrapper.text()).toContain('Vincule sua conta a uma empresa antes de cadastrar árvores.')
    expect((wrapper.vm as unknown as { form: { latitude: string } }).form.latitude).toBe('-3.7319')
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

  it('mostra o limite municipal e bloqueia coordenadas fora da empresa', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    await fillAndSubmit(wrapper, { latitude: '-2.5', longitude: '-38.5' })

    expect(wrapper.get('[data-testid="municipality-boundary-error"]').text()).toContain(
      'A localização da árvore precisa estar dentro do limite de Fortaleza / CE',
    )
    expect(post).not.toHaveBeenCalled()
  })

  it('mostra a mensagem e bloqueia o envio após um clique fora do limite', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    const vm = wrapper.vm as unknown as {
      rejectOutsideMapPick: () => void
      submit: () => Promise<void>
    }
    vm.rejectOutsideMapPick()
    await nextTick()

    expect(wrapper.get('[data-testid="municipality-boundary-error"]').text()).toContain(
      'Selecione um ponto dentro da área verde',
    )
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    await vm.submit()
    expect(post).not.toHaveBeenCalled()
  })

  it('bloqueia o cadastro quando a empresa não tem geometria municipal', async () => {
    get.mockImplementation((url: string) => {
      if (url === '/species') return Promise.resolve({ data: species })
      if (url === '/users/me/profile') {
        return Promise.resolve({ data: { organization: { id: 'company-1' } } })
      }
      if (url === '/organizations/company-1') {
        return Promise.resolve({ data: { id: 'company-1', municipalityName: 'Fortaleza' } })
      }
      return Promise.reject(new Error(`GET inesperado: ${url}`))
    })
    const { wrapper } = mountPage()
    await flushPromises()

    expect(wrapper.get('[data-testid="municipality-boundary-load-error"]').text()).toContain(
      'O limite municipal da empresa não está configurado',
    )
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    await fillAndSubmit(wrapper)
    expect(post).not.toHaveBeenCalled()
  })

  it('mostra a tela de cadastro enquanto grava e tira o spinner do botão', async () => {
    let resolveTree!: (value: unknown) => void
    post.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveTree = resolve
      }),
    )
    const { wrapper } = mountPage()
    await flushPromises()
    const vm = wrapper.vm as unknown as {
      form: { speciesId: string; latitude: string; longitude: string }
      submit: () => Promise<void>
      isSaving: boolean
    }
    vm.form.speciesId = 'sp-2'
    vm.form.latitude = '-3.7319'
    vm.form.longitude = '-38.5267'
    await nextTick()

    const saving = vm.submit()
    await flushPromises()

    const progress = wrapper.find('[data-testid="tree-saving-progress"]')
    expect(vm.isSaving).toBe(true)
    expect(progress.exists()).toBe(true)
    expect(progress.text()).toContain('Salvando árvore')
    expect(progress.text()).toContain('0%')
    // A barra fica próxima à ação e substitui a tela sobreposta.
    const submitButton = wrapper.get('button[type="submit"]')
    expect(submitButton.attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-testid="tree-saving-overlay"]').exists()).toBe(false)
    expect(wrapper.get('form').attributes('inert')).toBeDefined()

    resolveTree({ data: {} })
    await saving
    await flushPromises()
    expect(vm.isSaving).toBe(false)
    expect(wrapper.get('form').attributes('inert')).toBeUndefined()
  })

  it('aceita apenas um envio quando dois cliques chegam durante a validação assíncrona', async () => {
    let resolveValidation!: (value: { valid: boolean }) => void
    const validate = vi.fn(
      () => new Promise<{ valid: boolean }>((resolve) => (resolveValidation = resolve)),
    )
    post.mockResolvedValueOnce({ status: 201, data: { id: 'tree-9' } })
    const { wrapper } = mountPage()
    await flushPromises()
    const vm = wrapper.vm as unknown as {
      form: { speciesId: string; latitude: string; longitude: string }
      formRef: { validate: typeof validate }
      submit: () => Promise<void>
    }
    Object.assign(vm.form, { speciesId: 'sp-2', latitude: '-3.7319', longitude: '-38.5267' })
    vm.formRef = { validate }

    const firstSubmit = vm.submit()
    const secondSubmit = vm.submit()
    expect(validate).toHaveBeenCalledTimes(1)
    expect(post).not.toHaveBeenCalled()

    resolveValidation({ valid: true })
    await Promise.all([firstSubmit, secondSubmit])
    await flushPromises()

    expect(post).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0]![0]).toBe('/trees')
  })

  it('mostra a etapa da medição enquanto grava a medição', async () => {
    let resolveMeasurement!: (value: unknown) => void
    post.mockResolvedValueOnce({ data: { id: 'tree-9' } }).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveMeasurement = resolve
      }),
    )
    const { wrapper } = mountPage()
    await flushPromises()
    const vm = wrapper.vm as unknown as {
      form: {
        speciesId: string
        latitude: string
        longitude: string
        height: string
        canopyWidth: string
      }
      submit: () => Promise<void>
    }
    Object.assign(vm.form, {
      speciesId: 'sp-2',
      latitude: '-3.7319',
      longitude: '-38.5267',
      height: '5,2',
      canopyWidth: '2,4',
    })
    await nextTick()

    const saving = vm.submit()
    await flushPromises()
    expect(wrapper.get('[data-testid="tree-saving-progress"]').text()).toContain('Salvando medição')
    expect(wrapper.get('[data-testid="tree-saving-progress"]').text()).toContain('50%')

    resolveMeasurement({ data: { id: 'm-1', treeId: 'tree-9' } })
    await saving
    await flushPromises()
  })

  describe('medição inicial', () => {
    type MeasurementVm = {
      successMessage: string
      warningMessage: string
      errorMessage: string
      pendingMeasurement: { treeId: string; height: number; canopyWidth: number } | null
      form: { latitude: string; height: string; canopyWidth: string }
      postPendingMeasurement: () => Promise<void>
    }

    it('grava a árvore e depois a medição com o id devolvido pela API', async () => {
      post
        .mockResolvedValueOnce({ data: { id: 'tree-9' } })
        .mockResolvedValueOnce({ data: { id: 'm-1', treeId: 'tree-9' } })
      const { wrapper } = mountPage()
      await flushPromises()

      await fillAndSubmit(wrapper, { height: '5,2', canopyWidth: '2,4' })

      expect(post).toHaveBeenCalledTimes(2)
      expect(post.mock.calls[0]![0]).toBe('/trees')
      expect(post.mock.calls[0]![1]).not.toHaveProperty('height')
      expect(post.mock.calls[0]![1]).not.toHaveProperty('canopyWidth')
      expect(post.mock.calls[1]).toEqual([
        '/measurements',
        { treeId: 'tree-9', height: 5.2, canopyWidth: 2.4 },
      ])
      const vm = wrapper.vm as unknown as MeasurementVm
      expect(vm.successMessage).toContain('Árvore e medição cadastradas')
      expect(vm.pendingMeasurement).toBeNull()
      expect(vm.form.height).toBe('')
      expect(vm.form.canopyWidth).toBe('')
    })

    it('não chama a API quando só a altura ou só a largura está preenchida', async () => {
      const { wrapper } = mountPage()
      await flushPromises()

      await fillAndSubmit(wrapper, { height: '5' })
      await fillAndSubmit(wrapper, { canopyWidth: '2' })

      expect(post).not.toHaveBeenCalled()
    })

    it('não chama a API com altura zero, negativa ou texto', async () => {
      const { wrapper } = mountPage()
      await flushPromises()

      for (const height of ['0', '-3', 'alto']) {
        await fillAndSubmit(wrapper, { height, canopyWidth: '2' })
      }

      expect(post).not.toHaveBeenCalled()
    })

    it('aceita largura de copa zero', async () => {
      post
        .mockResolvedValueOnce({ data: { id: 'tree-9' } })
        .mockResolvedValueOnce({ data: { id: 'm-1', treeId: 'tree-9' } })
      const { wrapper } = mountPage()
      await flushPromises()

      await fillAndSubmit(wrapper, { height: '3', canopyWidth: '0' })

      expect(post.mock.calls[1]![1]).toEqual({ treeId: 'tree-9', height: 3, canopyWidth: 0 })
    })

    it('mantém a árvore e permite repetir só a medição quando a segunda gravação falha', async () => {
      post
        .mockResolvedValueOnce({ data: { id: 'tree-9' } })
        .mockRejectedValueOnce({ response: { status: 500 } })
      const { wrapper } = mountPage()
      await flushPromises()

      await fillAndSubmit(wrapper, { height: '5,2', canopyWidth: '2,4' })
      await nextTick()

      const vm = wrapper.vm as unknown as MeasurementVm
      expect(post).toHaveBeenCalledTimes(2)
      expect(vm.warningMessage).toContain('a medição não foi salva')
      expect(vm.pendingMeasurement).toMatchObject({
        treeId: 'tree-9',
        height: 5.2,
        canopyWidth: 2.4,
      })
      expect(vm.form.latitude).toBe('')
      expect(wrapper.find('[data-testid="retry-measurement"]').exists()).toBe(true)

      post.mockResolvedValueOnce({ data: { id: 'm-1', treeId: 'tree-9' } })
      await vm.postPendingMeasurement()
      await flushPromises()

      expect(post).toHaveBeenCalledTimes(3)
      expect(post.mock.calls[2]).toEqual([
        '/measurements',
        { treeId: 'tree-9', height: 5.2, canopyWidth: 2.4 },
      ])
      expect(post.mock.calls.filter(([url]) => url === '/trees')).toHaveLength(1)
      expect(vm.pendingMeasurement).toBeNull()
      expect(vm.warningMessage).toBe('')
      expect(vm.successMessage).toContain('Árvore e medição cadastradas')
    })

    it('mantém a pendência quando a API responde sem confirmar a medição', async () => {
      post
        .mockResolvedValueOnce({ data: { id: 'tree-9' } })
        .mockResolvedValueOnce({ data: { id: 'm-1', treeId: 'outra-arvore' } })
      const { wrapper } = mountPage()
      await flushPromises()

      await fillAndSubmit(wrapper, { height: '4', canopyWidth: '1' })

      const vm = wrapper.vm as unknown as MeasurementVm
      expect(vm.warningMessage).toContain('não confirmou a medição')
      expect(vm.pendingMeasurement).not.toBeNull()
      expect(vm.successMessage).toBe('')
    })

    it('orienta a usar o mapa quando a API não devolve o id da árvore', async () => {
      post.mockResolvedValueOnce({ status: 201, data: {} })
      const { wrapper } = mountPage()
      await flushPromises()

      await fillAndSubmit(wrapper, { height: '4', canopyWidth: '1' })

      const vm = wrapper.vm as unknown as MeasurementVm
      expect(post).toHaveBeenCalledTimes(1)
      expect(vm.warningMessage).toContain('Registrar medição')
      expect(vm.pendingMeasurement).toBeNull()
    })

    it('preserva a medição digitada quando o cadastro da árvore falha', async () => {
      post.mockRejectedValueOnce({ response: { status: 500 } })
      const { wrapper } = mountPage()
      await flushPromises()

      await fillAndSubmit(wrapper, { height: '5,2', canopyWidth: '2,4' })

      const vm = wrapper.vm as unknown as MeasurementVm
      expect(post).toHaveBeenCalledTimes(1)
      expect(vm.errorMessage).not.toBe('')
      expect(vm.form.height).toBe('5,2')
      expect(vm.form.canopyWidth).toBe('2,4')
    })
  })
})
