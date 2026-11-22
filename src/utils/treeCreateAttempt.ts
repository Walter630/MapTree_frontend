export type TreeCreatePayload = {
  idSpecies: string
  latitude: number
  longitude: number
  status: string
  vigor?: string
  age?: string
}

interface StoredTreeCreateAttempt {
  [fingerprint: string]: string
}

const STORAGE_KEY = 'maptree:tree-create-attempt'
const memoryAttempts = new Map<string, string>()

async function fingerprint(payload: TreeCreatePayload): Promise<string> {
  const serialized = JSON.stringify(
    Object.fromEntries(Object.entries(payload).sort(([left], [right]) => left.localeCompare(right))),
  )
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized))
    return Array.from(new Uint8Array(bytes), (value) => value.toString(16).padStart(2, '0')).join('')
  }

  // Fallback para navegadores sem Web Crypto: armazena só um fingerprint, nunca as coordenadas.
  let hash = 14695981039346656037n
  for (let index = 0; index < serialized.length; index++) {
    hash ^= BigInt(serialized.charCodeAt(index))
    hash = BigInt.asUintN(64, hash * 1099511628211n)
  }
  return hash.toString(16).padStart(16, '0')
}

function makeKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `tree-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Reuses an unconfirmed request key when the user retries the same tree payload. */
export async function getTreeCreateAttemptKey(payload: TreeCreatePayload): Promise<string> {
  const currentFingerprint = await fingerprint(payload)
  const inMemory = memoryAttempts.get(currentFingerprint)
  if (inMemory) return inMemory
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const attempts = stored ? (JSON.parse(stored) as StoredTreeCreateAttempt) : {}
    const existing = attempts[currentFingerprint]
    if (existing) {
      memoryAttempts.set(currentFingerprint, existing)
      return existing
    }
    const key = makeKey()
    attempts[currentFingerprint] = key
    memoryAttempts.set(currentFingerprint, key)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts))
    return key
  } catch {
    const key = makeKey()
    memoryAttempts.set(currentFingerprint, key)
    return key
  }
}

export function clearTreeCreateAttemptKey(key: string): void {
  for (const [currentFingerprint, existingKey] of memoryAttempts) {
    if (existingKey === key) memoryAttempts.delete(currentFingerprint)
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return
    const attempts = JSON.parse(stored) as StoredTreeCreateAttempt
    for (const [currentFingerprint, existingKey] of Object.entries(attempts)) {
      if (existingKey === key) delete attempts[currentFingerprint]
    }
    if (Object.keys(attempts).length) localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be unavailable in private browsing; the API call still succeeds.
  }
}
