<template>
  <div class="forecast-page">
    <!-- 筛选区 -->
    <div class="card">
      <div class="filter-row">
        <div class="filter-item">
          <label>大区经理</label>
          <input v-model="filters.regionalManager" class="filter-input" placeholder="输入大区经理" />
        </div>
        <div class="filter-item">
          <label>仓库</label>
          <input v-model="filters.warehouse" class="filter-input" placeholder="输入仓库" />
        </div>
        <div class="filter-item">
          <label>预测日期范围</label>
          <div class="date-range">
            <input type="date" v-model="filters.startDate" class="filter-input" />
            <span>至</span>
            <input type="date" v-model="filters.endDate" class="filter-input" />
          </div>
        </div>
        <div class="filter-actions">
          <button class="btn btn-primary" @click="handleQuery" :disabled="tableLoading">
            {{ tableLoading ? '加载中...' : '查询' }}
          </button>
          <button class="btn btn-secondary" @click="handleReset">重置</button>
        </div>
      </div>
    </div>

    <!-- 图表区 -->
    <div class="card">
      <div class="section-title">未来送货量预测趋势</div>
      <div class="chart-container" v-if="!tableLoading && chartData.dates.length > 0">
        <canvas ref="chartCanvas"></canvas>
      </div>
      <div v-else-if="tableLoading" class="loading-placeholder">加载中...</div>
      <div v-else class="loading-placeholder">暂无数据</div>
    </div>

    <!-- 明细数据区 -->
    <div class="card">
      <div class="table-header">
        <div class="section-title">预测明细数据</div>
        <button class="btn btn-secondary" @click="exportExcel" :disabled="tableLoading">导出Excel</button>
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>预测日期</th>
              <th>大区经理</th>
              <th>仓库</th>
              <th>预测重量(吨)</th>
              <th width="80">查看</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in paginatedData" :key="`${row.date}-${row.warehouse}`">
              <td>{{ row.date }}</td>
              <td>{{ row.regionalManager }}</td>
              <td>{{ row.warehouse }}</td>
              <td>{{ row.totalWeight }}</td>
              <td>
                <button class="btn-view" @click="openDetailModal(row)">查看</button>
              </td>
            </tr>
            <tr v-if="paginatedData.length === 0">
              <td :colspan="5" class="empty-data">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
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

    <!-- 品种明细弹窗 -->
    <div v-if="modalVisible" class="modal" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ modalTitle }}</h3>
          <button class="close-btn" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="modal-table-header">
            <span class="modal-result-label">品种明细</span>
            <button class="btn btn-secondary btn-sm" @click="exportModalExcel">导出Excel</button>
          </div>
          <div class="table-wrapper">
            <table class="data-table modal-table">
              <thead>
                <tr>
                  <th>品种</th>
                  <th>预测重量(吨)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in modalPaginatedData" :key="item.variety">
                  <td>{{ item.variety }}</td>
                  <td>{{ item.weight }}</td>
                </tr>
                <tr v-if="modalPaginatedData.length === 0">
                  <td :colspan="2" class="empty-data">暂无数据</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 弹窗分页 -->
          <div class="pagination modal-pagination">
            <button @click="modalCurrentPage--" :disabled="modalCurrentPage === 1">上一页</button>
            <span>第 {{ modalCurrentPage }} / {{ modalTotalPages }} 页</span>
            <button @click="modalCurrentPage++" :disabled="modalCurrentPage === modalTotalPages">下一页</button>
            <select v-model="modalPageSize" @change="modalCurrentPage = 1">
              <option :value="5">5条/页</option>
              <option :value="10">10条/页</option>
              <option :value="20">20条/页</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

// 类型定义
interface ForecastRecord {
  date: string
  regionalManager: string
  warehouse: string
  variety: string
  predictedWeight: number
}

// 汇总行数据（按日期+大区经理+仓库）
interface SummaryRow {
  date: string
  regionalManager: string
  warehouse: string
  totalWeight: number
  details: { variety: string; weight: number }[]
}

