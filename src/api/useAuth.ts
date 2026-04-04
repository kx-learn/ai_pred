import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { loadCurrentUser, saveCurrentUser } from './storage'
import { loginApi, logoutApi } from './userApi'

export function useAuth() {
  const router = useRouter()
  const currentUser = computed(() => loadCurrentUser())

  async function login(username: string, password: string) {
    const u = (username || '').trim()
    const p = password || ''
    const apiRes = await loginApi(u, p)
    if (apiRes?.token) {
      const user = apiRes.user || {}
      const payload: Record<string, unknown> = {
        id: user.id ?? user.user_id ?? user.uid ?? null,
        username: user.account ?? user.username ?? u,
        name: user.name ?? user.displayName ?? user.account ?? u,
        role: user.role ?? user.role_name ?? user.roleName ?? 'manager',
        role_name: user.role_name ?? user.roleName ?? user.role_label ?? user.roleLabel ?? '',
        role_code: user.role_code ?? user.roleCode ?? '',
        displayName: user.name ?? user.displayName ?? user.account ?? u,
        token: apiRes.token,
      }
      saveCurrentUser(payload)
      return payload
    }
    throw new Error('用户名或密码错误')
  }

  async function logout() {
    try {
      await logoutApi()
    } catch {
      /* ignore */
    }
    saveCurrentUser(null)
    router.push('/login')
  }

  function requireLogin() {
    const user = loadCurrentUser()
    if (!user) {
      router.replace('/login')
      return null
    }
    return user
  }

  return {
    currentUser,
    login,
    logout,
    requireLogin,
  }
}
