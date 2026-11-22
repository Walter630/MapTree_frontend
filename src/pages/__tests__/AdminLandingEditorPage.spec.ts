import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, expect, it, vi } from 'vitest'
import AdminLandingEditorPage from '@/pages/AdminLandingEditorPage.vue'
import { apiConnect } from '@/plugins/apiConnect'
import type { LandingDocument } from '@/types/landing'
import { landingDocumentFixture } from '../../../e2e/fixtures/landingDocument'

const cloneFixture = (): LandingDocument => structuredClone(landingDocumentFixture)
const draftResponse = (content: LandingDocument, version: number) => ({
  data: { version, publishedVersion: 1, content, updatedAt: null },
}) as Awaited<ReturnType<typeof apiConnect.getLandingDraft>>
const revisionResponse = {
  data: [{ id: 'initial', version: 1, action: 'INITIAL', actorId: null, createdAt: null, sourceRevisionId: null }],
} as Awaited<ReturnType<typeof apiConnect.getLandingRevisions>>

afterEach(() => vi.restoreAllMocks())

function mountEditor() {
  return mount(AdminLandingEditorPage, {
    global: {
      stubs: {
        RouterLink: { template: '<a><slot /></a>' },
        DemoRoutePreview: true,
        TreeMonitoringPreview: true,
      },
    },
  })
}

it('carrega, atualiza a prévia e salva o conteúdo com controle de versão', async () => {
  const original = cloneFixture()
  vi.spyOn(apiConnect, 'getLandingDraft').mockResolvedValue(draftResponse(original, 1))
  vi.spyOn(apiConnect, 'getLandingRevisions').mockResolvedValue(revisionResponse)
  const save = vi.spyOn(apiConnect, 'saveLandingDraft').mockImplementation(async (_version, content) => {
    return draftResponse(content, 2)
  })

  const wrapper = mountEditor()
  await flushPromises()

  const titleLabel = wrapper.findAll('.field-panel label.field-label').find((label) => label.text().includes('Title'))
  expect(titleLabel).toBeDefined()
  await titleLabel!.find('input').setValue('Título editado pelo ADMIN')
  await flushPromises()

  expect(wrapper.find('.preview-frame h1').text()).toBe('Título editado pelo ADMIN')
  const saveButton = wrapper.get('.save-button')
  expect((saveButton.element as HTMLButtonElement).disabled).toBe(false)
  await saveButton.trigger('click')
  await flushPromises()

  expect(save).toHaveBeenCalledWith(1, expect.objectContaining({
    fields: expect.objectContaining({
      hero: expect.objectContaining({ title: 'Título editado pelo ADMIN' }),
    }),
  }))
  expect(wrapper.text()).toContain('Rascunho v2 salvo.')
  expect((wrapper.get('.save-button').element as HTMLButtonElement).disabled).toBe(true)
})

it('preserva a edição local quando o servidor responde conflito de versão', async () => {
  vi.spyOn(apiConnect, 'getLandingDraft').mockResolvedValue(draftResponse(cloneFixture(), 1))
  vi.spyOn(apiConnect, 'getLandingRevisions').mockResolvedValue(revisionResponse)
  vi.spyOn(apiConnect, 'saveLandingDraft').mockRejectedValue({ response: { status: 409 } })

  const wrapper = mountEditor()
  await flushPromises()
  const titleLabel = wrapper.findAll('.field-panel label.field-label').find((label) => label.text().includes('Title'))
  await titleLabel!.find('input').setValue('Minha edição local')
  await wrapper.get('.save-button').trigger('click')
  await flushPromises()

  expect(titleLabel!.find('input').element).toHaveProperty('value', 'Minha edição local')
  expect(wrapper.text()).toContain('O rascunho mudou em outra sessão')
  expect((wrapper.get('.save-button').element as HTMLButtonElement).disabled).toBe(false)
})
