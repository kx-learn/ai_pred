<template>
  <div class="history-manage-page">
    <!-- 内页菜单 -->
    <div class="card">
      <div class="inner-menu">
        <div 
          class="menu-item"
          :class="{ active: activeTab === 'import' }"
          @click="activeTab = 'import'"
        >
          数据导入
        </div>
        <div 
          class="menu-item"
          :class="{ active: activeTab === 'list' }"
          @click="activeTab = 'list'"
        >
          数据列表
        </div>
      </div>
    </div>

    <!-- ==================== 数据导入标签页 ==================== -->
    <div v-if="activeTab === 'import'" class="import-tab">
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

      <div v-if="importResult.show" class="card result-card">
        <div :class="['result-message', importResult.success ? 'success' : 'error']">
          <span class="result-icon">{{ importResult.success ? '✓' : '✗' }}</span>
          <span>{{ importResult.message }}</span>
        </div>
        <div v-if="!importResult.success && importResult.errors.length > 0" class="error-list">
          <p>错误详情：</p>
          <ul>
            <li v-for="err in importResult.errors" :key="err">{{ err }}</li>
          </ul>
        </div>
      </div>

      <div class="card placeholder">
        <div class="placeholder-content">
          <p>请点击"导入数据"按钮，选择符合模板的Excel文件</p>
          <p class="placeholder-tip">模板表头：大区经理、仓库、送货日期、品种、重量</p>
        </div>
      </div>
    </div>

    <!-- ==================== 数据列表标签页 ==================== -->
    <div v-if="activeTab === 'list'" class="list-tab">
      <!-- 筛选区 -->
      <div class="card">
        <div class="filter-row">
          <div class="filter-item date-item">
            <label>送货日期</label>
            <div class="date-range">
              <input type="date" v-model="filters.startDate" class="filter-input date-input" />
              <span>至</span>
              <input type="date" v-model="filters.endDate" class="filter-input date-input" />
            </div>
          </div>

          <!-- 大区经理多选 -->
          <div class="filter-item multi-select-item">
            <label>大区经理</label>
            <div class="multi-select-container">
              <div class="selected-tags" @click="focusManagerInput">
                <span v-for="item in selectedManagers" :key="item" class="tag">
                  {{ item }}
                  <button type="button" class="tag-remove" @click.stop="removeManager(item)">×</button>
                </span>
                <input 
                  ref="managerInputRef"
                  v-model="managerSearchText"
                  type="text"
                  class="multi-input"
                  placeholder="搜索并选择"
                  @input="filterManagerOptions"
                  @focus="managerDropdownVisible = true"
                  @blur="closeManagerDropdown"
                />
              </div>
              <div v-show="managerDropdownVisible && filteredManagerOptions.length > 0" class="dropdown-list">
                <div 
                  v-for="item in filteredManagerOptions" 
                  :key="item"
                  class="dropdown-item"
                  @click="addManager(item)"
                >
                  {{ item }}
                </div>
              </div>
            </div>
          </div>

          <!-- 仓库多选 -->
          <div class="filter-item multi-select-item">
            <label>仓库</label>
            <div class="multi-select-container">
              <div class="selected-tags" @click="focusWarehouseInput">
                <span v-for="item in selectedWarehouses" :key="item" class="tag">
                  {{ item }}
                  <button type="button" class="tag-remove" @click.stop="removeWarehouse(item)">×</button>
                </span>
                <input 
                  ref="warehouseInputRef"
                  v-model="warehouseSearchText"
                  type="text"
                  class="multi-input"
                  placeholder="搜索并选择"
                  @input="filterWarehouseOptions"
                  @focus="warehouseDropdownVisible = true"
                  @blur="closeWarehouseDropdown"
                />
              </div>
              <div v-show="warehouseDropdownVisible && filteredWarehouseOptions.length > 0" class="dropdown-list">
                <div 
                  v-for="item in filteredWarehouseOptions" 
                  :key="item"
                  class="dropdown-item"
                  @click="addWarehouse(item)"
                >
                  {{ item }}
                </div>
              </div>
            </div>
          </div>

          <!-- 品种多选 -->
          <div class="filter-item multi-select-item">
            <label>品种</label>
            <div class="multi-select-container">
              <div class="selected-tags" @click="focusVarietyInput">
                <span v-for="item in selectedVarieties" :key="item" class="tag">
                  {{ item }}
                  <button type="button" class="tag-remove" @click.stop="removeVariety(item)">×</button>
                </span>
                <input 
                  ref="varietyInputRef"
                  v-model="varietySearchText"
                  type="text"
                  class="multi-input"
                  placeholder="搜索并选择"
                  @input="filterVarietyOptions"
                  @focus="varietyDropdownVisible = true"
                  @blur="closeVarietyDropdown"
                />
              </div>
              <div v-show="varietyDropdownVisible && filteredVarietyOptions.length > 0" class="dropdown-list">
                <div 
                  v-for="item in filteredVarietyOptions" 
                  :key="item"
                  class="dropdown-item"
                  @click="addVariety(item)"
                >
                  {{ item }}
                </div>
              </div>
            </div>
          </div>

          <div class="filter-actions">
            <button class="btn btn-primary" @click="handleQuery" :disabled="tableLoading">查询</button>
            <button class="btn btn-secondary" @click="handleReset">重置</button>
            <button class="btn btn-secondary" @click="exportFilteredData">导出Excel</button>
          </div>
        </div>
      </div>

      <!-- 批量删除按钮 -->
      <div class="card batch-card">
        <div class="batch-bar">
          <button class="btn btn-danger" :disabled="selectedRows.length === 0" @click="handleBatchDelete">
            批量删除 ({{ selectedRows.length }})
          </button>
        </div>
      </div>

      <!-- 数据表格 -->
      <div class="card">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th width="40"><input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" /></th>
                <th>送货日期</th>
                <th>大区经理</th>
                <th>仓库</th>
                <th>重量(吨)</th>
                <th width="70">查看</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in paginatedData" :key="row.id">
                <td><input type="checkbox" v-model="selectedRows" :value="row.id" /></td>
                <td>{{ row.deliveryDate }}</td>
                <td>{{ row.regionalManager }}</td>
                <td>{{ row.warehouse }}</td>
                <td>{{ row.weight }}</td>
                <td><button class="btn-view" @click="openDetailModal(row)">查看</button></td>
              </tr>
              <tr v-if="paginatedData.length === 0">
                <td :colspan="6" class="empty-data">暂无数据</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination">
          <button @click="prevPage" :disabled="currentPage === 1">上一页</button>
          <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
          <button @click="nextPage" :disabled="currentPage === totalPages">下一页</button>
          <select v-model="pageSize" @change="currentPage = 1">
            <option :value="10">10条/页</option>
            <option :value="20">20条/页</option>
            <option :value="50">50条/页</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 详情弹窗（品种列表带筛选状态） -->
    <div v-if="modalVisible" class="modal" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ modalTitle }}</h3>
          <button class="close-btn" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="modal-info">
            <p><strong>送货日期：</strong>{{ modalData?.deliveryDate }}</p>
            <p><strong>大区经理：</strong>{{ modalData?.regionalManager }}</p>
            <p><strong>仓库：</strong>{{ modalData?.warehouse }}</p>
          </div>
          <div class="modal-table-header">
            <span class="modal-result-label">品种明细</span>
            <button class="btn btn-sm btn-secondary" @click="exportModalExcel">导出Excel</button>
          </div>
          <div class="table-wrapper">
            <table class="data-table modal-table">
              <thead>
                <tr>
                  <th>品种</th>
                  <th>重量(吨)</th>
                  <th width="100">筛选状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in modalVarietyData" :key="item.variety" :class="{ 'row-selected': isVarietySelected(item.variety) }">
                  <td>{{ item.variety }}</td>
                  <td>{{ item.weight }}</td>
                  <td>
                    <span v-if="isVarietySelected(item.variety)" class="status-selected">✅ 已选择</span>
                    <span v-else class="status-none">—</span>
                  </td>
                </tr>
                <tr v-if="modalVarietyData.length === 0">
                  <td :colspan="3" class="empty-data">暂无数据</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">关闭</button>
        </div>
      </div>
    </div>

    <input ref="fileInput" type="file" accept=".xlsx,.xls,.csv" style="display: none" @change="handleImport" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// ==================== 类型定义 ====================