// 模拟数据（完全参考原有风格）
const generateMockForecastData = (): ForecastRecord[] => {
  const managers = ['张建国', '李明华', '王德发']
  const warehouses = ['北京仓库', '上海仓库', '广州仓库']
  const varieties = ['电解铜', '铝锭', '锌锭']
  
  const data: ForecastRecord[] = []
  const today = new Date()
  
  // 生成未来15天的预测数据
  for (let i = 0; i <= 14; i++) {
    const date = new Date()
    date.setDate(today.getDate() + i)
    const dateStr = date.toISOString().slice(0, 10)
    
    for (const manager of managers) {
      for (const warehouse of warehouses) {
        for (const variety of varieties) {
          data.push({
            date: dateStr,
            regionalManager: manager,
            warehouse: warehouse,
            variety: variety,
            predictedWeight: Math.floor(Math.random() * 300) + 50
          })
        }
      }
    }
  }
  
  return data.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    if (a.regionalManager !== b.regionalManager) return a.regionalManager.localeCompare(b.regionalManager)
    if (a.warehouse !== b.warehouse) return a.warehouse.localeCompare(b.warehouse)
    return a.variety.localeCompare(b.variety)
  })
}

const ALL_FORECAST_DATA = generateMockForecastData()

// 状态
const tableLoading = ref(false)
const errorMessage = ref('')
const rows = ref<SummaryRow[]>([])
const chartCanvas = ref<HTMLCanvasElement>()

// 筛选条件
const todayStr = new Date().toISOString().slice(0, 10)
const getFutureDate = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const filters = ref({
  regionalManager: '',
  warehouse: '',
  startDate: todayStr,
  endDate: getFutureDate(14)
})

// 分页
const currentPage = ref(1)
const pageSize = ref(10)
const totalPages = computed(() => Math.max(1, Math.ceil(rows.value.length / pageSize.value)))
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return rows.value.slice(start, start + pageSize.value)
})

// 弹窗相关
const modalVisible = ref(false)
const modalTitle = ref('')
const modalDetails = ref<{ variety: string; weight: number }[]>([])
const modalCurrentPage = ref(1)
const modalPageSize = ref(5)
const modalTotalPages = computed(() => Math.max(1, Math.ceil(modalDetails.value.length / modalPageSize.value)))
const modalPaginatedData = computed(() => {
  const start = (modalCurrentPage.value - 1) * modalPageSize.value
  return modalDetails.value.slice(start, start + modalPageSize.value)
})

// 图表数据
const chartData = computed(() => {
  const dateMap = new Map<string, Map<string, number>>()
  
  rows.value.forEach(item => {
    if (!dateMap.has(item.date)) {
      dateMap.set(item.date, new Map())
    }
    // 按品种汇总用于图表
    item.details.forEach(detail => {
      const varietyMap = dateMap.get(item.date)!
      varietyMap.set(detail.variety, (varietyMap.get(detail.variety) || 0) + detail.weight)
    })
  })
  
  const dates = Array.from(dateMap.keys()).sort()
  const varieties = ['电解铜', '铝锭', '锌锭']
  const series = varieties.map(variety => ({
    name: variety,
    data: dates.map(date => dateMap.get(date)?.get(variety) || 0)
  }))
  
  return { dates, varieties, series }
})

// 汇总数据（按日期+大区经理+仓库）
const aggregateData = (data: ForecastRecord[]): SummaryRow[] => {
  const map = new Map<string, SummaryRow>()
  
  data.forEach(item => {
    const key = `${item.date}|${item.regionalManager}|${item.warehouse}`
    if (!map.has(key)) {
      map.set(key, {
        date: item.date,
        regionalManager: item.regionalManager,
        warehouse: item.warehouse,
        totalWeight: 0,
        details: []
      })
    }
    const row = map.get(key)!
    row.totalWeight += item.predictedWeight
    row.details.push({
      variety: item.variety,
      weight: item.predictedWeight
    })
  })
  
  return Array.from(map.values()).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    if (a.regionalManager !== b.regionalManager) return a.regionalManager.localeCompare(b.regionalManager)
    return a.warehouse.localeCompare(b.warehouse)
  })
}

