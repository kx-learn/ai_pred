<template>
  <div class="purchase-page">
    <section class="page-section">
      <div class="page-head">
        <h1 class="page-title">AI预测报货数量</h1>
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
                  <option v-for="name in SMELTER_POOL" :key="name" :value="name">{{ name }}</option>
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
                    <td v-for="(cell, i) in row.cells" :key="`${row.contract_no}-${i}`">
                      <span
                        :class="{
                          'cell-completed': cell.completed,
                          'cell-dash': cell.isPlaceholder,
                        }"
                        >{{ cell.text }}</span
                      >
                    </td>
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
import { fetchJson } from '@/api/userApi'

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

type CellDisplay = { text: string; completed: boolean; isPlaceholder?: boolean }

type TableRow = {
  regional_manager: string
  smelter: string
  contract_no: string
  cells: CellDisplay[]
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

/** 接口：仅「出货结束」为已完成（0 或字面 已完成）；缺日期/无计划显示 —，不标已完成 */
function toCell(v: unknown): CellDisplay {
  if (v === undefined || v === null)
    return { text: '—', completed: false, isPlaceholder: true }
  if (v === '-' || v === '')
    return { text: '—', completed: false, isPlaceholder: true }
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return { text: '—', completed: false, isPlaceholder: true }
    if (v === 0) return { text: '已完成', completed: true }
    return { text: String(v), completed: false }
  }
  if (typeof v === 'string') {
    const t = v.trim()
    if (t === '' || t === '-') return { text: '—', completed: false, isPlaceholder: true }
    if (t === '已完成') return { text: '已完成', completed: true }
    const n = Number(t)
    if (!Number.isNaN(n) && n === 0) return { text: '已完成', completed: true }
    return { text: t, completed: false }
  }
  return { text: String(v), completed: false }
}

/** 单子完结后只在「完成后的第一天」显示已完成，后续日期不再重复写已完成 */
function onlyFirstCompletedLabel(cells: CellDisplay[]): CellDisplay[] {
  let seenCompleted = false
  return cells.map((c) => {
    if (c.completed && c.text === '已完成') {
      if (!seenCompleted) {
        seenCompleted = true
        return c
      }
      return { text: '—', completed: false, isPlaceholder: true }
    }
    return c
  })
}

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
        const cells = onlyFirstCompletedLabel(dateColumns.value.map((d) => toCell(dm[d])))
        result.push({
          regional_manager: warehouse,
          smelter,
          contract_no: contractNo,
          cells,
        })
      })
    })
  })
  return result
}

const MOCK_ROW_COUNT = 20

const DEFAULT_WAREHOUSES_FALLBACK = ['山东仓库', '山西仓库']

/** 模拟数据轮询用；筛选下拉里同步展示，并非「仅两家冶炼厂」 */
const SMELTER_POOL = [
  '金利',
  '豫光',
  '株冶',
  '水口山',
  '驰宏锌锗',
  '南方有色',
  '中金岭南',
  '葫芦岛锌业',
  '东岭',
  '白银有色',
  '韶关冶炼',
  '云锡',
] as const

/** 去重且保序；空则退回默认 */
function normalizeWarehouseManagers(warehouseOptions: string[]): string[] {
  const raw =
    warehouseOptions.length > 0
      ? warehouseOptions.map((s) => String(s).trim()).filter((s) => s.length > 0)
      : [...DEFAULT_WAREHOUSES_FALLBACK]
  const seen = new Set<string>()
  const out: string[] = []
  for (const m of raw) {
    if (!seen.has(m)) {
      seen.add(m)
      out.push(m)
    }
  }
  return out
}

/** 每个大区经理对应唯一冶炼厂；按列表顺序轮流分配，故同一冶炼厂可对应多个大区经理 */
function buildManagerToSmelter(managers: string[]): Map<string, string> {
  const map = new Map<string, string>()
  managers.forEach((mgr, idx) => {
    map.set(mgr, SMELTER_POOL[idx % SMELTER_POOL.length]!)
  })
  return map
}

/** 接口未返回 plan 时占位：大区经理全部来自 warehouse_options；行数不少于 20 且不少于大区经理人数 */
function generateMockRows(dateList: string[], warehouseOptions: string[]): TableRow[] {
  const managers = normalizeWarehouseManagers(warehouseOptions)
  const managerToSmelter = buildManagerToSmelter(managers)
  const targetCount = Math.max(MOCK_ROW_COUNT, managers.length)

  const rows: TableRow[] = []
  for (let i = 0; i < targetCount; i++) {
    const regional_manager = managers[i % managers.length]!
    const smelter = managerToSmelter.get(regional_manager)!
    const contract_no = `DEMO_${String(i + 1).padStart(3, '0')}`

    // 先排出货量；出货结束后的第一天写「已完成」，再往后只显示 —
    const len = dateList.length
    const cells: CellDisplay[] = []
    if (len === 0) {
      rows.push({ regional_manager, smelter, contract_no, cells })
      continue
    }
    const truckDayCount = Math.min(len, 1 + (i % len))
    for (let di = 0; di < len; di++) {
      if (di < truckDayCount) {
        const trucks = 1 + ((i + di) % 3)
        cells.push({ text: String(trucks), completed: false })
      } else if (di === truckDayCount) {
        cells.push({ text: '已完成', completed: true })
      } else {
        cells.push({ text: '—', completed: false, isPlaceholder: true })
      }
    }
    rows.push({ regional_manager, smelter, contract_no, cells })
  }
  return rows
}

function isPlanEmpty(plan: unknown): boolean {
  if (plan == null) return true
  if (typeof plan !== 'object') return true
  return Object.keys(plan as object).length === 0
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

/** 仅合并「相邻且大区经理相同」的行；跨页或非连续同名各画独立单元格，避免列错位 */
const pagedRowsWithMerge = computed((): MergedRow[] => {
  const list = pagedRows.value
  return list.map((row, idx) => {
    const prev = idx > 0 ? list[idx - 1] : null
    const isFirstInGroup = !prev || prev.regional_manager !== row.regional_manager
    let rowspan = 1
    if (isFirstInGroup) {
      for (let j = idx + 1; j < list.length; j++) {
        if (list[j].regional_manager === row.regional_manager) rowspan++
        else break
      }
    }
    return {
      ...row,
      showManager: isFirstInGroup,
      managerRowspan: isFirstInGroup ? rowspan : 0,
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
    const { res, data: body } = await fetchJson(PURCHASE_QUANTITY_QUERY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    })
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
    const plan = dataObj?.plan
    if (isPlanEmpty(plan)) {
      rows.value = generateMockRows(
        buildDateList(filters.value.startDate, filters.value.endDate),
        warehouses.value,
      )
    } else {
      rows.value = flattenPlan(plan)
    }
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
  margin-bottom: 16px;
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

.cell-completed {
  color: #15803d;
  font-weight: 600;
}

.cell-dash {
  color: #94a3b8;
  font-weight: normal;
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
