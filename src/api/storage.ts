export const STORAGE_KEYS = {
  currentUser: 'app_current_user',
} as const

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSetItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch (e: unknown) {
    console.warn('本地存储不可用:', e instanceof Error ? e.message : e)
  }
}

function safeRemoveItem(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function loadCurrentUser(): Record<string, unknown> & { token?: string } | null {
  try {
    const raw = safeGetItem(STORAGE_KEYS.currentUser)
    return raw ? (JSON.parse(raw) as Record<string, unknown> & { token?: string }) : null
  } catch {
    return null
  }
}

export function saveCurrentUser(user: Record<string, unknown> | null) {
  if (!user) safeRemoveItem(STORAGE_KEYS.currentUser)
  else safeSetItem(STORAGE_KEYS.currentUser, JSON.stringify(user))
}
