/**
 * Lê uma medida em metros digitada pelo usuário.
 * Aceita vírgula ou ponto como separador decimal e rejeita sinais, notação
 * científica e texto. Retorna NaN quando a entrada não é uma medida válida.
 */
export function readMeters(value: string | number | null | undefined): number {
  const input = String(value ?? '').trim()
  if (!/^\d+(?:[.,]\d+)?$/.test(input)) return NaN
  return Number(input.replace(',', '.'))
}

export interface FieldMeasurementInput {
  height: number
  canopyWidth: number
}

/**
 * Valida o par altura + largura da copa.
 * Altura precisa ser maior que zero e a largura não pode ser negativa.
 * Retorna as medidas, ou a mensagem do primeiro problema encontrado.
 */
export function parseMeasurementPair(
  height: string,
  canopyWidth: string,
): { ok: true; value: FieldMeasurementInput } | { ok: false; error: string } {
  const measuredHeight = readMeters(height)
  const measuredWidth = readMeters(canopyWidth)
  if (!Number.isFinite(measuredHeight) || measuredHeight <= 0) {
    return { ok: false, error: 'Informe a altura em metros, maior que zero.' }
  }
  if (!Number.isFinite(measuredWidth)) {
    return { ok: false, error: 'Informe a largura da copa em metros.' }
  }
  return { ok: true, value: { height: measuredHeight, canopyWidth: measuredWidth } }
}
