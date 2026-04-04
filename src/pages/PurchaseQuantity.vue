<template>
  <div class="purchase-page">
    <section class="page-section">
      <div class="page-head">
        <h1 class="page-title">AI预测报货数量</h1>
        <button type="button" class="btn btn-outline-secondary btn-sm" @click="onLogout">退出登录</button>
      </div>
      <div class="card shadow-sm">
        <div class="card-header bg-white fw-bold">
          <i class="bi bi-table me-2"></i>表格数据
        </div>
        <div class="card-body">
          <div class="result-content">
            <div class="result-label">查询条件</div>
            <div class="query-row mb-3">
              <div class="query-item query-date">
                <input v-model="filters.startDate" type="date" class="form-control form-control-sm" />
              </div>
              <div class="query-item query-date">
                <input v-model="filters.endDate" type="date" class="form-control form-control-sm" />
              </div>
              <div class="query-item query-manager">
                <select v-model="filters.regionalManager" class="form-select form-select-sm">
                  <option value="">大区经理（仓库）：全部</option>
                  <option v-for="name in managerOptions" :key="name" :value="name">{{ name }}</option>
                </select>
              </div>
              <div class="query-item query-contract">
                <input v-model.trim="filters.contractNo" class="form-control form-control-sm" placeholder="合同编号" />
              </div>
              <div class="query-item query-smelter">
                <select v-model="filters.smelter" class="form-select form-select-sm">
                  <option value="">冶炼厂：全部</option>
                  <option value="金利">金利</option>
                  <option value="豫光">豫光</option>
                </select>
              </div>
              <div class="query-actions">
                <button type="button" class="btn btn-success btn-sm" :disabled="tableLoading" @click="queryTableData">
                  {{ tableLoading ? '查询中...' : '查询' }}
                </button>
                <button type="button" class="btn btn-outline-secondary btn-sm" @click="resetFilters">重置</button>
              </div>
            </div>

            <div v-if="errorMessage" class="alert alert-danger py-2">{{ errorMessage }}</div>

            <div class="result-label">有效合同明细（共 {{ filteredRows.length }} 条）</div>
            <div class="table-scroll">
              <table class="result-table">
                <thead>
                  <tr>
                    <th>大区经理</th>
                    <th>冶炼厂</th>
                    <th>合同编号</th>
                    <th v-for="date in dateColumns" :key="date">{{ date }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, idx) in pagedRowsWithMerge" :key="`r-${idx}`">
                    <td v-if="row.showManager" :rowspan="row.managerRowspan">{{ row.regional_manager }}</td>
                    <td>{{ row.smelter }}</td>
                    <td>{{ row.contract_no }}</td>
                    <td v-for="(v, i) in row.values" :key="`${row.contract_no}-${i}`">{{ v }}</td>
                  </tr>
                  <tr v-if="!pagedRowsWithMerge.length">
                    <td :colspan="3 + dateColumns.length" class="empty-hint">暂无符合筛选条件的数据</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="table-pager">
              <button type="button" class="pager-btn" :disabled="currentPage === 1" @click="prevPage">上一页</button>
              <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
              <button type="button" class="pager-btn" :disabled="currentPage === totalPages" @click="nextPage">
                下一页
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getApiBase } from '@/api/config'
import { fetchWithAuth } from '@/api/userApi'
import { useAuth } from '@/api/useAuth'

const auth = useAuth()
auth.requireLogin()

async function onLogout() {
  await auth.logout()
}

const API_BASE = getApiBase()
const PURCHASE_QUANTITY_QUERY_URL = `${API_BASE}/allocation/purchase-quantity/query`

const tableLoading = ref(false)
const errorMessage = ref('')

const todayStr = new Date().toISOString().slice(0, 10)
function plusDays(dateText: string, days: number) {
  const d = new Date(`${dateText}T00:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const filters = ref({
  startDate: todayStr,
  endDate: plusDays(todayStr, 5),
  regionalManager: '',
  contractNo: '',
  smelter: '',
})

const warehouses = ref<string[]>([])
const rows = ref<TableRow[]>([])
const currentPage = ref(1)
const pageSize = 10

type TableRow = {
  regional_manager: string
  smelter: string
  contract_no: string
  values: (string | number)[]
}

const managerOptions = computed(() => (warehouses.value || []).map((item) => String(item)))

function buildDateList(start: string, end: string) {
  if (!start || !end || start > end) return []
  const list: string[] = []
  let cur = new Date(`${start}T00:00:00`)
  const last = new Date(`${end}T00:00:00`)
  while (cur <= last) {
    list.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`,
    )
    cur.setDate(cur.getDate() + 1)
  }
  return list
}

const dateColumns = computed(() => buildDateList(filters.value.startDate, filters.value.endDate))

function flattenPlan(plan: unknown): TableRow[] {
  const result: TableRow[] = []
  if (!plan || typeof plan !== 'object') return result
  const planObj = plan as Record<string, unknown>
  Object.entries(planObj).forEach(([warehouse, contractMap]) => {
    if (!contractMap || typeof contractMap !== 'object') return
    Object.entries(contractMap as Record<string, unknown>).forEach(([contractNo, smelterMap]) => {
      if (!smelterMap || typeof smelterMap !== 'object') return
      Object.entries(smelterMap as Record<string, unknown>).forEach(([smelter, dateMap]) => {
        if (!dateMap || typeof dateMap !== 'object') return
        const dm = dateMap as Record<string, unknown>
        const values: (string | number)[] = dateColumns.value.map((d) => {
          const v = dm[d]
          if (v === undefined || v === null) return '-'
          return typeof v === 'number' || typeof v === 'string' ? v : String(v)
        })
        result.push({
          regional_manager: warehouse,
          smelter,
          contract_no: contractNo,
          values,
        })
      })
    })
  })
  return result
}