interface HistoryRecord {
  id: string
  deliveryDate: string
  regionalManager: string
  warehouse: string
  variety: string
  weight: number
  createTime: string
}

// ==================== 状态 ====================
const activeTab = ref('import')
const tableLoading = ref(false)
const importLoading = ref(false)
const fileInput = ref<HTMLInputElement>()

const importResult = ref({
  show: false,
  success: false,
  message: '',
  errors: [] as string[]
})

// ==================== 模拟数据 ====================
const generateMockData = (): HistoryRecord[] => {
  const managers = ['张建国', '李明华', '王德发', '刘志强', '陈晓东']
  const warehouses = ['北京仓库', '上海仓库', '广州仓库', '深圳仓库', '成都仓库']
  const varieties = ['电解铜', '铝锭', '锌锭', '铅锭', '镍板']
  
  const data: HistoryRecord[] = []
  for (let i = 1; i <= 100; i++) {
    const date = new Date(2024, Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 28) + 1)
    data.push({
      id: `ID-${String(i).padStart(6, '0')}`,
      deliveryDate: date.toISOString().slice(0, 10),
      regionalManager: managers[Math.floor(Math.random() * managers.length)],
      warehouse: warehouses[Math.floor(Math.random() * warehouses.length)],
      variety: varieties[Math.floor(Math.random() * varieties.length)],
      weight: Math.floor(Math.random() * 500) + 50,
      createTime: new Date().toLocaleString()
    })
  }
  return data.sort((a, b) => b.deliveryDate.localeCompare(a.deliveryDate))
}