// 查询预测数据
async function queryForecastData() {
  tableLoading.value = true
  errorMessage.value = ''
  try {
    await Promise.resolve()
    const { startDate, endDate, regionalManager, warehouse } = filters.value
    
    const filtered = ALL_FORECAST_DATA.filter((r) => {
      if (regionalManager && !r.regionalManager.includes(regionalManager)) return false
      if (warehouse && !r.warehouse.includes(warehouse)) return false
      if (startDate && r.date < startDate) return false
      if (endDate && r.date > endDate) return false
      return true
    })
    
    rows.value = aggregateData(filtered)
    setTimeout(() => drawChart(), 100)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '查询失败'
    rows.value = []
  } finally {
    tableLoading.value = false
  }
}

function handleQuery() {
  currentPage.value = 1
  queryForecastData()
}

function handleReset() {
  filters.value = {
    regionalManager: '',
    warehouse: '',
    startDate: todayStr,
    endDate: getFutureDate(14)
  }
  queryForecastData()
}

function prevPage() { if (currentPage.value > 1) currentPage.value-- }
function nextPage() { if (currentPage.value < totalPages.value) currentPage.value++ }

// 打开详情弹窗
function openDetailModal(row: SummaryRow) {
  modalTitle.value = `${row.date} - ${row.regionalManager} - ${row.warehouse} 品种明细`
  modalDetails.value = [...row.details]
  modalCurrentPage.value = 1
  modalVisible.value = true
}

function closeModal() {
  modalVisible.value = false
  modalDetails.value = []
}

