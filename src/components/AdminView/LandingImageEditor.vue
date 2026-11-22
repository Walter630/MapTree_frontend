<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { apiConnect } from '@/plugins/apiConnect'
import type { LandingImage } from '@/types/landing'
import { resolveLandingImage } from '@/utils/landingContent'

const props = defineProps<{ modelValue: LandingImage }>()
const emit = defineEmits<{ 'update:modelValue': [value: LandingImage] }>()

const uploading = ref(false)
const errorMessage = ref('')
const authenticatedPreview = ref('')
let previewUrl = ''

const preview = () => authenticatedPreview.value || resolveLandingImage(props.modelValue, true)

watch(
  () => props.modelValue.assetId,
  async (assetId) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    previewUrl = ''
    authenticatedPreview.value = ''
    if (!assetId) return
    try {
      const response = await apiConnect.getAdminLandingMedia(assetId)
      previewUrl = URL.createObjectURL(response.data)
      authenticatedPreview.value = previewUrl
    } catch {
      errorMessage.value = 'Não foi possível carregar a prévia privada desta imagem.'
    }
  },
  { immediate: true },
)

async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  errorMessage.value = ''
  if (!file) return
  if (file.size > 8 * 1024 * 1024) {
    errorMessage.value = 'A imagem deve ter no máximo 8 MiB.'
    return
  }

  uploading.value = true
  try {
    const response = await apiConnect.uploadLandingMedia(file)
    emit('update:modelValue', {
      staticPath: null,
      assetId: response.data.id,
      alt: props.modelValue.alt,
    })
  } catch {
    errorMessage.value = 'O envio falhou. Confira o formato e tente novamente.'
  } finally {
    uploading.value = false
  }
}

function updateAlt(alt: string) {
  emit('update:modelValue', { ...props.modelValue, alt })
}

onBeforeUnmount(() => {
  if (previewUrl) URL.revokeObjectURL(previewUrl)
})
</script>

<template>
  <div class="landing-image-editor">
    <img v-if="preview()" class="image-preview" :src="preview()" :alt="modelValue.alt" />
    <p v-else class="image-placeholder">Nenhuma prévia disponível</p>
    <label class="field-label">
      Texto alternativo
      <input :value="modelValue.alt" type="text" maxlength="3000" @input="updateAlt(($event.target as HTMLInputElement).value)" />
    </label>
    <label class="upload-control">
      {{ uploading ? 'Enviando imagem…' : 'Substituir imagem' }}
      <input type="file" accept="image/png,image/jpeg,image/webp" :disabled="uploading" @change="upload" />
    </label>
    <p v-if="errorMessage" class="field-error" role="alert">{{ errorMessage }}</p>
    <p class="field-help">PNG, JPEG ou WebP · máximo 8 MiB. A imagem fica privada até a publicação.</p>
  </div>
</template>

<style scoped>
.landing-image-editor { display: grid; gap: 12px; }
.image-preview { width: 100%; max-height: 210px; object-fit: contain; border: 1px solid #d5e0db; border-radius: 10px; background: #f4f7f5; }
.image-placeholder { margin: 0; padding: 26px; border: 1px dashed #b8c8c0; border-radius: 10px; color: #50655c; text-align: center; }
.field-label { display: grid; gap: 6px; color: #1f352b; font-size: 0.82rem; font-weight: 700; }
.field-label input { width: 100%; min-height: 42px; padding: 8px 10px; border: 1px solid #c5d2cb; border-radius: 8px; font: inherit; font-weight: 400; }
.upload-control { display: inline-flex; min-height: 42px; align-items: center; justify-content: center; padding: 8px 12px; border: 1px solid #087344; border-radius: 8px; color: #075c3a; font-size: 0.85rem; font-weight: 700; cursor: pointer; }
.upload-control input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
.field-error { margin: 0; color: #a12626; font-size: 0.82rem; }
.field-help { margin: 0; color: #5b6d64; font-size: 0.75rem; }
:is(input, .upload-control):focus-visible { outline: 3px solid #8bbf24; outline-offset: 2px; }
</style>