const allData = ref<HistoryRecord[]>(generateMockData())
const filteredData = ref<HistoryRecord[]>([])
const selectedRows = ref<string[]>([])

// 筛选条件
const filters = ref({
  startDate: '',
  endDate: ''
})

// 大区经理多选
const selectedManagers = ref<string[]>([])
const managerSearchText = ref('')
const managerDropdownVisible = ref(false)
const managerInputRef = ref<HTMLInputElement>()
const allManagerOptions = computed(() => [...new Set(allData.value.map(d => d.regionalManager))])
const filteredManagerOptions = ref<string[]>([])

// 仓库多选
const selectedWarehouses = ref<string[]>([])
const warehouseSearchText = ref('')
const warehouseDropdownVisible = ref(false)
const warehouseInputRef = ref<HTMLInputElement>()
const allWarehouseOptions = computed(() => [...new Set(allData.value.map(d => d.warehouse))])
const filteredWarehouseOptions = ref<string[]>([])

// 品种多选
const selectedVarieties = ref<string[]>([])
const varietySearchText = ref('')
const varietyDropdownVisible = ref(false)
const varietyInputRef = ref<HTMLInputElement>()
const allVarietyOptions = computed(() => [...new Set(allData.value.map(d => d.variety))])
const filteredVarietyOptions = ref<string[]>([])

// 分页
const currentPage = ref(1)
const pageSize = ref(10)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredData.value.length / pageSize.value)))
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

const isAllSelected = computed(() => {
  return paginatedData.value.length > 0 && selectedRows.value.length === paginatedData.value.length
})