// 导出主表格Excel
function exportExcel() {
  const headers = ['预测日期', '大区经理', '仓库', '预测重量(吨)']
  const rowsData = rows.value.map(item => [
    item.date,
    item.regionalManager,
    item.warehouse,
    item.totalWeight
  ])
  
  const csvContent = [headers, ...rowsData].map(row => row.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)
  link.href = URL.createObjectURL(blob)
  link.download = `送货量预测_${timestamp}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

// 导出弹窗Excel
function exportModalExcel() {
  const headers = ['品种', '预测重量(吨)']
  const rowsData = modalDetails.value.map(item => [
    item.variety,
    item.weight
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

// 绘制图表
function drawChart() {
  if (!chartCanvas.value) return
  
  const ctx = chartCanvas.value.getContext('2d')
  if (!ctx) return
  
  const { dates, series } = chartData.value
  if (dates.length === 0) return
  
  const width = chartCanvas.value.clientWidth
  const height = 400
  chartCanvas.value.width = width
  chartCanvas.value.height = height
  
  let maxValue = 0
  series.forEach(s => {
    const max = Math.max(...s.data)
    maxValue = Math.max(maxValue, max)
  })
  maxValue = Math.ceil(maxValue * 1.1)
  
  const margin = { top: 20, right: 80, bottom: 40, left: 60 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom
  
  ctx.clearRect(0, 0, width, height)
  ctx.save()
  ctx.translate(margin.left, margin.top)
  
  // 坐标轴
  ctx.beginPath()
  ctx.strokeStyle = '#ccc'
  ctx.moveTo(0, 0)
  ctx.lineTo(0, chartHeight)
  ctx.lineTo(chartWidth, chartHeight)
  ctx.stroke()
  
  // Y轴刻度
  const ySteps = 5
  for (let i = 0; i <= ySteps; i++) {
    const y = chartHeight - (i / ySteps) * chartHeight
    const value = (i / ySteps) * maxValue
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(chartWidth, y)
    ctx.strokeStyle = '#eee'
    ctx.stroke()
    ctx.fillStyle = '#666'
    ctx.font = '11px Arial'
    ctx.fillText(Math.round(value).toString(), -35, y + 3)
  }
  
  // X轴刻度
  const xStep = dates.length > 1 ? chartWidth / (dates.length - 1) : chartWidth
  dates.forEach((date, i) => {
    const x = i * xStep
    ctx.fillStyle = '#666'
    ctx.font = '11px Arial'
    ctx.fillText(date.slice(5), x - 15, chartHeight + 18)
  })
  
  const colors = ['#1F77B4', '#FF7F0E', '#2CA02C', '#D62728', '#9467BD']
  
  series.forEach((s, idx) => {
    const color = colors[idx % colors.length]
    ctx.beginPath()
    
    let first = true
    s.data.forEach((value, i) => {
      const x = i * xStep
      const y = chartHeight - (value / maxValue) * chartHeight
      if (first) {
        ctx.moveTo(x, y)
        first = false
      } else {
        ctx.lineTo(x, y)
      }
    })
    
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.stroke()
    
    s.data.forEach((value, i) => {
      const x = i * xStep
      const y = chartHeight - (value / maxValue) * chartHeight
      ctx.beginPath()
      ctx.fillStyle = color
      ctx.arc(x, y, 3, 0, 2 * Math.PI)
      ctx.fill()
    })
  })
  
  // 图例
  let legendX = chartWidth + 10
  let legendY = 10
  series.forEach((s, idx) => {
    ctx.fillStyle = colors[idx % colors.length]
    ctx.fillRect(legendX, legendY, 12, 12)
    ctx.fillStyle = '#333'
    ctx.font = '12px Arial'
    ctx.fillText(s.name, legendX + 18, legendY + 10)
    legendY += 20
  })
  
  // 标签
  ctx.save()
  ctx.translate(-40, chartHeight / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillStyle = '#666'
  ctx.font = '12px Arial'
  ctx.fillText('重量(吨)', -20, 5)
  ctx.restore()
  
  ctx.fillStyle = '#666'
  ctx.font = '12px Arial'
  ctx.fillText('日期', chartWidth / 2 - 20, chartHeight + 35)
  
  ctx.restore()
}

const handleResize = () => {
  setTimeout(drawChart, 100)
}

onMounted(() => {
  queryForecastData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.forecast-page { width: 100%; }
.card { background: white; border-radius: 8px; padding: 16px 20px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); }
.filter-row { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; }
.filter-item { display: flex; flex-direction: column; gap: 6px; min-width: 160px; }
.filter-item label { font-size: 13px; font-weight: 500; color: #606266; }
.date-range { display: flex; gap: 8px; align-items: center; }
.filter-input { padding: 6px 10px; border: 1px solid #E5E9F2; border-radius: 4px; font-size: 13px; width: 130px; }
.filter-actions { display: flex; gap: 10px; }
.btn { padding: 6px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s; }
.btn-primary { background-color: #4A7A9C; color: white; }
.btn-primary:hover { background-color: #5a8aac; }
.btn-secondary { background-color: #F5F7FA; color: #606266; border: 1px solid #E5E9F2; }
.btn-secondary:hover { background-color: #E5E9F2; }
.btn-sm { padding: 4px 12px; font-size: 12px; }
.btn-view { background: none; border: 1px solid #4A7A9C; color: #4A7A9C; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
.btn-view:hover { background-color: #4A7A9C; color: white; }
.section-title { font-size: 15px; font-weight: 600; color: #1F2D3D; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #E5E9F2; }
.chart-container { min-height: 400px; }
.loading-placeholder { min-height: 400px; display: flex; align-items: center; justify-content: center; color: #909399; }
.table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.table-wrapper { overflow-x: auto; border: 1px solid #E5E9F2; border-radius: 4px; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th, .data-table td { padding: 10px 12px; text-align: center; border-bottom: 1px solid #E5E9F2; white-space: nowrap; }
.data-table th { background-color: #E8F0F8; font-weight: 600; color: #2c3e50; }
.data-table tbody tr:hover { background-color: #F5F7FA; }
.empty-data { text-align: center; padding: 40px; color: #909399; }
.pagination { display: flex; justify-content: flex-end; align-items: center; gap: 12px; margin-top: 16px; }
.pagination button { padding: 4px 12px; border: 1px solid #E5E9F2; background: white; border-radius: 4px; cursor: pointer; }
.pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
.pagination select { padding: 4px 8px; border: 1px solid #E5E9F2; border-radius: 4px; }

/* 弹窗样式 */
.modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.modal-content { background: white; border-radius: 8px; width: 600px; max-width: 90%; max-height: 80%; overflow: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #E5E9F2; }
.modal-header h3 { font-size: 16px; font-weight: 600; color: #1F2D3D; margin: 0; }
.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #909399; }
.close-btn:hover { color: #606266; }
.modal-body { padding: 20px; }
.modal-table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.modal-result-label { font-size: 14px; font-weight: 600; color: #2e7d32; }
.modal-table { width: 100%; }
.modal-pagination { margin-top: 16px; }
.modal-footer { padding: 16px 20px; border-top: 1px solid #E5E9F2; text-align: right; }
</style>