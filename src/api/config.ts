/**
 * 与 Staff-PC-Version `api/config.js` 行为一致：开发默认走 Vite 代理 `/api/v1`。
 */
const DEFAULT_BACKEND = 'http://111.229.25.160:8001'

export function getApiBase(): string {
  const env = import.meta.env.VITE_API_BASE
  if (env && (env.startsWith('http://') || env.startsWith('https://')))
    return env.replace(/\/$/, '')
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    const target = import.meta.env.VITE_API_TARGET || DEFAULT_BACKEND
    return `${target.replace(/\/$/, '')}/api/v1`
  }
  if (import.meta.env.VITE_DIRECT_API === '1') {
    const target = import.meta.env.VITE_API_TARGET || DEFAULT_BACKEND
    return `${target.replace(/\/$/, '')}/api/v1`
  }
  return '/api/v1'
}