// 弹窗相关
const modalVisible = ref(false)
const modalData = ref<HistoryRecord | null>(null)
const modalTitle = ref('')
const modalVarietyData = ref<{ variety: string; weight: number }[]>([])

// ==================== 大区经理逻辑 ====================
const filterManagerOptions = () => {
  const search = managerSearchText.value.toLowerCase()
  if (search) {
    filteredManagerOptions.value = allManagerOptions.value.filter(opt => opt.toLowerCase().includes(search))
  } else {
    filteredManagerOptions.value = [...allManagerOptions.value]
  }
  managerDropdownVisible.value = filteredManagerOptions.value.length > 0
}

const addManager = (item: string) => {
  if (!selectedManagers.value.includes(item)) {
    selectedManagers.value.push(item)
  }
  managerSearchText.value = ''
  filterManagerOptions()
}

const removeManager = (item: string) => {
  selectedManagers.value = selectedManagers.value.filter(i => i !== item)
}

const closeManagerDropdown = () => {
  setTimeout(() => {
    managerDropdownVisible.value = false
  }, 200)
}

const focusManagerInput = () => {
  managerInputRef.value?.focus()
}

// ==================== 仓库逻辑 ====================
const filterWarehouseOptions = () => {
  const search = warehouseSearchText.value.toLowerCase()
  if (search) {
    filteredWarehouseOptions.value = allWarehouseOptions.value.filter(opt => opt.toLowerCase().includes(search))
  } else {
    filteredWarehouseOptions.value = [...allWarehouseOptions.value]
  }
  warehouseDropdownVisible.value = filteredWarehouseOptions.value.length > 0
}

const addWarehouse = (item: string) => {
  if (!selectedWarehouses.value.includes(item)) {
    selectedWarehouses.value.push(item)
  }
  warehouseSearchText.value = ''
  filterWarehouseOptions()
}

const removeWarehouse = (item: string) => {
  selectedWarehouses.value = selectedWarehouses.value.filter(i => i !== item)
}

const closeWarehouseDropdown = () => {
  setTimeout(() => {
    warehouseDropdownVisible.value = false
  }, 200)
}

const focusWarehouseInput = () => {
  warehouseInputRef.value?.focus()
}

// ==================== 品种逻辑 ====================
const filterVarietyOptions = () => {
  const search = varietySearchText.value.toLowerCase()
  if (search) {
    filteredVarietyOptions.value = allVarietyOptions.value.filter(opt => opt.toLowerCase().includes(search))
  } else {
    filteredVarietyOptions.value = [...allVarietyOptions.value]
  }
  varietyDropdownVisible.value = filteredVarietyOptions.value.length > 0
}

const addVariety = (item: string) => {
  if (!selectedVarieties.value.includes(item)) {
    selectedVarieties.value.push(item)
  }
  varietySearchText.value = ''
  filterVarietyOptions()
}

const removeVariety = (item: string) => {
  selectedVarieties.value = selectedVarieties.value.filter(i => i !== item)
}

const closeVarietyDropdown = () => {
  setTimeout(() => {
    varietyDropdownVisible.value = false
  }, 200)
}

const focusVarietyInput = () => {
  varietyInputRef.value?.focus()
}

// ==================== 筛选逻辑 ====================
const applyFilters = () => {
  let data = [...allData.value]
  
  if (filters.value.startDate) {
    data = data.filter(row => row.deliveryDate >= filters.value.startDate)
  }
  if (filters.value.endDate) {
    data = data.filter(row => row.deliveryDate <= filters.value.endDate)
  }
  
  if (selectedManagers.value.length > 0) {
    data = data.filter(row => selectedManagers.value.includes(row.regionalManager))
  }
  
  if (selectedWarehouses.value.length > 0) {
    data = data.filter(row => selectedWarehouses.value.includes(row.warehouse))
  }
  
  if (selectedVarieties.value.length > 0) {
    data = data.filter(row => selectedVarieties.value.includes(row.variety))
  }
  
  data = data.sort((a, b) => b.deliveryDate.localeCompare(a.deliveryDate))
  
  filteredData.value = data
  currentPage.value = 1
  selectedRows.value = []
}

