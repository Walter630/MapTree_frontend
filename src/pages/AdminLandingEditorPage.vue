<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import LandingFieldEditor from '@/components/AdminView/LandingFieldEditor.vue'
import LandingPageRenderer from '@/components/public/LandingPageRenderer.vue'
import { apiConnect } from '@/plugins/apiConnect'
import type { LandingDocument, LandingRevisionSummary, LandingSectionId } from '@/types/landing'

type EditorSectionId = 'header' | 'hero' | LandingSectionId | 'footer'
type EditorSection = { id: EditorSectionId; label: string; ordered?: boolean }

const editorSections: EditorSection[] = [
  { id: 'header', label: 'Cabeçalho' },
  { id: 'hero', label: 'Abertura' },
  { id: 'prevention', label: 'Propósito', ordered: true },
  { id: 'productDemo', label: 'Demonstração', ordered: true },
  { id: 'workflow', label: 'Como funciona', ordered: true },
  { id: 'features', label: 'Funcionalidades', ordered: true },
  { id: 'audience', label: 'Público', ordered: true },
  { id: 'about', label: 'Apresentação', ordered: true },
  { id: 'analytics', label: 'Análise', ordered: true },
  { id: 'faq', label: 'Perguntas frequentes', ordered: true },
  { id: 'finalCta', label: 'Chamada final', ordered: true },
  { id: 'footer', label: 'Rodapé' },
]

const content = ref<LandingDocument | null>(null)
const draftVersion = ref(1)
const publishedVersion = ref(1)
const draftUpdatedAt = ref<string | null>(null)
const draftUpdatedById = ref<string | null>(null)
const revisions = ref<LandingRevisionSummary[]>([])
const activeSection = ref<EditorSectionId>('hero')
const previewSize = ref<'desktop' | 'mobile'>('desktop')
const loading = ref(true)
const saving = ref(false)
const publishing = ref(false)
const restoringId = ref('')
const restoreConfirmationId = ref('')
const dirty = ref(false)
const message = ref('')
const messageKind = ref<'success' | 'error' | 'info'>('info')

const activeSectionLabel = computed(
  () => editorSections.find((section) => section.id === activeSection.value)?.label ?? 'Seção',
)
const editorSectionsInOrder = computed(() => {
  if (!content.value) return editorSections
  const fixed = editorSections.filter((section) => section.id === 'header' || section.id === 'hero')
  const ordered = content.value.order
    .map((id) => editorSections.find((section) => section.id === id))
    .filter((section): section is EditorSection => Boolean(section))
  const footer = editorSections.filter((section) => section.id === 'footer')
  return [...fixed, ...ordered, ...footer]
})
const activeFieldValue = computed(() => {
  if (!content.value) return null
  return (content.value.fields as unknown as Record<string, unknown>)[activeSection.value]
})

function setMessage(text: string, kind: typeof messageKind.value = 'info') {
  message.value = text
  messageKind.value = kind
}

function cloneDocument(document: LandingDocument): LandingDocument {
  return JSON.parse(JSON.stringify(document)) as LandingDocument
}

async function refreshRevisions() {
  const response = await apiConnect.getLandingRevisions()
  revisions.value = response.data
}

async function loadDraft(discardLocalChanges = false) {
  if (dirty.value && !discardLocalChanges) return
  loading.value = true
  try {
    const [draftResponse, revisionResponse] = await Promise.all([
      apiConnect.getLandingDraft(),
      apiConnect.getLandingRevisions(),
    ])
    content.value = cloneDocument(draftResponse.data.content)
    draftVersion.value = draftResponse.data.version
    publishedVersion.value = draftResponse.data.publishedVersion
    draftUpdatedAt.value = draftResponse.data.updatedAt
    draftUpdatedById.value = draftResponse.data.updatedById
    revisions.value = revisionResponse.data
    dirty.value = false
    setMessage(`Rascunho v${draftVersion.value} carregado. Publicada: v${publishedVersion.value}.`, 'success')
  } catch {
    setMessage('Não foi possível carregar o rascunho e o histórico. Tente novamente.', 'error')
  } finally {
    loading.value = false
  }
}

