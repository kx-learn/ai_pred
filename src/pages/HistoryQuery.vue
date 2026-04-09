<template>
  <div class="history-query-page">
    <!-- 内页菜单 + 全局搜索 -->
    <div class="card">
      <div class="menu-search-bar">
        <div class="inner-menu">
          <div 
            class="menu-item"
            :class="{ active: activeTab === 'manager' }"
            @click="activeTab = 'manager'"
          >
            按大区经理查询
          </div>
          <div 
            class="menu-item"
            :class="{ active: activeTab === 'warehouse' }"
            @click="activeTab = 'warehouse'"
          >
            按仓库查询
          </div>
        </div>
        <div class="global-search">
          <input v-model="globalSearch" type="text" class="search-input" placeholder="全局搜索" @input="handleGlobalSearch" />
        </div>
      </div>
    </div>

    <!-- ==================== 按大区经理查询 ==================== -->
    <div v-if="activeTab === 'manager'" class="query-section">
      <div class="card">
        <div class="filter-row">
          <div class="filter-item">
            <label>送货日期</label>
            <div class="date-range">
              <input type="date" v-model="managerFilters.startDate" class="filter-input" />
              <span>至</span>
              <input type="date" v-model="managerFilters.endDate" class="filter-input" />
            </div>
          </div>
          <div class="filter-item">
            <label>大区经理</label>
            <input v-model="managerFilters.regionalManager" class="filter-input" placeholder="输入大区经理" />
          </div>
          <div class="filter-item">
            <label>冶炼厂</label>
            <select v-model="managerFilters.smelter" class="filter-select">
              <option value="">全部</option>
              <option v-for="name in smelterOptions" :key="name" :value="name">{{ name }}</option>
            </select>
          </div>
          <div class="filter-actions">
            <button class="btn btn-primary" @click="queryManagerData">查询</button>
            <button class="btn btn-secondary" @click="resetManagerFilters">重置</button>
            <button class="btn btn-danger" :disabled="selectedRows.length === 0" @click="handleBatchDelete">
              批量删除 ({{ selectedRows.length }})
            </button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="result-label">
          <span>有效合同明细（共 {{ managerFilteredRows.length }} 条）</span>
          <span class="unit-hint">表中数量为车数</span>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th width="40"><input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" /></th>
                <th>大区经理</th>
                <th>冶炼厂</th>
                <th v-for="date in managerDateColumns" :key="date">{{ date }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in managerDisplayRows" :key="`m-${idx}`">
                <td><input type="checkbox" v-model="selectedRows" :value="row.contract_no" /></td>
                <td v-if="row.showManager" :rowspan="row.managerRowspan">{{ row.regional_manager }}</td>
                <td>{{ row.smelter }}</td>
                <td v-for="(cell, i) in row.cells" :key="`${row.contract_no}-${i}`">
                  <span :class="{ 'cell-dash': cell.isPlaceholder }">{{ cell.text }}</span>
                </td>
              </tr>
              <tr v-if="managerDisplayRows.length === 0">
                <td :colspan="3 + managerDateColumns.length" class="empty-data">暂无符合筛选条件的数据</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination">
          <button @click="managerCurrentPage--" :disabled="managerCurrentPage === 1">上一页</button>
          <span>第 {{ managerCurrentPage }} / {{ managerTotalPages }} 页</span>
          <button @click="managerCurrentPage++" :disabled="managerCurrentPage === managerTotalPages">下一页</button>
          <select v-model="pageSize" @change="managerCurrentPage = 1">
            <option :value="10">10条/页</option>
            <option :value="20">20条/页</option>
            <option :value="50">50条/页</option>
          </select>
        </div>
      </div>
    </div>

    <!-- ==================== 按仓库查询 ==================== -->
    <div v-if="activeTab === 'warehouse'" class="query-section">
      <div class="card">
        <div class="filter-row">
          <div class="filter-item">
            <label>送货日期</label>
            <div class="date-range">
              <input type="date" v-model="warehouseFilters.startDate" class="filter-input" />
              <span>至</span>
              <input type="date" v-model="warehouseFilters.endDate" class="filter-input" />
            </div>
          </div>
          <div class="filter-item">
            <label>仓库</label>
            <input v-model="warehouseFilters.warehouse" class="filter-input" placeholder="输入仓库" />
          </div>
          <div class="filter-item">
            <label>大区经理</label>
            <input v-model="warehouseFilters.regionalManager" class="filter-input" placeholder="输入大区经理" />
          </div>
          <div class="filter-item">
            <label>冶炼厂</label>
            <select v-model="warehouseFilters.smelter" class="filter-select">
              <option value="">全部</option>
              <option v-for="name in smelterOptions" :key="name" :value="name">{{ name }}</option>
            </select>
          </div>
          <div class="filter-actions">
            <button class="btn btn-primary" @click="queryWarehouseData">查询</button>
            <button class="btn btn-secondary" @click="resetWarehouseFilters">重置</button>
            <button class="btn btn-danger" :disabled="warehouseSelectedRows.length === 0" @click="handleWarehouseBatchDelete">
              批量删除 ({{ warehouseSelectedRows.length }})
            </button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="result-label">
          <span>有效合同明细（共 {{ warehouseFilteredRows.length }} 条）</span>
          <span class="unit-hint">表中数量为车数</span>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th width="40"><input type="checkbox" :checked="isWarehouseAllSelected" @change="toggleWarehouseSelectAll" /></th>
                <th>仓库</th>
                <th>大区经理</th>
                <th>冶炼厂</th>
                <th v-for="date in warehouseDateColumns" :key="date">{{ date }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in warehouseDisplayRows" :key="`w-${idx}`">
                <td><input type="checkbox" v-model="warehouseSelectedRows" :value="row.contract_no" /></td>
                <td v-if="row.showWarehouse" :rowspan="row.warehouseRowspan">{{ row.warehouse }}</td>
                <td>{{ row.regional_manager }}</td>
                <td>{{ row.smelter }}</td>
                <td v-for="(cell, i) in row.cells" :key="`${row.contract_no}-${i}`">
                  <span :class="{ 'cell-dash': cell.isPlaceholder }">{{ cell.text }}</span>
                </td>
              </tr>
              <tr v-if="warehouseDisplayRows.length === 0">
                <td :colspan="4 + warehouseDateColumns.length" class="empty-data">暂无符合筛选条件的数据</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination">
          <button @click="warehouseCurrentPage--" :disabled="warehouseCurrentPage === 1">上一页</button>
          <span>第 {{ warehouseCurrentPage }} / {{ warehouseTotalPages }} 页</span>
          <button @click="warehouseCurrentPage++" :disabled="warehouseCurrentPage === warehouseTotalPages">下一页</button>
          <select v-model="warehousePageSize" @change="warehouseCurrentPage = 1">
            <option :value="10">10条/页</option>
            <option :value="20">20条/页</option>
            <option :value="50">50条/页</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  dateColumnsForMockQuery,
  generatePurchaseMockRecords,
  mockRecordsToTableRows,
  rowHasTruckInColumns,
  type PurchaseMockRecord,
} from '@/data/purchaseMockData'

// ==================== 模拟数据 ====================
interface ExtendedMockRecord extends PurchaseMockRecord {
  warehouse: string
}

const ALL_MOCK_RECORDS: ExtendedMockRecord[] = (() => {
  const raw = generatePurchaseMockRecords(100) as ExtendedMockRecord[]
  const warehouses = ['北京仓库', '上海仓库', '广州仓库', '深圳仓库', '成都仓库']
  
  const recordsWithWarehouse = raw.map((record, index) => ({
    ...record,
    warehouse: warehouses[index % warehouses.length]
  }))
  
  if (recordsWithWarehouse.length <= 2) return recordsWithWarehouse
  const a = Math.floor(Math.random() * recordsWithWarehouse.length)
  let b = Math.floor(Math.random() * recordsWithWarehouse.length)
  while (b === a) b = Math.floor(Math.random() * recordsWithWarehouse.length)
  return recordsWithWarehouse.filter((_, idx) => idx !== a && idx !== b)
})()

const FIXED_SMELTER_OPTIONS = ['金利', '豫光']

// ==================== 类型定义 ====================
type CellDisplay = { text: string; isPlaceholder?: boolean }

interface MockTableRow {
  regional_manager: string
  smelter: string
  contract_no: string
  cells: CellDisplay[]
  [key: string]: any
}

interface ExtendedTableRow {
  regional_manager: string
  warehouse: string
  smelter: string
  contract_no: string
  cells: CellDisplay[]
}

// ==================== 状态 ====================
const activeTab = ref('manager')
const globalSearch = ref('')

const todayStr = new Date().toISOString().slice(0, 10)
function plusDays(dateText: string, days: number) {
  const d = new Date(`${dateText}T00:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ==================== 按大区经理查询 ====================
const managerRows = ref<ExtendedTableRow[]>([])
const managerDateColumns = ref<string[]>([])
const managerCurrentPage = ref(1)
const pageSize = ref(10)
const selectedRows = ref<string[]>([])

const managerFilters = ref({
  startDate: '',
  endDate: '',
  regionalManager: '',
  smelter: '',
})

const smelterOptions = computed(() => {
  return FIXED_SMELTER_OPTIONS
})

const managerFilteredRows = computed(() => {
  let list = managerRows.value

  if (globalSearch.value) {
    const search = globalSearch.value.toLowerCase()
    list = list.filter(row =>
      row.regional_manager.toLowerCase().includes(search) ||
      row.smelter.toLowerCase().includes(search)
    )
  }

  list = list.filter(row => {
    if (managerFilters.value.regionalManager && !row.regional_manager.toLowerCase().includes(managerFilters.value.regionalManager.toLowerCase())) return false
    if (managerFilters.value.smelter && row.smelter !== managerFilters.value.smelter) return false
    return true
  })

  return list
})

const managerTotalPages = computed(() => Math.max(1, Math.ceil(managerFilteredRows.value.length / pageSize.value)))
const managerPagedRows = computed(() => {
  const start = (managerCurrentPage.value - 1) * pageSize.value
  return managerFilteredRows.value.slice(start, start + pageSize.value)
})

const managerDisplayRows = computed(() => {
  const list = managerPagedRows.value
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

const isAllSelected = computed(() => {
  return managerPagedRows.value.length > 0 && selectedRows.value.length === managerPagedRows.value.length
})

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedRows.value = []
  } else {
    selectedRows.value = managerPagedRows.value.map(row => row.contract_no)
  }
}

async function queryManagerData() {
  const { startDate, endDate, regionalManager, smelter } = managerFilters.value

  const filtered = ALL_MOCK_RECORDS.filter(r => {
    if (regionalManager && !r.regional_manager.toLowerCase().includes(regionalManager.toLowerCase())) return false
    if (smelter && r.smelter_company !== smelter) return false
    if (startDate && r.delivery_date < startDate) return false
    if (endDate && r.delivery_date > endDate) return false
    return true
  })

  const cols = dateColumnsForMockQuery(startDate || todayStr, endDate || plusDays(todayStr, 5))
  managerDateColumns.value = cols
  const built = mockRecordsToTableRows(filtered, cols) as MockTableRow[]
  
  const extendedRows: ExtendedTableRow[] = built.filter(r => rowHasTruckInColumns(r)).map(row => {
    const originalRecord = filtered.find(r => r.contract_no === row.contract_no)
    return {
      regional_manager: row.regional_manager,
      warehouse: originalRecord?.warehouse || '',
      smelter: row.smelter,
      contract_no: row.contract_no,
      cells: row.cells,
    }
  })
  
  managerRows.value = extendedRows
  managerCurrentPage.value = 1
  selectedRows.value = []
}

function resetManagerFilters() {
  managerFilters.value = {
    startDate: '',
    endDate: '',
    regionalManager: '',
    smelter: '',
  }
  queryManagerData()
}

function handleBatchDelete() {
  if (selectedRows.value.length === 0) return
  if (confirm(`确认删除选中的${selectedRows.value.length}条记录？此操作不可恢复。`)) {
    alert(`成功删除${selectedRows.value.length}条数据`)
    selectedRows.value = []
    queryManagerData()
  }
}

// ==================== 按仓库查询 ====================
const warehouseRows = ref<ExtendedTableRow[]>([])
const warehouseDateColumns = ref<string[]>([])
const warehouseCurrentPage = ref(1)
const warehousePageSize = ref(10)
const warehouseSelectedRows = ref<string[]>([])

const warehouseFilters = ref({
  startDate: '',
  endDate: '',
  warehouse: '',
  regionalManager: '',
  smelter: '',
})

const warehouseFilteredRows = computed(() => {
  let list = warehouseRows.value

  if (globalSearch.value) {
    const search = globalSearch.value.toLowerCase()
    list = list.filter(row =>
      row.warehouse.toLowerCase().includes(search) ||
      row.regional_manager.toLowerCase().includes(search) ||
      row.smelter.toLowerCase().includes(search)
    )
  }

  list = list.filter(row => {
    if (warehouseFilters.value.warehouse && !row.warehouse.toLowerCase().includes(warehouseFilters.value.warehouse.toLowerCase())) return false
    if (warehouseFilters.value.regionalManager && !row.regional_manager.toLowerCase().includes(warehouseFilters.value.regionalManager.toLowerCase())) return false
    if (warehouseFilters.value.smelter && row.smelter !== warehouseFilters.value.smelter) return false
    return true
  })

  return list
})

const warehouseTotalPages = computed(() => Math.max(1, Math.ceil(warehouseFilteredRows.value.length / warehousePageSize.value)))
const warehousePagedRows = computed(() => {
  const start = (warehouseCurrentPage.value - 1) * warehousePageSize.value
  return warehouseFilteredRows.value.slice(start, start + warehousePageSize.value)
})

const warehouseDisplayRows = computed(() => {
  const list = warehousePagedRows.value
  return list.map((row, idx) => {
    const prev = idx > 0 ? list[idx - 1] : null
    const isFirstInGroup = !prev || prev.warehouse !== row.warehouse
    let rowspan = 1
    if (isFirstInGroup) {
      for (let j = idx + 1; j < list.length; j++) {
        if (list[j].warehouse === row.warehouse) rowspan++
        else break
      }
    }
    return {
      ...row,
      showWarehouse: isFirstInGroup,
      warehouseRowspan: isFirstInGroup ? rowspan : 0,
    }
  })
})

const isWarehouseAllSelected = computed(() => {
  return warehousePagedRows.value.length > 0 && warehouseSelectedRows.value.length === warehousePagedRows.value.length
})

function toggleWarehouseSelectAll() {
  if (isWarehouseAllSelected.value) {
    warehouseSelectedRows.value = []
  } else {
    warehouseSelectedRows.value = warehousePagedRows.value.map(row => row.contract_no)
  }
}

async function queryWarehouseData() {
  const { startDate, endDate, warehouse, regionalManager, smelter } = warehouseFilters.value

  const filtered = ALL_MOCK_RECORDS.filter(r => {
    if (warehouse && !r.warehouse.toLowerCase().includes(warehouse.toLowerCase())) return false
    if (regionalManager && !r.regional_manager.toLowerCase().includes(regionalManager.toLowerCase())) return false
    if (smelter && r.smelter_company !== smelter) return false
    if (startDate && r.delivery_date < startDate) return false
    if (endDate && r.delivery_date > endDate) return false
    return true
  })

  const cols = dateColumnsForMockQuery(startDate || todayStr, endDate || plusDays(todayStr, 5))
  warehouseDateColumns.value = cols
  const built = mockRecordsToTableRows(filtered, cols) as MockTableRow[]
  
  const extendedRows: ExtendedTableRow[] = built.filter(r => rowHasTruckInColumns(r)).map(row => {
    const originalRecord = filtered.find(r => r.contract_no === row.contract_no)
    return {
      regional_manager: row.regional_manager,
      warehouse: originalRecord?.warehouse || '',
      smelter: row.smelter,
      contract_no: row.contract_no,
      cells: row.cells,
    }
  })
  
  warehouseRows.value = extendedRows
  warehouseCurrentPage.value = 1
  warehouseSelectedRows.value = []
}

function resetWarehouseFilters() {
  warehouseFilters.value = {
    startDate: '',
    endDate: '',
    warehouse: '',
    regionalManager: '',
    smelter: '',
  }
  queryWarehouseData()
}

function handleWarehouseBatchDelete() {
  if (warehouseSelectedRows.value.length === 0) return
  if (confirm(`确认删除选中的${warehouseSelectedRows.value.length}条记录？此操作不可恢复。`)) {
    alert(`成功删除${warehouseSelectedRows.value.length}条数据`)
    warehouseSelectedRows.value = []
    queryWarehouseData()
  }
}

function handleGlobalSearch() {
  if (activeTab.value === 'manager') {
    managerCurrentPage.value = 1
  } else {
    warehouseCurrentPage.value = 1
  }
}

onMounted(() => {
  queryManagerData()
  queryWarehouseData()
})
</script>

<style scoped>
.history-query-page { width: 100%; }
.card { background: white; border-radius: 8px; padding: 16px 20px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); }

.menu-search-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.inner-menu {
  display: flex;
  gap: 8px;
  background: #F5F7FA;
  border-radius: 8px;
  padding: 4px;
}

.menu-item {
  padding: 8px 24px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  transition: all 0.2s;
  color: #606266;
}

.menu-item:hover {
  background-color: rgba(74, 122, 156, 0.1);
}

.menu-item.active {
  background-color: #4A7A9C;
  color: white;
}

.global-search {
  flex-shrink: 0;
}

.search-input {
  padding: 6px 12px;
  border: 1px solid #E5E9F2;
  border-radius: 4px;
  width: 200px;
  font-size: 14px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 140px;
}

.filter-item label {
  font-size: 13px;
  font-weight: 500;
  color: #606266;
}

.date-range {
  display: flex;
  gap: 8px;
  align-items: center;
}

.filter-input {
  padding: 6px 10px;
  border: 1px solid #E5E9F2;
  border-radius: 4px;
  font-size: 13px;
  width: 130px;
}

.filter-select {
  padding: 6px 10px;
  border: 1px solid #E5E9F2;
  border-radius: 4px;
  font-size: 13px;
  min-width: 120px;
}

.filter-actions {
  display: flex;
  gap: 10px;
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
.btn-primary:hover { background-color: #5a8aac; }

.btn-secondary {
  background-color: #F5F7FA;
  color: #606266;
  border: 1px solid #E5E9F2;
}
.btn-secondary:hover { background-color: #E5E9F2; }

.btn-danger {
  background-color: #f56c6c;
  color: white;
}
.btn-danger:hover:not(:disabled) { background-color: #f78989; }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

.result-label {
  font-size: 14px;
  font-weight: 600;
  color: #2e7d32;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.unit-hint {
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
}

.table-wrapper {
  overflow-x: auto;
  border: 1px solid #E5E9F2;
  border-radius: 4px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th,
.data-table td {
  padding: 10px 12px;
  text-align: center;
  border-bottom: 1px solid #E5E9F2;
  white-space: nowrap;
}

.data-table th {
  background-color: #E8F0F8;
  font-weight: 600;
  color: #2c3e50;
}

.data-table tbody tr:hover {
  background-color: #F5F7FA;
}

.empty-data {
  text-align: center;
  padding: 40px;
  color: #909399;
}

.cell-dash {
  color: #94a3b8;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.pagination button {
  padding: 4px 12px;
  border: 1px solid #E5E9F2;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination select {
  padding: 4px 8px;
  border: 1px solid #E5E9F2;
  border-radius: 4px;
}
</style>