const handleQuery = () => {
  applyFilters()
}

const handleReset = () => {
  filters.value = {
    startDate: '',
    endDate: ''
  }
  selectedManagers.value = []
  selectedWarehouses.value = []
  selectedVarieties.value = []
  managerSearchText.value = ''
  warehouseSearchText.value = ''
  varietySearchText.value = ''
  applyFilters()
}

// ==================== 导出当前筛选结果 ====================
const exportFilteredData = () => {
  if (filteredData.value.length === 0) {
    alert('没有可导出的数据')
    return
  }
  
  const headers = ['送货日期', '大区经理', '仓库', '品种', '重量(吨)']
  const rowsData = filteredData.value.map(item => [
    item.deliveryDate,
    item.regionalManager,
    item.warehouse,
    item.variety,
    item.weight
  ])
  
  const csvContent = [headers, ...rowsData].map(row => row.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)
  link.href = URL.createObjectURL(blob)
  link.download = `送货历史数据_${timestamp}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

// ==================== 分页 ====================
const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}

// ==================== 全选/批量删除 ====================
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedRows.value = []
  } else {
    selectedRows.value = paginatedData.value.map(row => row.id)
  }
}

const handleBatchDelete = () => {
  if (selectedRows.value.length === 0) return
  if (confirm(`确认删除选中的${selectedRows.value.length}条记录？此操作不可恢复。`)) {
    allData.value = allData.value.filter(row => !selectedRows.value.includes(row.id))
    applyFilters()
    alert(`成功删除${selectedRows.value.length}条数据`)
  }
}

// ==================== 判断品种是否被筛选选中 ====================
const isVarietySelected = (variety: string): boolean => {
  if (selectedVarieties.value.length === 0) return false
  return selectedVarieties.value.includes(variety)
}

// ==================== 详情弹窗 ====================
const openDetailModal = (row: HistoryRecord) => {
  modalData.value = row
  modalTitle.value = `${row.deliveryDate} - ${row.regionalManager} - ${row.warehouse} 品种明细`
  
  // 获取同日期、同大区经理、同仓库的所有品种数据
  const sameDayData = allData.value.filter(item => 
    item.deliveryDate === row.deliveryDate &&
    item.regionalManager === row.regionalManager &&
    item.warehouse === row.warehouse
  )
  
  // 按品种汇总重量
  const varietyMap = new Map<string, number>()
  sameDayData.forEach(item => {
    const current = varietyMap.get(item.variety) || 0
    varietyMap.set(item.variety, current + item.weight)
  })
  
  modalVarietyData.value = Array.from(varietyMap.entries()).map(([variety, weight]) => ({
    variety,
    weight
  }))
  
  modalVisible.value = true
}

const closeModal = () => {
  modalVisible.value = false
  modalData.value = null
  modalVarietyData.value = []
}

// ==================== 导出弹窗Excel ====================
const exportModalExcel = () => {
  if (modalVarietyData.value.length === 0) {
    alert('没有可导出的数据')
    return
  }
  
  const headers = ['品种', '重量(吨)', '筛选状态']
  const rowsData = modalVarietyData.value.map(item => [
    item.variety,
    item.weight,
    isVarietySelected(item.variety) ? '已选择' : '未选择'
  ])
  
  const csvContent = [headers, ...rowsData].map(row => row.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)
  link.href = URL.createObjectURL(blob)
  link.download = `${modalTitle.value}_${timestamp}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

// ==================== 导入功能 ====================
const downloadTemplate = () => {
  const headers = ['大区经理', '仓库', '送货日期', '品种', '重量']
  const csvContent = headers.join(',') + '\n' + '张建国,北京仓库,2024-01-01,电解铜,100'
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = '送货数据导入模板.csv'
  link.click()
  URL.revokeObjectURL(link.href)
}

const triggerImport = () => {
  fileInput.value?.click()
}

const validateImportData = (data: any[][]): { valid: boolean; errors: string[]; records: any[] } => {
  const errors: string[] = []
  const records: any[] = []
  const headers = ['大区经理', '仓库', '送货日期', '品种', '重量']
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    const rowNum = i + 1
    let rowHasError = false
    
    for (let j = 0; j < headers.length; j++) {
      if (!row[j] || String(row[j]).trim() === '') {
        errors.push(`第${rowNum}行：${headers[j]}不能为空`)
        rowHasError = true
      }
    }
    
    const dateStr = row[2]?.trim()
    if (dateStr) {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        errors.push(`第${rowNum}行：送货日期格式错误（应为YYYY-MM-DD）`)
        rowHasError = true
      }
    }
    
    const weightStr = row[4]?.toString().trim()
    if (weightStr) {
      const weight = Number(weightStr)
      if (isNaN(weight) || weight <= 0) {
        errors.push(`第${rowNum}行：重量必须为正数`)
        rowHasError = true
      }
    }
    
    if (!rowHasError) {
      records.push({
        id: `ID-${String(allData.value.length + records.length + 1).padStart(6, '0')}`,
        deliveryDate: dateStr,
        regionalManager: row[0]?.trim(),
        warehouse: row[1]?.trim(),
        variety: row[3]?.trim(),
        weight: Number(weightStr),
        createTime: new Date().toLocaleString()
      })
    }
  }
  
  return { valid: errors.length === 0, errors, records }
}