const filteredRows = computed(() => {
  return rows.value.filter((row) => {
    const byManager =
      !filters.value.regionalManager || String(row.regional_manager).includes(filters.value.regionalManager)
    const byContract = !filters.value.contractNo || String(row.contract_no).includes(filters.value.contractNo)
    const bySmelter = !filters.value.smelter || String(row.smelter).includes(filters.value.smelter)
    return byManager && byContract && bySmelter
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / pageSize)))

const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredRows.value.slice(start, start + pageSize)
})

type MergedRow = TableRow & { showManager: boolean; managerRowspan: number }

const pagedRowsWithMerge = computed((): MergedRow[] => {
  const managerCounts: Record<string, number> = {}
  pagedRows.value.forEach((row) => {
    managerCounts[row.regional_manager] = (managerCounts[row.regional_manager] || 0) + 1
  })
  const firstSeen: Record<string, number> = {}
  return pagedRows.value.map((row, idx) => {
    const isFirst = firstSeen[row.regional_manager] === undefined
    if (isFirst) firstSeen[row.regional_manager] = idx
    return {
      ...row,
      showManager: isFirst,
      managerRowspan: isFirst ? managerCounts[row.regional_manager] : 0,
    }
  })
})

watch(
  [
    filteredRows,
    () => filters.value.startDate,
    () => filters.value.endDate,
    () => filters.value.regionalManager,
    () => filters.value.contractNo,
    () => filters.value.smelter,
  ],
  () => {
    currentPage.value = 1
  },
)

function prevPage() {
  if (currentPage.value > 1) currentPage.value -= 1
}

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value += 1
}

async function queryTableData() {
  tableLoading.value = true
  errorMessage.value = ''
  try {
    // 与 Swagger 一致：请求体字段均为 string；未筛选时用空字符串表示「全部」
    const payload = {
      start_date: filters.value.startDate,
      end_date: filters.value.endDate,
      warehouse: filters.value.regionalManager.trim(),
      contract_no: filters.value.contractNo.trim(),
      smelter: filters.value.smelter.trim(),
    }
    const result = await fetchWithAuth(PURCHASE_QUANTITY_QUERY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    })
    if (result._tokenExpired) return
    const { res, data: body } = result
    const b = body as {
      success?: boolean
      message?: string
      detail?: unknown
      data?: {
        warehouse_options?: string[]
        plan?: unknown
      }
    }
    if (!res.ok) {
      const detail = b?.detail ?? (b as { message?: string }).message
      const msg = Array.isArray(detail)
        ? detail.map((x: { msg?: string } | string) => (typeof x === 'object' && x?.msg ? x.msg : x)).join('; ')
        : (detail || `请求失败：${res.status}`)
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
    }
    if (b.success === false) {
      throw new Error(b.message || '查询失败')
    }
    const data = b.data ?? body
    const dataObj = data as { warehouse_options?: string[]; plan?: unknown }
    warehouses.value = Array.isArray(dataObj?.warehouse_options) ? dataObj.warehouse_options : []
    const plan = dataObj?.plan ?? {}
    rows.value = flattenPlan(plan)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '查询失败'
    rows.value = []
  } finally {
    tableLoading.value = false
  }
}

function resetFilters() {
  filters.value = {
    startDate: todayStr,
    endDate: plusDays(todayStr, 5),
    regionalManager: '',
    contractNo: '',
    smelter: '',
  }
  errorMessage.value = ''
}
</script>

<style scoped>
.purchase-page {
  padding: 16px;
  max-width: 100%;
  box-sizing: border-box;
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 1.35rem;
  font-weight: 600;
  color: #166534;
  margin: 0;
  text-align: left;
}

.page-section {
  text-align: left;
}

.result-content {
  background: #f8fafc;
  border-radius: 12px;
  padding: 16px;
}

.result-label {
  font-size: 14px;
  font-weight: 600;
  color: #2e7d32;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.table-scroll {
  overflow-x: auto;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #fff;
}

.result-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.result-table th,
.result-table td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
  line-height: 20px;
}

.result-table tbody tr {
  height: 40px;
}

.result-table th {
  background: #f0f4f8;
  font-weight: 600;
  color: #2c3e50;
}

.empty-hint {
  text-align: center;
  color: #94a3b8;
  padding: 18px 12px;
}

.table-pager {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
  margin-top: 10px;
  font-size: 13px;
  color: #475569;
}

.pager-btn {
  border: 1px solid #16a34a;
  background: #fff;
  color: #166534;
  border-radius: 6px;
  padding: 2px 10px;
}

.pager-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.query-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 20px;
  width: 100%;
  box-sizing: border-box;
}

.query-item {
  min-width: 0;
}

.query-item .form-control,
.query-item .form-select {
  width: 100%;
}

.query-date {
  flex: 1 1 150px;
  max-width: 220px;
}

.query-manager {
  flex: 2 1 220px;
}

.query-contract {
  flex: 2 1 200px;
}

.query-smelter {
  flex: 1 1 150px;
  max-width: 200px;
}

.query-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  margin-left: auto;
}
</style>
