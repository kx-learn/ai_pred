import { getApiBase } from './config'
import { loadCurrentUser, saveCurrentUser } from './storage'

const API_BASE = getApiBase()
const USER_BASE = `${API_BASE}/user`

function loginPageUrl(): string {
  return new URL('login', window.location.origin + import.meta.env.BASE_URL).href
}

export function handleTokenExpired() {
  saveCurrentUser(null)
  try {
    window.location.href = loginPageUrl()
  } catch {
    /* ignore */
  }
}

export function checkTokenExpired(res: Response, responseText: string): boolean {
  if (res.status === 401) {
    handleTokenExpired()
    return true
  }
  try {
    const data = responseText ? (JSON.parse(responseText) as { detail?: unknown }) : {}
    const detail = data.detail
    if (
      typeof detail === 'string' &&
      (detail === 'Token expired' || detail.toLowerCase().includes('token expired'))
    ) {
      handleTokenExpired()
      return true
    }
  } catch {
    /* ignore */
  }
  return false
}

export function authHeaders(extra: Record<string, string> = {}) {
  const h: Record<string, string> = { ...extra }
  const user = loadCurrentUser()
  if (user?.token && typeof user.token === 'string')
    h.Authorization = user.token.startsWith('Bearer ') ? user.token : `Bearer ${user.token}`
  return h
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
): Promise<{ _tokenExpired?: true; res: Response; data: unknown }> {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: { ...authHeaders(), ...(options.headers as Record<string, string> | undefined) },
  })
  const text = await res.text()
  if (checkTokenExpired(res, text)) return { _tokenExpired: true, res, data: {} }
  let data: unknown = {}
  try {
    if (text) data = JSON.parse(text) as unknown
  } catch {
    /* ignore */
  }
  return { res, data }
}

export async function loginApi(account: string, password: string) {
  const path = `${USER_BASE}/auth/login`
  try {
    const res = await fetch(path, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: (account || '').trim(), password: password || '' }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as Record<string, unknown>
    const token =
      (data.token as string | undefined) ??
      (data.access_token as string | undefined) ??
      ((data.data as Record<string, unknown> | undefined)?.token as string | undefined) ??
      ((data.data as Record<string, unknown> | undefined)?.access_token as string | undefined)
    const user =
      (data.user as Record<string, unknown> | undefined) ??
      ((data.data as Record<string, unknown> | undefined)?.user as Record<string, unknown> | undefined) ??
      (data.data as Record<string, unknown> | undefined) ??
      data
    if (token) return { token, user: user && typeof user === 'object' ? user : {} }
  } catch {
    /* ignore */
  }
  return null
}

export async function logoutApi() {
  try {
    await fetch(`${USER_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
    })
  } catch {
    /* ignore */
  }
}