const handleImport = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  importLoading.value = true
  importResult.value = { show: false, success: false, message: '', errors: [] }
  
  try {
    const text = await file.text()
    const lines = text.split(/\r?\n/).filter(line => line.trim())
    const data = lines.map(line => line.split(',').map(cell => cell.replace(/^"|"$/g, '').trim()))
    
    const expectedHeaders = ['大区经理', '仓库', '送货日期', '品种', '重量']
    const actualHeaders = data[0]
    const headerValid = expectedHeaders.every((h, idx) => h === actualHeaders?.[idx])
    
    if (!headerValid) {
      importResult.value = {
        show: true,
        success: false,
        message: '导入失败：表头格式不正确，请使用下载的模板',
        errors: [`期望表头：${expectedHeaders.join('、')}，实际表头：${actualHeaders?.join('、') || '空'}`]
      }
      return
    }
    
    const { valid, errors, records } = validateImportData(data)
    
    if (!valid) {
      importResult.value = {
        show: true,
        success: false,
        message: `导入失败：共${errors.length}条数据错误`,
        errors
      }
      return
    }
    
    allData.value = [...records, ...allData.value]
    applyFilters()
    
    importResult.value = {
      show: true,
      success: true,
      message: `导入成功：成功导入${records.length}条记录`,
      errors: []
    }
    
  } catch (error) {
    importResult.value = {
      show: true,
      success: false,
      message: '导入失败：文件解析错误，请检查文件格式',
      errors: ['请确保文件为CSV格式，且内容符合模板要求']
    }
  } finally {
    importLoading.value = false
    input.value = ''
    
    setTimeout(() => {
      if (importResult.value.show) {
        importResult.value.show = false
      }
    }, 5000)
  }
}

onMounted(() => {
  applyFilters()
  filteredManagerOptions.value = [...allManagerOptions.value]
  filteredWarehouseOptions.value = [...allWarehouseOptions.value]
  filteredVarietyOptions.value = [...allVarietyOptions.value]
})
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

/* 内页菜单 */
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

/* 筛选区 */
.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-item label {
  font-size: 12px;
  font-weight: 500;
  color: #606266;
  white-space: nowrap;
}

.date-item {
  min-width: auto;
}

