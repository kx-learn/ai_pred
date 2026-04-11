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
        <div class="filter-item date-range-item">
          <label>预测日期范围 <span class="date-hint">(最多15天)</span></label>
          <div class="date-range">
            <input type="date" v-model="filters.startDate" class="filter-input" @change="validateDateRange" />
            <span>至</span>
            <input type="date" v-model="filters.endDate" class="filter-input" @change="validateDateRange" />
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
        <div class="chart-legend">
          <span class="legend-tip">👆 点击图例可显示/隐藏对应品种</span>
          <div class="legend-items">
            <div 
              v-for="(series, idx) in chartData.series" 
              :key="series.name"
              class="legend-item"
              @click="toggleSeries(series.name)"
              :title="`点击${series.visible ? '隐藏' : '显示'}${series.name}趋势线`"
            >
              <span 
                class="legend-color" 
                :style="{ backgroundColor: series.visible ? colors[idx % colors.length] : '#ccc' }"
              ></span>
              <span 
                class="legend-name"
                :style="{ textDecoration: series.visible ? 'none' : 'line-through' }"
              >{{ series.name }}</span>
            </div>
          </div>
        </div>
        <div class="chart-wrapper">
          <canvas ref="chartCanvas"></canvas>
        </div>
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

// 类型定义
interface ForecastRecord {
  date: string
  regionalManager: string
  warehouse: string
  variety: string
  predictedWeight: number
}

// 汇总行数据
interface SummaryRow {
  date: string
  regionalManager: string
  warehouse: string
  totalWeight: number
  details: { variety: string; weight: number }[]
}

// 颜色常量
const colors = ['#1F77B4', '#FF7F0E', '#2CA02C', '#D62728', '#9467BD', '#8C564B', '#E377C2', '#7F7F7F']

// 模拟数据
const generateMockForecastData = (): ForecastRecord[] => {
  const managers = ['张建国', '李明华', '王德发']
  const warehouses = ['北京仓库', '上海仓库', '广州仓库']
  const varieties = ['电解铜', '铝锭', '锌锭']
  
  const data: ForecastRecord[] = []
  const today = new Date()
  
  for (let i = 0; i <= 30; i++) {
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
const rows = ref<SummaryRow[]>([])
const chartCanvas = ref<HTMLCanvasElement>()

// 图例开关状态
const seriesVisibility = ref<Map<string, boolean>>(new Map())

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

// 验证日期范围（最多15天）
function validateDateRange() {
  const start = new Date(filters.value.startDate)
  const end = new Date(filters.value.endDate)
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  
  if (days > 14) {
    alert('日期范围最多可选15天（含当天）')
    filters.value.endDate = getFutureDate(14)
  }
  if (start > end) {
    alert('开始日期不能晚于结束日期')
    filters.value.startDate = todayStr
    filters.value.endDate = getFutureDate(14)
  }
}

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
    item.details.forEach(detail => {
      const varietyMap = dateMap.get(item.date)!
      varietyMap.set(detail.variety, (varietyMap.get(detail.variety) || 0) + detail.weight)
    })
  })
  
  const dates = Array.from(dateMap.keys()).sort()
  const allVarieties = ['电解铜', '铝锭', '锌锭']
  
  allVarieties.forEach(variety => {
    if (!seriesVisibility.value.has(variety)) {
      seriesVisibility.value.set(variety, true)
    }
  })
  
  const series = allVarieties.map(variety => ({
    name: variety,
    visible: seriesVisibility.value.get(variety) ?? true,
    data: dates.map(date => dateMap.get(date)?.get(variety) || 0)
  }))
  
  return { dates, series }
})

// 汇总数据
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
  try {
    const { startDate, endDate, regionalManager, warehouse } = filters.value
    
    const filtered = ALL_FORECAST_DATA.filter((r) => {
      if (regionalManager && !r.regionalManager.includes(regionalManager)) return false
      if (warehouse && !r.warehouse.includes(warehouse)) return false
      if (startDate && r.date < startDate) return false
      if (endDate && r.date > endDate) return false
      return true
    })
    
    rows.value = aggregateData(filtered)
    // 等待 DOM 更新后绘制图表
    setTimeout(() => drawChart(), 50)
  } catch (error) {
    console.error('查询失败', error)
    rows.value = []
  } finally {
    tableLoading.value = false
  }
}

