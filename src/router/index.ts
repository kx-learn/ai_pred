import { createRouter, createWebHistory } from 'vue-router'
import { loadCurrentUser } from '@/api/storage'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'purchase-quantity',
      component: () => import('@/pages/PurchaseQuantity.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/Login.vue'),
      meta: { public: true },
    },
  ],
})

router.beforeEach((to, _from, next) => {
  if (to.meta.public) {
    if (loadCurrentUser()) next({ path: '/' })
    else next()
  } else {
    if (!loadCurrentUser()) next({ path: '/login' })
    else next()
  }
})

export default router