.date-range {
  display: flex;
  gap: 6px;
  align-items: center;
}

.filter-input {
  padding: 6px 10px;
  border: 1px solid #E5E9F2;
  border-radius: 4px;
  font-size: 13px;
  background: white;
}

.date-input {
  width: 120px;
}

.filter-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

/* 多选组件样式 */
.multi-select-item {
  min-width: 200px;
}

.multi-select-container {
  position: relative;
  width: 220px;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border: 1px solid #E5E9F2;
  border-radius: 4px;
  background: white;
  min-height: 32px;
  cursor: text;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background-color: #E8F0F8;
  border-radius: 3px;
  font-size: 12px;
  color: #2c3e50;
}

.tag-remove {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #909399;
  padding: 0 2px;
}

.tag-remove:hover {
  color: #f56c6c;
}

.multi-input {
  flex: 1;
  min-width: 80px;
  border: none;
  outline: none;
  padding: 4px 6px;
  font-size: 13px;
  background: transparent;
}

.multi-input::placeholder {
  color: #c0c4cc;
}

.dropdown-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  background: white;
  border: 1px solid #E5E9F2;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
  margin-top: 2px;
}

.dropdown-item {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #606266;
  text-align: left;
}

.dropdown-item:hover {
  background-color: #F5F7FA;
  color: #4A7A9C;
}

/* 批量删除 */
.batch-card {
  padding: 12px 20px;
}

.batch-bar {
  display: flex;
  justify-content: flex-start;
}

/* 按钮样式 */
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

.btn-sm {
  padding: 4px 12px;
  font-size: 12px;
}

.btn-danger {
  background-color: #f56c6c;
  color: white;
}
.btn-danger:hover:not(:disabled) { background-color: #f78989; }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-view {
  background: none;
  border: 1px solid #4A7A9C;
  color: #4A7A9C;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}
.btn-view:hover {
  background-color: #4A7A9C;
  color: white;
}

/* 表格样式 */
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

/* 分页样式 */
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

/* 导入标签页 */
.action-bar {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.action-left {
  display: flex;
  gap: 12px;
}

.result-card {
  background-color: #F5F7FA;
}

.result-message {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 12px;
  border-radius: 4px;
}

.result-message.success {
  color: #2e7d32;
  background-color: #e8f5e9;
}

.result-message.error {
  color: #c62828;
  background-color: #ffebee;
}

.result-icon {
  font-size: 18px;
  font-weight: bold;
}

.error-list {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #E5E9F2;
}

.error-list p {
  font-size: 13px;
  font-weight: 500;
  color: #c62828;
  margin-bottom: 8px;
}

.error-list ul {
  margin-left: 20px;
  color: #c62828;
  font-size: 12px;
}

.error-list li {
  margin: 4px 0;
}

.placeholder {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-content {
  text-align: center;
  color: #909399;
  font-size: 14px;
}

.placeholder-tip {
  font-size: 12px;
  margin-top: 8px;
  color: #b0b3b8;
}

/* 弹窗样式 */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 600px;
  max-width: 90%;
  max-height: 80%;
  overflow: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #E5E9F2;
}

.modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1F2D3D;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #909399;
}

.close-btn:hover {
  color: #606266;
}

.modal-body {
  padding: 20px;
}

.modal-info {
  background: #F5F7FA;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.modal-info p {
  margin: 0;
  font-size: 13px;
  color: #606266;
}

.modal-info strong {
  color: #1F2D3D;
}

.modal-table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.modal-result-label {
  font-size: 14px;
  font-weight: 600;
  color: #2e7d32;
}

.modal-table {
  width: 100%;
}

/* 弹窗内筛选状态行高亮 */
.row-selected {
  background-color: #e8f5e9 !important;
}

.status-selected {
  color: #2e7d32;
  font-weight: 500;
}

.status-none {
  color: #c0c4cc;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #E5E9F2;
  text-align: right;
}
</style>