function updateSection(value: unknown) {
  if (!content.value) return
  const next = cloneDocument(content.value)
  ;(next.fields as unknown as Record<string, unknown>)[activeSection.value] = value
  content.value = next
  dirty.value = true
  setMessage('Há alterações locais ainda não salvas.', 'info')
}

function toggleVisibility(id: LandingSectionId | 'footer') {
  if (!content.value) return
  const next = cloneDocument(content.value)
  next.visibility[id] = !next.visibility[id]
  content.value = next
  dirty.value = true
}

function moveSection(id: LandingSectionId, direction: -1 | 1) {
  if (!content.value) return
  const next = cloneDocument(content.value)
  const index = next.order.indexOf(id)
  const targetIndex = index + direction
  if (index < 0 || targetIndex < 0 || targetIndex >= next.order.length) return
  ;[next.order[index], next.order[targetIndex]] = [next.order[targetIndex]!, next.order[index]!]
  content.value = next
  dirty.value = true
}

async function saveDraft(): Promise<boolean> {
  if (!content.value) return false
  saving.value = true
  try {
    const response = await apiConnect.saveLandingDraft(draftVersion.value, content.value)
    draftVersion.value = response.data.version
    publishedVersion.value = response.data.publishedVersion
    draftUpdatedAt.value = response.data.updatedAt
    draftUpdatedById.value = response.data.updatedById
    content.value = cloneDocument(response.data.content)
    dirty.value = false
    setMessage(`Rascunho v${draftVersion.value} salvo.`, 'success')
    return true
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status
    if (status === 409) {
      setMessage('O rascunho mudou em outra sessão. Suas alterações locais foram preservadas; recarregue a versão atual para resolver o conflito.', 'error')
    } else {
      setMessage('Falha ao salvar. Suas alterações locais foram preservadas.', 'error')
    }
    return false
  } finally {
    saving.value = false
  }
}

async function publishDraft() {
  if (!content.value) return
  publishing.value = true
  try {
    if (dirty.value && !(await saveDraft())) return
    const response = await apiConnect.publishLanding(
      draftVersion.value,
      publishedVersion.value,
      crypto.randomUUID(),
    )
    publishedVersion.value = response.data.version
    await refreshRevisions()
    setMessage(`A versão v${publishedVersion.value} foi publicada.`, 'success')
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status
    setMessage(
      status === 409
        ? 'A publicação mudou em outra sessão. O rascunho foi mantido; recarregue o estado atual antes de publicar.'
        : 'Não foi possível publicar. O rascunho continua salvo.',
      'error',
    )
  } finally {
    publishing.value = false
  }
}

async function restoreRevision(revision: LandingRevisionSummary) {
  restoringId.value = revision.id
  try {
    const response = await apiConnect.restoreLandingRevision(
      revision.id,
      draftVersion.value,
      publishedVersion.value,
      crypto.randomUUID(),
    )
    const result = await apiConnect.getLandingDraft()
    content.value = cloneDocument(result.data.content)
    draftVersion.value = result.data.version
    publishedVersion.value = result.data.publishedVersion
    draftUpdatedAt.value = result.data.updatedAt
    draftUpdatedById.value = result.data.updatedById
    dirty.value = false
    await refreshRevisions()
    restoreConfirmationId.value = ''
    setMessage(`A revisão de origem v${revision.version} foi restaurada como v${response.data.version}.`, 'success')
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status
    setMessage(
      status === 409
        ? 'O estado mudou em outra sessão. Recarregue o rascunho e tente a restauração novamente.'
        : 'Não foi possível restaurar essa revisão. Nenhum rascunho local foi descartado.',
      'error',
    )
  } finally {
    restoringId.value = ''
  }
}

function isOrdered(id: EditorSectionId): id is LandingSectionId {
  return content.value?.order.includes(id as LandingSectionId) ?? false
}

function isShown(id: EditorSectionId): boolean {
  if (!content.value) return false
  if (id === 'footer') return content.value.visibility.footer
  if (isOrdered(id)) return content.value.visibility[id]
  return true
}

