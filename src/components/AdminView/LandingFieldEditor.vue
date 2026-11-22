<script setup lang="ts">
import LandingImageEditor from '@/components/AdminView/LandingImageEditor.vue'
import type { LandingImage } from '@/types/landing'

const props = defineProps<{
  label: string
  modelValue: unknown
  path?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>()
function cloneValue(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown
}
const arrayItemPrototype = Array.isArray(props.modelValue) && props.modelValue.length
  ? cloneValue(props.modelValue[0])
  : undefined

const maxArrayItems = () => {
  if (props.path?.endsWith('.steps')) return 8
  if (props.path?.endsWith('.items')) return 30
  return 20
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isImage(value: unknown): value is LandingImage {
  return isRecord(value) && 'staticPath' in value && 'assetId' in value && typeof value.alt === 'string'
}

function labelFor(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/(^|[-_])\w/g, (part) => part.replace(/[-_]/, '').toUpperCase())
}

function updateChild(key: string, value: unknown) {
  if (!isRecord(props.modelValue)) return
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function updateItem(index: number, value: unknown) {
  if (!Array.isArray(props.modelValue)) return
  emit('update:modelValue', props.modelValue.map((item, itemIndex) => itemIndex === index ? value : item))
}

function removeItem(index: number) {
  if (!Array.isArray(props.modelValue)) return
  emit('update:modelValue', props.modelValue.filter((_item, itemIndex) => itemIndex !== index))
}

function addItem() {
  if (!Array.isArray(props.modelValue) || props.modelValue.length >= maxArrayItems()) return
  const original = props.modelValue[0] ?? arrayItemPrototype
  const next: unknown = typeof original === 'string' ? '' : original === undefined ? {} : cloneValue(original)
  if (isRecord(next)) {
    if (typeof next.id === 'string') next.id = `item-${crypto.randomUUID()}`
    if (typeof next.number === 'string') next.number = String(props.modelValue.length + 1).padStart(2, '0')
  }
  emit('update:modelValue', [...props.modelValue, next])
}

function updateText(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement | HTMLTextAreaElement).value)
}
</script>

<template>
  <LandingImageEditor
    v-if="isImage(modelValue)"
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
  />

  <label v-else-if="typeof modelValue === 'string'" class="field-label">
    {{ label }}
    <textarea v-if="modelValue.length > 90 || modelValue.includes('\n')" :value="modelValue" rows="4" maxlength="3000" @input="updateText" />
    <input v-else :value="modelValue" type="text" maxlength="3000" @input="updateText" />
  </label>

  <label v-else-if="typeof modelValue === 'boolean'" class="boolean-field">
    <input :checked="modelValue" type="checkbox" @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)" />
    <span>{{ label }}</span>
  </label>

  <label v-else-if="typeof modelValue === 'number'" class="field-label">
    {{ label }}
    <input :value="modelValue" type="number" @input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))" />
  </label>

  <fieldset v-else-if="Array.isArray(modelValue)" class="field-group array-group">
    <legend>{{ label }}</legend>
    <div v-for="(item, index) in modelValue" :key="index" class="array-item">
      <LandingFieldEditor
        :label="typeof item === 'string' ? `Item ${index + 1}` : `Item ${index + 1}`"
        :model-value="item"
        :path="`${path || label}[${index}]`"
        @update:model-value="updateItem(index, $event)"
      />
      <button type="button" class="remove-item" @click="removeItem(index)">Remover item</button>
    </div>
    <button type="button" class="add-item" :disabled="modelValue.length >= maxArrayItems()" @click="addItem">Adicionar item</button>
  </fieldset>

  <fieldset v-else-if="isRecord(modelValue)" class="field-group object-group">
    <legend>{{ label }}</legend>
    <LandingFieldEditor
      v-for="(value, key) in modelValue"
      :key="key"
      :label="labelFor(String(key))"
      :model-value="value"
      :path="path ? `${path}.${String(key)}` : String(key)"
      @update:model-value="updateChild(String(key), $event)"
    />
  </fieldset>

  <p v-else class="unsupported-field">{{ label }} não pode ser editado neste formato.</p>
</template>

<style scoped>
.field-label { display: grid; gap: 6px; color: #1f352b; font-size: 0.82rem; font-weight: 700; }
.field-label input, .field-label textarea { width: 100%; min-height: 42px; padding: 9px 10px; border: 1px solid #c5d2cb; border-radius: 8px; color: #132b20; background: #fff; font: inherit; font-weight: 400; line-height: 1.5; }
.field-label textarea { min-height: 96px; resize: vertical; }
.boolean-field { display: flex; align-items: center; gap: 10px; color: #1f352b; font-size: 0.85rem; font-weight: 600; }
.boolean-field input { width: 18px; height: 18px; accent-color: #087344; }
.field-group { min-width: 0; display: grid; gap: 12px; margin: 0; padding: 14px; border: 1px solid #d7e1db; border-radius: 12px; }
.field-group legend { padding: 0 6px; color: #12382b; font-size: 0.9rem; font-weight: 800; }
.object-group { background: #f8faf9; }
.array-group { background: #fff; }
.array-item { display: grid; gap: 8px; padding: 12px; border: 1px solid #e1e8e4; border-radius: 10px; }
.add-item, .remove-item { min-height: 36px; padding: 6px 10px; border: 1px solid #9eb6a9; border-radius: 8px; color: #075c3a; background: white; font: inherit; font-size: 0.78rem; font-weight: 700; cursor: pointer; }
.remove-item { justify-self: start; color: #8b2f2f; }
button:disabled { opacity: 0.45; cursor: not-allowed; }
:is(input, textarea, button):focus-visible { outline: 3px solid #8bbf24; outline-offset: 2px; }
.unsupported-field { margin: 0; color: #6b5140; font-size: 0.8rem; }
</style>
