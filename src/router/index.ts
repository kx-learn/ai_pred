import { createRouter, createWebHistory } from 'vue-router'
import HistoryManagement from '../pages/HistoryManage.vue'
import PurchaseQuantity from '../pages/PurchaseQuantity.vue'

const routes = [
  {
    path: '/',
    redirect: '/history'
  },
  {
    path: '/history',
    name: 'HistoryManagement',
    component: HistoryManagement
  },
  {
    path: '/forecast',
    name: 'DeliveryForecast',
    component: PurchaseQuantity
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router