// 图例开关
function toggleSeries(seriesName: string) {
  const current = seriesVisibility.value.get(seriesName) ?? true
  seriesVisibility.value.set(seriesName, !current)
  drawChart()
}

// 绘制图表（动态 X 轴，根据日期数量自动调整）
function drawChart() {
  if (!chartCanvas.value) return
  
  const ctx = chartCanvas.value.getContext('2d')
  if (!ctx) return
  
  const { dates, series } = chartData.value
  if (dates.length === 0) return
  
  // 获取容器实际宽度
  const container = chartCanvas.value.parentElement
  const containerWidth = container?.clientWidth || 800
  const width = Math.max(containerWidth, 600)  // 最小600px，根据内容自动扩展
  const height = 400
  
  chartCanvas.value.width = width
  chartCanvas.value.height = height
  
  // 计算可见系列的最大值
  let maxValue = 0
  series.forEach(s => {
    if (s.visible) {
      const max = Math.max(...s.data)
      maxValue = Math.max(maxValue, max)
    }
  })
  maxValue = Math.ceil(maxValue * 1.1) || 100
  
  const margin = { top: 20, right: 80, bottom: 50, left: 60 }
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
  
  // X轴 - 动态计算步长和标签间距
  const xStep = dates.length > 1 ? chartWidth / (dates.length - 1) : chartWidth
  // 根据日期数量动态调整标签显示密度
  const maxLabels = Math.floor(chartWidth / 70)  // 每70px显示一个标签
  const labelStep = Math.max(1, Math.ceil(dates.length / maxLabels))
  
  dates.forEach((date, i) => {
    const x = i * xStep
    // 绘制垂直网格线
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, chartHeight)
    ctx.strokeStyle = '#f0f0f0'
    ctx.stroke()
    
    // 只显示部分标签，避免重叠
    if (i % labelStep === 0 || i === dates.length - 1) {
      ctx.fillStyle = '#666'
      ctx.font = '11px Arial'
      const dateLabel = date.slice(5)  // 只显示 MM-DD
      ctx.fillText(dateLabel, x - 20, chartHeight + 20)
    }
  })
  
  // 绘制折线
  series.forEach((s, idx) => {
    if (!s.visible) return
    
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
    
    // 数据点
    s.data.forEach((value, i) => {
      const x = i * xStep
      const y = chartHeight - (value / maxValue) * chartHeight
      ctx.beginPath()
      ctx.fillStyle = color
      ctx.arc(x, y, 3, 0, 2 * Math.PI)
      ctx.fill()
    })
  })
  
  // Y轴标签
  ctx.save()
  ctx.translate(-40, chartHeight / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillStyle = '#666'
  ctx.font = '12px Arial'
  ctx.fillText('重量(吨)', -20, 5)
  ctx.restore()
  
  // X轴标签
  ctx.fillStyle = '#666'
  ctx.font = '12px Arial'
  ctx.fillText('日期', chartWidth / 2 - 20, chartHeight + 40)
  
  ctx.restore()
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

// 监听 rows 变化重新绘制图表
watch(() => rows.value, () => {
  setTimeout(drawChart, 50)
}, { deep: true })

// 监听窗口大小变化
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
  min-width: 160px;
}

.filter-item label {
  font-size: 13px;
  font-weight: 500;
  color: #606266;
  white-space: nowrap;
}

.date-range-item {
  min-width: 280px;
}

.date-hint {
  font-size: 11px;
  color: #909399;
  font-weight: normal;
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

.filter-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
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

.btn-sm { padding: 4px 12px; font-size: 12px; }
.btn-view { background: none; border: 1px solid #4A7A9C; color: #4A7A9C; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
.btn-view:hover { background-color: #4A7A9C; color: white; }

.section-title { font-size: 15px; font-weight: 600; color: #1F2D3D; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #E5E9F2; }

.chart-container { min-height: 450px; }
.chart-wrapper { width: 100%; overflow-x: auto; }
.chart-wrapper canvas { min-width: 600px; width: 100%; height: auto; }

.chart-legend { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  flex-wrap: wrap;
  margin-bottom: 16px; 
  padding-bottom: 12px; 
  border-bottom: 1px solid #E5E9F2;
}

.legend-tip {
  font-size: 12px;
  color: #909399;
  background: #F5F7FA;
  padding: 4px 12px;
  border-radius: 16px;
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}
.legend-item:hover { background-color: #F5F7FA; }

.legend-color { width: 16px; height: 16px; border-radius: 3px; }
.legend-name { color: #333; }

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