function revisionDate(value: string | null): string {
  if (!value) return 'Conteúdo original'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

onMounted(() => loadDraft(true))
</script>

<template>
  <main class="landing-admin page-shell">
    <header class="editor-heading">
      <div>
        <p class="eyebrow">ADMIN · CONTEÚDO PÚBLICO</p>
        <h1>Editar landing page</h1>
        <p class="intro">Edite as seções, confira a prévia e publique sem um novo deploy.</p>
      </div>
      <div class="version-badges" aria-label="Versões atuais">
        <span>Rascunho <strong>v{{ draftVersion }}</strong></span>
        <span>Publicada <strong>v{{ publishedVersion }}</strong></span>
        <span v-if="draftUpdatedAt || draftUpdatedById" :title="draftUpdatedById ? `ID do autor: ${draftUpdatedById}` : undefined">
          Editado por {{ draftUpdatedById || 'autor anterior' }} · {{ draftUpdatedAt ? revisionDate(draftUpdatedAt) : 'data indisponível' }}
        </span>
      </div>
    </header>

    <p v-if="message" class="editor-message" :class="`message-${messageKind}`" role="status" aria-live="polite">
      {{ message }}
    </p>

    <div v-if="loading" class="editor-loading" role="status">Carregando editor…</div>
    <div v-else-if="!content" class="editor-loading">
      <p>O editor não conseguiu carregar.</p>
      <button type="button" class="quiet-button" @click="loadDraft(true)">Tentar novamente</button>
    </div>
    <div v-else-if="content" class="editor-layout">
      <section class="editor-panel" aria-labelledby="section-list-title">
        <div class="panel-heading">
          <h2 id="section-list-title">Conteúdo</h2>
          <button type="button" class="quiet-button" @click="loadDraft(true)">{{ dirty ? 'Descartar e recarregar' : 'Recarregar' }}</button>
        </div>

        <div class="section-order-list" aria-label="Seções da landing page">
          <div v-for="section in editorSectionsInOrder" :key="section.id" class="section-choice" :class="{ selected: activeSection === section.id }">
            <button type="button" class="section-select" :aria-current="activeSection === section.id ? 'step' : undefined" @click="activeSection = section.id">
              {{ section.label }}
            </button>
            <div v-if="section.ordered" class="section-tools">
              <button type="button" :aria-label="`Mover ${section.label} para cima`" :disabled="content.order.indexOf(section.id as LandingSectionId) === 0" @click="moveSection(section.id as LandingSectionId, -1)">↑</button>
              <button type="button" :aria-label="`Mover ${section.label} para baixo`" :disabled="content.order.indexOf(section.id as LandingSectionId) === content.order.length - 1" @click="moveSection(section.id as LandingSectionId, 1)">↓</button>
              <label class="visibility-toggle">
                <input :checked="isShown(section.id)" type="checkbox" :aria-label="`Exibir ${section.label}`" @change="toggleVisibility(section.id as LandingSectionId)" />
                <span>Exibir</span>
              </label>
            </div>
            <label v-else-if="section.id === 'footer'" class="visibility-toggle">
              <input :checked="isShown(section.id)" type="checkbox" aria-label="Exibir rodapé" @change="toggleVisibility('footer')" />
              <span>Exibir</span>
            </label>
          </div>
        </div>

        <section class="field-panel" :aria-label="`Campos: ${activeSectionLabel}`">
          <h3>{{ activeSectionLabel }}</h3>
          <LandingFieldEditor :label="activeSectionLabel" :model-value="activeFieldValue" :path="activeSection" @update:model-value="updateSection" />
        </section>

        <div class="editor-actions">
          <button type="button" class="save-button" :disabled="saving || publishing || !dirty" @click="saveDraft">
            {{ saving ? 'Salvando…' : 'Salvar rascunho' }}
          </button>
          <button type="button" class="publish-button" :disabled="saving || publishing" @click="publishDraft">
            {{ publishing ? 'Publicando…' : 'Publicar landing' }}
          </button>
        </div>

        <section class="history-panel" aria-labelledby="history-title">
          <div class="panel-heading"><h2 id="history-title">Histórico</h2><button type="button" class="quiet-button" @click="refreshRevisions">Atualizar</button></div>
          <ol>
            <li v-for="revision in revisions" :key="revision.id">
              <div class="revision-details">
                <strong>v{{ revision.version }} · {{ revision.action === 'INITIAL' ? 'Original' : revision.action === 'RESTORE' ? 'Restauração' : 'Publicação' }}</strong>
                <span>{{ revisionDate(revision.createdAt) }}</span>
              </div>
              <div v-if="restoreConfirmationId === revision.id" class="restore-confirmation">
                <span>Restaurar e publicar esta revisão?</span>
                <button type="button" :disabled="Boolean(restoringId)" @click="restoreRevision(revision)">{{ restoringId === revision.id ? 'Restaurando…' : 'Confirmar' }}</button>
                <button type="button" @click="restoreConfirmationId = ''">Cancelar</button>
              </div>
              <button v-else type="button" class="restore-button" :disabled="Boolean(restoringId) || revision.version === publishedVersion" @click="restoreConfirmationId = revision.id">Restaurar</button>
            </li>
          </ol>
          <p v-if="!revisions.length" class="empty-history">Ainda não há revisões publicadas.</p>
        </section>
      </section>

      <section class="preview-panel" aria-labelledby="preview-title">
        <div class="panel-heading preview-heading">
          <div><h2 id="preview-title">Prévia {{ dirty ? 'das alterações locais' : `do rascunho v${draftVersion}` }}</h2><span>O visitante vê a versão publicada até a publicação ser confirmada.</span></div>
          <div class="preview-controls" role="group" aria-label="Tamanho da prévia">
            <button type="button" :aria-pressed="previewSize === 'desktop'" @click="previewSize = 'desktop'">Desktop</button>
            <button type="button" :aria-pressed="previewSize === 'mobile'" @click="previewSize = 'mobile'">Celular</button>
          </div>
        </div>
        <div class="preview-scroll">
          <div class="preview-frame" :class="`preview-${previewSize}`">
            <LandingPageRenderer :content="content" draft />
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.landing-admin { max-width: 1600px; margin-inline: auto; padding: 28px clamp(14px, 3vw, 36px) 56px; color: var(--mt-ink, #17372a); }
.editor-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
.editor-heading h1 { margin: 4px 0 8px; font-size: clamp(1.6rem, 3vw, 2.3rem); }
.eyebrow { margin: 0; color: #087344; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.08em; }
.intro { margin: 0; color: #5b6d64; }
.version-badges { display: flex; flex-wrap: wrap; gap: 8px; }
.version-badges span { padding: 8px 11px; border: 1px solid #d2ded7; border-radius: 9px; background: var(--mt-surface, #fff); font-size: 0.8rem; }
.editor-message { margin: 0 0 18px; padding: 12px 14px; border: 1px solid #bcd5c7; border-radius: 10px; background: #f0f8f2; font-size: 0.88rem; }
.message-error { border-color: #e8baba; color: #852b2b; background: #fff5f4; }
.message-success { color: #075c3a; }
.editor-loading { min-height: 300px; display: grid; place-items: center; }
.editor-layout { display: grid; grid-template-columns: minmax(330px, 0.78fr) minmax(0, 1.45fr); align-items: start; gap: 18px; }
.editor-panel, .preview-panel { min-width: 0; padding: 18px; border: 1px solid var(--mt-border, #d7e1db); border-radius: 16px; background: var(--mt-surface, #fff); box-shadow: 0 4px 18px #102b1c0a; }
.panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.panel-heading h2 { margin: 0; font-size: 1.08rem; }
.quiet-button { min-height: 34px; padding: 6px 10px; border: 1px solid #d2ded7; border-radius: 8px; color: #244c39; background: transparent; font: inherit; font-size: 0.77rem; font-weight: 700; cursor: pointer; }
.quiet-button:disabled { opacity: 0.45; cursor: not-allowed; }
.section-order-list { display: grid; gap: 6px; margin-top: 15px; }
.section-choice { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 5px 6px 5px 11px; border: 1px solid #e0e8e3; border-radius: 9px; }
.section-choice.selected { border-color: #66a884; background: #f1f8f3; }
.section-select { flex: 1; border: 0; color: #254634; background: transparent; text-align: left; font: inherit; font-size: 0.83rem; font-weight: 700; cursor: pointer; }
.section-tools { display: flex; align-items: center; gap: 4px; }
.section-tools > button { width: 30px; height: 30px; border: 1px solid #d5e1da; border-radius: 7px; color: #075c3a; background: white; font-size: 1rem; cursor: pointer; }
.section-tools > button:disabled { opacity: 0.4; cursor: not-allowed; }
.visibility-toggle { display: inline-flex; align-items: center; gap: 5px; padding: 0 5px; color: #4b6255; font-size: 0.72rem; white-space: nowrap; }
.visibility-toggle input { width: 16px; height: 16px; accent-color: #087344; }
.field-panel { display: grid; gap: 14px; margin-top: 20px; padding-top: 18px; border-top: 1px solid #e0e8e3; }
.field-panel h3 { margin: 0; font-size: 1rem; }
.editor-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-top: 18px; }
.editor-actions button { min-height: 44px; padding: 9px; border: 1px solid #087344; border-radius: 9px; font: inherit; font-size: 0.82rem; font-weight: 800; cursor: pointer; }
.save-button { color: #075c3a; background: #fff; }
.publish-button { color: #fff; background: #087344; }
.editor-actions button:disabled { opacity: 0.5; cursor: not-allowed; }
.history-panel { margin-top: 24px; padding-top: 18px; border-top: 1px solid #e0e8e3; }
.history-panel ol { display: grid; gap: 8px; margin: 12px 0 0; padding: 0; list-style: none; }
.history-panel li { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 8px; padding: 10px; border: 1px solid #e1e8e4; border-radius: 9px; }
.revision-details { display: grid; gap: 3px; }
.revision-details strong { font-size: 0.78rem; }
.revision-details span, .empty-history { color: #63756b; font-size: 0.72rem; }
.restore-button, .restore-confirmation button { min-height: 32px; padding: 5px 8px; border: 1px solid #a9c7b5; border-radius: 7px; color: #075c3a; background: white; font: inherit; font-size: 0.72rem; font-weight: 700; cursor: pointer; }
.restore-button:disabled { opacity: 0.4; cursor: not-allowed; }
.restore-confirmation { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; gap: 7px; color: #53675b; font-size: 0.75rem; }
.restore-confirmation button:first-of-type { color: white; background: #087344; }
.preview-panel { position: sticky; top: 12px; overflow: hidden; }
.preview-heading > div:first-child { display: grid; gap: 4px; }
.preview-heading span { color: #63756b; font-size: 0.74rem; }
.preview-controls { display: inline-flex; flex: 0 0 auto; padding: 3px; border: 1px solid #d7e1db; border-radius: 9px; }
.preview-controls button { min-height: 32px; padding: 5px 9px; border: 0; border-radius: 6px; color: #4d6457; background: transparent; font: inherit; font-size: 0.73rem; font-weight: 700; cursor: pointer; }
.preview-controls button[aria-pressed="true"] { color: #075c3a; background: #eaf4ed; }
.preview-scroll { max-height: min(76vh, 1000px); overflow: auto; margin-top: 14px; border: 1px solid #d7e1db; border-radius: 10px; background: #edf1ee; }
.preview-frame { min-height: 600px; margin-inline: auto; background: white; transition: width 180ms ease; }
.preview-desktop { width: 100%; }
.preview-mobile { width: min(390px, 100%); min-height: 700px; border-inline: 1px solid #c4d0c9; }
.preview-frame :deep(.landing) { overflow: hidden; }
.preview-frame :deep(.hero-shell) { min-height: 760px; }
.empty-history { margin-bottom: 0; }
:is(button, input):focus-visible { outline: 3px solid #8bbf24; outline-offset: 2px; }
@media (max-width: 1020px) {
  .editor-layout { grid-template-columns: minmax(300px, 0.9fr) minmax(0, 1.1fr); }
  .preview-panel { position: static; }
}
@media (max-width: 760px) {
  .editor-heading { align-items: flex-start; flex-direction: column; }
  .editor-layout { grid-template-columns: 1fr; }
  .preview-panel { grid-row: 1; }
  .editor-panel { grid-row: 2; }
  .preview-heading { align-items: flex-start; flex-direction: column; }
  .preview-scroll { max-height: 60vh; }
}
</style>
