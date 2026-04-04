<template>
  <div class="login-wrap d-flex align-items-center justify-content-center min-vh-100 p-3">
    <div class="card shadow-sm login-card">
      <div class="card-body p-4">
        <h1 class="h5 mb-3 text-center">登录</h1>
        <form @submit.prevent="onSubmit">
          <div class="mb-3">
            <label class="form-label" for="account">账号</label>
            <input id="account" v-model="account" type="text" class="form-control" autocomplete="username" required />
          </div>
          <div class="mb-3">
            <label class="form-label" for="password">密码</label>
            <input
              id="password"
              v-model="password"
              type="password"
              class="form-control"
              autocomplete="current-password"
              required
            />
          </div>
          <div v-if="errorMessage" class="alert alert-danger py-2 small">{{ errorMessage }}</div>
          <button type="submit" class="btn btn-success w-100" :disabled="loading">
            {{ loading ? '登录中…' : '登录' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/api/useAuth'

const router = useRouter()
const { login } = useAuth()

const account = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

async function onSubmit() {
  errorMessage.value = ''
  loading.value = true
  try {
    await login(account.value, password.value)
    router.replace('/')
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrap {
  background: linear-gradient(160deg, #ecfdf5 0%, #f8fafc 45%, #fff 100%);
}

.login-card {
  width: 100%;
  max-width: 380px;
}
</style>
