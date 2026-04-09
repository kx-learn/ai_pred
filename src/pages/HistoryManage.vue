<template>
  <div class="history-manage-page">
    <div class="card">
      <div class="action-bar">
        <div class="action-left">
          <button class="btn btn-primary" @click="triggerImport" :disabled="importLoading">
            {{ importLoading ? '导入中...' : '导入数据' }}
          </button>
          <button class="btn btn-secondary" @click="downloadTemplate">下载模板</button>
        </div>
      </div>
    </div>

    <!-- 预留空间，后续添加其他功能 -->
    <div class="card placeholder">
      <div class="placeholder-content">
        <p>功能开发中...</p>
      </div>
    </div>

    <input ref="fileInput" type="file" accept=".xlsx,.xls,.csv" style="display: none" @change="handleImport" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const importLoading = ref(false)
const fileInput = ref<HTMLInputElement>()

function downloadTemplate() {
  const headers = ['大区经理', '仓库', '送货日期', '冶炼厂', '合同编号', '品种', '重量']
  const csvContent = headers.join(',') + '\n' + '张建国,北京仓库,2024-01-01,金利,HT-0001,电解铜,100'
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = '送货数据导入模板.csv'
  link.click()
  URL.revokeObjectURL(link.href)
}

function triggerImport() {
  fileInput.value?.click()
}

async function handleImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  importLoading.value = true
  try {
    // TODO: 调用后端导入接口
    await new Promise(resolve => setTimeout(resolve, 500))
    alert('导入成功')
  } catch (error) {
    alert('导入失败')
  } finally {
    importLoading.value = false
    if (input) input.value = ''
  }
}
</script>

<style scoped>
.history-manage-page {
  width: 100%;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.action-bar {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.action-left {
  display: flex;
  gap: 12px;
}

.btn {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #4A7A9C;
  color: white;
}
.btn-primary:hover {
  background-color: #5a8aac;
}

.btn-secondary {
  background-color: #F5F7FA;
  color: #606266;
  border: 1px solid #E5E9F2;
}
.btn-secondary:hover {
  background-color: #E5E9F2;
}

.placeholder {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-content {
  color: #909399;
  font-size: 14px;
}
</style>