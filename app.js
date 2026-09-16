// ===========================================
// ⚠️ แก้ 2 บรรทัดนี้ก่อนอัปโหลด!
// ===========================================
const SUPABASE_URL = 'https://gzorqanbqwcnvohfywog.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6b3JxYW5icXdjbnZvaGZ5d29nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1MjgzNjcsImV4cCI6MjEwNTEwNDM2N30.NyQAg9LhgCXHKf-ddYjCUkHFQ94Tw8j3JA9bdpxgs7I';
// ===========================================

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===========================================
// UTILITIES
// ===========================================
const fmt = n => new Intl.NumberFormat('th-TH', {
  style: 'currency', currency: 'THB', maximumFractionDigits: 0
}).format(n);

function startOf(unit, baseDate = new Date()) {
  const d = new Date(baseDate);
  if (unit === 'day')   d.setHours(0,0,0,0);
  if (unit === 'week')  { d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); }
  if (unit === 'month') { d.setDate(1); d.setHours(0,0,0,0); }
  if (unit === 'year')  { d.setMonth(0,1); d.setHours(0,0,0,0); }
  return d.toISOString().slice(0,10);
}

function endOf(unit, baseDate = new Date()) {
  const d = new Date(baseDate);
  if (unit === 'day')   d.setHours(23,59,59,999);
  if (unit === 'week')  { d.setDate(d.getDate() + (6 - d.getDay())); d.setHours(23,59,59,999); }
  if (unit === 'month') { d.setMonth(d.getMonth() + 1, 0); d.setHours(23,59,59,999); }
  if (unit === 'year')  { d.setMonth(11, 31); d.setHours(23,59,59,999); }
  return d.toISOString().slice(0,10);
}

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const t = document.createElement('div');
  t.textContent = msg;
  t.className = 'toast';
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity 0.3s, transform 0.3s';
    t.style.opacity = '0';
    t.style.transform = 'translate(-50%, -20px)';
    setTimeout(() => t.remove(), 300);
  }, 1600);
}

// Skeleton Loaders
function skeletonSummary() {
  return `
    <div class="loading-state">
      <div class="skeleton skeleton-summary"></div>
      <div class="skeleton skeleton-summary"></div>
      <div class="skeleton skeleton-summary"></div>
      <div class="skeleton skeleton-summary"></div>
    </div>
  `;
}

function skeletonCharts() {
  return `
    <div class="grid-2" style="margin-bottom:16px">
      <div class="skeleton skeleton-chart"></div>
      <div class="skeleton skeleton-chart"></div>
    </div>
  `;
}

function skeletonList() {
  return `
    ${[...Array(3)].map(() => `
      <div style="margin-bottom:12px">
        <div class="skeleton" style="height:20px;width:200px;margin-bottom:8px"></div>
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-card"></div>
      </div>
    `).join('')}
  `;
}

function skeletonForm() {
  return `
    <div style="max-width:520px;margin:0 auto">
      <div class="skeleton" style="height:32px;width:200px;margin-bottom:20px"></div>
      <div class="skeleton" style="height:400px;border-radius:20px"></div>
    </div>
  `;
}

// ===========================================
// STATE
// ===========================================
let currentMonth = new Date().toISOString().slice(0,7);

let listState = {
  range: '7',
  dateFrom: null,
  dateTo: null,
  categoryId: null
};

const CATEGORY_CLASS = {
  'ค่ากาแฟ': 'coffee',
  'ค่าอาหาร': 'food',
  'อาหาร': 'food',
  'ค่าเครื่องดื่ม': 'drink',
  'เครื่องดื่ม': 'drink',
  'ค่าหวย': 'lotto',
  'หวย': 'lotto',
  'ค่าเหวย': 'lotto',
  'ค่าช้อปปิ้ง': 'shop',
  'ค่ายานพาหนะ': 'travel',
  'ค่าน้ำมันรถ': 'oil',
  'ค่ายารักษาโรค': 'med',
  'ค่าของใช้ส่วนตัว': 'personal',
  'ค่าของใช้จำเป็น': 'need',
  'ค่าซื้อของใช้ที่จำเป็น': 'need',
  'ของใช้ในบ้าน': 'need',
  'ค่าอื่นๆ': 'other',
  'อื่นๆ': 'other',
  'กาแฟ': 'coffee'
};

// ===========================================
// ROUTER
// ===========================================
function getRoute() {
  return location.hash.replace('#/', '').replace('#', '') || 'dashboard';
}

function setActiveNav(route) {
  document.querySelectorAll('.nav-link, .bottom-link').forEach(a => {
    a.classList.toggle('active', a.dataset.route === route);
  });
}

async function router() {
  const route = getRoute();
  setActiveNav(route);
  const app = document.getElementById('app');

  if (route === 'list') {
    await renderList(app);
  } else if (route === 'add') {
    await renderAdd(app);
  } else if (route === 'settings') {
    await renderSettings(app);
  } else {
    await renderDashboard(app);
  }
}

window.addEventListener('hashchange', router);
window.addEventListener('load', router);

// ===========================================
// DASHBOARD
// ===========================================
async function renderDashboard(root) {
  // แสดง Skeleton ระหว่างโหลด
  root.innerHTML = skeletonSummary() + skeletonCharts() +
    '<div class="skeleton skeleton-chart" style="margin-bottom:16px"></div>' +
    '<div class="skeleton skeleton-chart"></div>';

  const monthStart = currentMonth + '-01';
  const monthDate = new Date(monthStart);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
    .toISOString().slice(0,10);

  const [expRes, budRes, catRes] = await Promise.all([
    db.from('expenses')
      .select('*, categories(name,icon), payment_methods(name,icon)')
      .gte('expense_date', monthStart)
      .lte('expense_date', monthEnd)
      .order('expense_date', { ascending: false }),
    db.from('monthly_budgets').select('*').eq('year_month', currentMonth),
    db.from('categories').select('*')
  ]);

  const expenses = expRes.data || [];
  const budgets = budRes.data || [];
  const categories = catRes.data || [];

  const now = new Date();
  const isCurrentMonth = currentMonth === now.toISOString().slice(0,7);

  const sum = arr => arr.reduce((s,e) => s + Number(e.amount), 0);

  // วันนี้
  const todayStr = now.toISOString().slice(0,10);
  const totalDay = sum(expenses.filter(e => e.expense_date === todayStr));

  // เมื่อวาน
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0,10);
  const totalYesterday = sum(expenses.filter(e => e.expense_date === yesterdayStr));

  // สัปดาห์นี้
  const weekStart = startOf('week');
  const weekEnd = endOf('week');
  const totalWeek = sum(expenses.filter(e => e.expense_date >= weekStart && e.expense_date <= weekEnd));

  // สัปดาห์ก่อน
  const prevWeekStart = new Date(now);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekStartStr = startOf('week', prevWeekStart);
  const prevWeekEndStr = endOf('week', prevWeekStart);
  const totalPrevWeek = sum(expenses.filter(e =>
    e.expense_date >= prevWeekStartStr && e.expense_date <= prevWeekEndStr
  ));

  // เดือนนี้
  const totalMonth = sum(expenses);

  // เดือนก่อน
  const prevMonthDate = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);
  const prevMonthStr = prevMonthDate.toISOString().slice(0,7);
  const prevMonthStart = prevMonthStr + '-01';
  const prevMonthEnd = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0)
    .toISOString().slice(0,10);

  const { data: prevMonthExp } = await db
    .from('expenses')
    .select('amount')
    .gte('expense_date', prevMonthStart)
    .lte('expense_date', prevMonthEnd);

  const totalPrevMonth = sum(prevMonthExp || []);
  const hasPrevMonthData = prevMonthExp && prevMonthExp.length > 0;

  // เฉลี่ย/วัน
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const daysPassed = isCurrentMonth ? now.getDate() : daysInMonth;
  const avgPerDay = daysPassed > 0 ? totalMonth / daysPassed : 0;
  const forecast = avgPerDay * daysInMonth;

  // เทียบ %
  function calcChange(current, prev) {
    if (prev === 0 && current === 0) return { pct: 0, type: 'flat' };
    if (prev === 0 && current > 0) return { pct: 100, type: 'new' };
    const change = ((current - prev) / prev) * 100;
    return {
      pct: Math.abs(change),
      type: change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
    };
  }

  const dayChange = calcChange(totalDay, totalYesterday);
  const weekChange = calcChange(totalWeek, totalPrevWeek);
  const monthChange = calcChange(totalMonth, totalPrevMonth);
  const monthProgressPct = forecast > 0 ? Math.min(100, (totalMonth / forecast) * 100) : 0;

  const monthLabel = monthDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

  root.innerHTML = `
    <div class="month-selector">
      <div class="month-selector-label">
        <span class="icon">🗓️</span>
        <span>ดูเดือน:</span>
      </div>
      <div class="month-selector-input">
        <input type="month" id="monthPicker" value="${currentMonth}" />
      </div>
      ${!isCurrentMonth ? `
        <button class="btn-current" id="btnCurrent">
          <span>📍</span> ปัจจุบัน
        </button>
      ` : ''}
    </div>

    <div class="summary-grid">
      <div class="summary-card-new pink">
        <div class="card-label"><span class="icon">📆</span> วันนี้</div>
        <div class="card-amount">${totalDay.toLocaleString()}<span class="unit">บาท</span></div>
        <div class="card-compare ${dayChange.type}">
          ${dayChange.type === 'up' ? '▲' : dayChange.type === 'down' ? '▼' : '•'}
          ${dayChange.type === 'new' ? 'ใหม่' : dayChange.pct.toFixed(1) + '%'}
        </div>
        <div class="card-prev">เมื่อวาน: ฿${totalYesterday.toLocaleString()}</div>
      </div>

      <div class="summary-card-new green">
        <div class="card-label"><span class="icon">🗓️</span> สัปดาห์นี้</div>
        <div class="card-amount">${totalWeek.toLocaleString()}<span class="unit">บาท</span></div>
        <div class="card-compare ${weekChange.type}">
          ${weekChange.type === 'up' ? '▲' : weekChange.type === 'down' ? '▼' : '•'}
          ${weekChange.type === 'new' ? 'ใหม่' : weekChange.pct.toFixed(1) + '%'}
        </div>
        <div class="card-prev">สัปดาห์ก่อน: ฿${totalPrevWeek.toLocaleString()}</div>
      </div>

      <div class="summary-card-new blue">
        <div class="card-label"><span class="icon">📅</span> ${isCurrentMonth ? 'เดือนนี้' : monthLabel}</div>
        <div class="card-amount">${totalMonth.toLocaleString()}<span class="unit">บาท</span></div>
        <div class="card-compare ${monthChange.type}">
          ${monthChange.type === 'up' ? '▲' : monthChange.type === 'down' ? '▼' : '•'}
          ${monthChange.type === 'new' ? 'ใหม่' : monthChange.pct.toFixed(1) + '%'}
        </div>
        <div class="card-prev">${hasPrevMonthData ? `เดือนก่อน: ฿${totalPrevMonth.toLocaleString()}` : 'ยังไม่มีข้อมูลเดือนก่อน'}</div>
      </div>

      <div class="summary-card-new yellow">
        <div class="card-label"><span class="icon">📊</span> เฉลี่ย/วัน</div>
        <div class="card-amount">${Math.round(avgPerDay).toLocaleString()}<span class="unit">บาท</span></div>
        <div class="card-forecast">คาดการณ์สิ้นเดือน <strong>~฿${Math.round(forecast).toLocaleString()}</strong></div>
        <div class="card-progress">
          <div class="card-progress-fill" style="width:${monthProgressPct}%"></div>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3>🍩 ค่าใช้จ่ายตามหมวด</h3>
        <div class="chart-container"><canvas id="catChart"></canvas></div>
      </div>
      <div class="card">
        <h3>💳 ประเภทการชำระ</h3>
        <div class="chart-container"><canvas id="payChart"></canvas></div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <h3>📊 เปรียบเทียบ 7 วันล่าสุด</h3>
      <div class="chart-container"><canvas id="weekChart"></canvas></div>
    </div>

    <div class="card">
      <div class="budget-section-title">🎯 สถานะวงเงินคงเหลือแต่ละหมวด</div>
      <div id="budgetsSection"></div>
    </div>
  `;

  // Month Picker
  document.getElementById('monthPicker').addEventListener('change', (e) => {
    currentMonth = e.target.value;
    renderDashboard(root);
  });

  // ปุ่มปัจจุบัน
  const btnCurrent = document.getElementById('btnCurrent');
  if (btnCurrent) {
    btnCurrent.onclick = () => {
      currentMonth = new Date().toISOString().slice(0,7);
      renderDashboard(root);
    };
  }

  // ===========================================
  // Aggregate Data
  // ===========================================
  const byCategory = {};
  expenses.forEach(e => {
    const k = e.categories?.name || 'ไม่ระบุ';
    byCategory[k] = (byCategory[k] || 0) + Number(e.amount);
  });

  const byPayment = {};
  expenses.forEach(e => {
    const k = e.payment_methods?.name || 'ไม่ระบุ';
    byPayment[k] = (byPayment[k] || 0) + Number(e.amount);
  });

  const last7 = [...Array(7)].map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0,10);
    const label = d.toLocaleDateString('th-TH', { weekday: 'short' });
    const total = expenses.filter(e => e.expense_date === key)
                          .reduce((s,e) => s + Number(e.amount), 0);
    return { label, total };
  });

  // ===========================================
  // Charts
  // ===========================================
  const colors = ['#10b981','#ef4444','#f59e0b','#8b5cf6','#ec4899','#3b82f6','#06b6d4','#22c55e','#a78bfa','#14b8a6','#6b7280'];

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 900,
      easing: 'easeOutQuart'
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 12,
          font: { family: 'Sarabun', size: 12 },
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: 12,
        titleFont: { family: 'Sarabun', size: 13, weight: '600' },
        bodyFont: { family: 'Sarabun', size: 13 },
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        cornerRadius: 10,
        displayColors: true,
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ฿${ctx.parsed.toLocaleString()}`
        }
      }
    }
  };

  new Chart(document.getElementById('catChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(byCategory).length ? Object.keys(byCategory) : ['ยังไม่มีข้อมูล'],
      datasets: [{
        data: Object.values(byCategory).length ? Object.values(byCategory) : [1],
        backgroundColor: Object.values(byCategory).length ? colors : ['#e5e7eb'],
        borderWidth: 0,
        hoverOffset: 12
      }]
    },
    options: {
      ...chartDefaults,
      cutout: '62%',
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1000,
        easing: 'easeOutQuart'
      }
    }
  });

  new Chart(document.getElementById('payChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(byPayment).length ? Object.keys(byPayment) : ['ยังไม่มีข้อมูล'],
      datasets: [{
        data: Object.values(byPayment).length ? Object.values(byPayment) : [1],
        backgroundColor: Object.values(byPayment).length ? colors.slice().reverse() : ['#e5e7eb'],
        borderWidth: 0,
        hoverOffset: 12
      }]
    },
    options: {
      ...chartDefaults,
      cutout: '62%',
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1000,
        delay: 200,
        easing: 'easeOutQuart'
      }
    }
  });

  new Chart(document.getElementById('weekChart'), {
    type: 'bar',
    data: {
      labels: last7.map(d => d.label),
      datasets: [{
        data: last7.map(d => d.total),
        backgroundColor: (ctx) => {
          const chart = ctx.chart;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return '#10b981';
          const gradient = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, '#34d399');
          gradient.addColorStop(1, '#059669');
          return gradient;
        },
        borderRadius: 10,
        borderSkipped: false,
        maxBarThickness: 48
      }]
    },
    options: {
      ...chartDefaults,
      plugins: {
        ...chartDefaults.plugins,
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(226, 232, 240, 0.5)', drawBorder: false },
          ticks: {
            callback: v => v.toLocaleString(),
            font: { family: 'Sarabun', size: 11 },
            color: '#94a3b8'
          }
        },
        x: {
          grid: { display: false },
          ticks: {
            font: { family: 'Sarabun', size: 11, weight: '600' },
            color: '#64748b'
          }
        }
      },
      animation: {
        duration: 900,
        easing: 'easeOutQuart',
        delay: 300
      }
    }
  });

  // ===========================================
  // Budget Cards
  // ===========================================
  const budSection = document.getElementById('budgetsSection');

  if (!budgets.length) {
    budSection.innerHTML = '<p class="empty">ยังไม่ได้ตั้งวงเงิน — ไปที่หน้าตั้งค่าเพื่อเพิ่ม</p>';
  } else {
    budSection.innerHTML = `
      <div class="budget-cards-grid">
        ${budgets.map((b, idx) => {
          const cat = categories.find(c => c.id === b.category_id);
          if (!cat) return '';

          const used = byCategory[cat.name] || 0;
          const limit = Number(b.limit_amount);
          const pctUsed = limit > 0 ? (used / limit) * 100 : 0;
          const remain = limit - used;
          const remainPct = Math.max(0, 100 - pctUsed);

          let statusClass = 'ok';
          if (remainPct <= 0) statusClass = 'over';
          else if (remainPct <= 10) statusClass = 'danger';
          else if (remainPct <= 30) statusClass = 'warn';

          const barWidth = Math.min(100, pctUsed);

          const usedFmt = used.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
          const limitFmt = limit.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
          const remainFmt = remain.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});

          return `
            <div class="budget-card ${statusClass}" style="animation-delay:${idx * 0.06}s">
              ${remainPct <= 0 ? '<span class="confetti">🎉</span>' : ''}

              <div class="budget-card-header">
                <div class="budget-card-title">
                  <div class="budget-card-icon">${cat.icon}</div>
                  <div>
                    <div class="budget-card-name" title="${cat.name}">${cat.name}</div>
                    <div class="budget-card-subtitle">คงเหลือ ${remainPct.toFixed(0)}%</div>
                  </div>
                </div>

                <div class="budget-card-actions">
                  <button class="budget-action-btn edit" 
                          data-budget-edit="${cat.id}" 
                          data-budget-amount="${limit}"
                          title="แก้ไขวงเงิน">✏️</button>
                  <button class="budget-action-btn add" 
                          data-budget-add="${cat.id}"
                          title="เพิ่มรายการ">➕</button>
                  <button class="budget-action-btn list" 
                          data-budget-list="${cat.id}"
                          title="ดูรายการ">📋</button>
                </div>
              </div>

              <div class="budget-pct">
                <div class="pct-value">${remainPct.toFixed(1)}%</div>
                <div class="pct-label">คงเหลือ</div>
              </div>

              <div class="budget-stats">
                <div class="stat-box">
                  <div class="stat-label">💸 ใช้ไป</div>
                  <div class="stat-value used">฿${usedFmt}</div>
                </div>
                <div class="stat-box">
                  <div class="stat-label">🎯 วงเงิน</div>
                  <div class="stat-value limit">฿${limitFmt}</div>
                </div>
                <div class="stat-box">
                  <div class="stat-label">🔥 คงเหลือ</div>
                  <div class="stat-value remain ${remain < 0 ? 'negative' : ''}">฿${remainFmt}</div>
                </div>
              </div>

              <div class="budget-card-bar">
                <div class="bar-fill" style="width:${barWidth}%"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    budSection.querySelectorAll('[data-budget-edit]').forEach(btn => {
      btn.onclick = () => {
        const catId = btn.dataset.budgetEdit;
        const currentAmount = parseFloat(btn.dataset.budgetAmount);
        const cat = categories.find(c => c.id === catId);
        openBudgetEditModal(cat, currentAmount, currentMonth, () => renderDashboard(root));
      };
    });

    budSection.querySelectorAll('[data-budget-add]').forEach(btn => {
      btn.onclick = () => {
        sessionStorage.setItem('preselectCategory', btn.dataset.budgetAdd);
        location.hash = '#add';
      };
    });

    budSection.querySelectorAll('[data-budget-list]').forEach(btn => {
      btn.onclick = () => {
        listState.range = '30';
        listState.categoryId = btn.dataset.budgetList;
        listState.dateFrom = null;
        listState.dateTo = null;
        location.hash = '#list';
      };
    });
  }
}

// ===========================================
// LIST PAGE
// ===========================================
function getDateRange() {
  const today = new Date();
  const fmtDate = d => d.toISOString().slice(0,10);

  if (listState.range === 'all') return { from: null, to: null };

  const days = listState.range === '7' ? 7 : 30;
  const from = new Date(today);
  from.setDate(from.getDate() - (days - 1));
  return { from: fmtDate(from), to: fmtDate(today) };
}

function formatThaiDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

async function renderList(root) {
  root.innerHTML = skeletonList();

  const { data: cats } = await db.from('categories').select('*').order('name');
  const categories = cats || [];

  root.innerHTML = `
    <div class="list-page-header">
      <div class="icon-badge">📋</div>
      <h2>รายการทั้งหมด</h2>
    </div>

    <div class="filter-tabs">
      <button class="filter-tab ${listState.range === '7' ? 'active' : ''}" data-range="7">
        <span>📅</span> 7 วันล่าสุด
      </button>
      <button class="filter-tab ${listState.range === '30' ? 'active' : ''}" data-range="30">
        <span>📅</span> 30 วัน
      </button>
      <button class="filter-tab ${listState.range === 'all' ? 'active' : ''}" data-range="all">
        <span>📋</span> ทั้งหมด
      </button>
    </div>

    <div class="filter-form">
      <input type="date" id="dateFrom" />
      <input type="date" id="dateTo" />
      <select id="catFilter">
        <option value="">ทุกหมวดหมู่</option>
        ${categories.map(c => `<option value="${c.id}" ${listState.categoryId === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}
      </select>
      <button class="btn-search" id="btnSearch"><span>🔍</span> ค้นหา</button>
    </div>

    <div id="listContent"></div>

    <a href="#add" class="fab" title="เพิ่มรายการ">+</a>
  `;

  const { from, to } = getDateRange();
  const dateFromEl = document.getElementById('dateFrom');
  const dateToEl = document.getElementById('dateTo');
  if (from) dateFromEl.value = from;
  if (to) dateToEl.value = to;

  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.onclick = () => {
      listState.range = btn.dataset.range;
      listState.dateFrom = null;
      listState.dateTo = null;
      listState.categoryId = null;
      renderList(root);
    };
  });

  document.getElementById('btnSearch').onclick = () => {
    listState.dateFrom = dateFromEl.value || null;
    listState.dateTo = dateToEl.value || null;
    listState.categoryId = document.getElementById('catFilter').value || null;
    listState.range = 'custom';
    loadList();
  };

  await loadList();

  async function loadList() {
    const content = document.getElementById('listContent');
    content.innerHTML = skeletonList();

    let query = db
      .from('expenses')
      .select('*, categories(name,icon), payment_methods(name,icon)')
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false });

    let dFrom = listState.dateFrom;
    let dTo = listState.dateTo;
    if (listState.range === '7' || listState.range === '30') {
      const r = getDateRange();
      dFrom = r.from;
      dTo = r.to;
    }

    if (dFrom) query = query.gte('expense_date', dFrom);
    if (dTo) query = query.lte('expense_date', dTo);
    if (listState.categoryId) query = query.eq('category_id', listState.categoryId);

    const { data, error } = await query;
    if (error) {
      content.innerHTML = `<p class="empty">เกิดข้อผิดพลาด: ${error.message}</p>`;
      return;
    }

    if (!data || data.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <span class="emoji">📭</span>
          <p>ยังไม่มีรายการในช่วงเวลานี้</p>
        </div>
      `;
      return;
    }

    const groups = {};
    data.forEach(e => {
      if (!groups[e.expense_date]) groups[e.expense_date] = [];
      groups[e.expense_date].push(e);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    content.innerHTML = sortedDates.map((date, gIdx) => {
      const items = groups[date];
      const total = items.reduce((s, e) => s + Number(e.amount), 0);

      return `
        <div class="date-group" style="animation-delay:${Math.min(gIdx * 0.05, 0.4)}s">
          <div class="date-group-header">
            <div class="date-label">
              <span>📅</span>
              <span>${formatThaiDate(date)}</span>
            </div>
            <div class="date-total">฿${total.toLocaleString()}</div>
          </div>
          <div class="expense-list">
            ${items.map(e => {
              const catName = e.categories?.name || 'ไม่ระบุ';
              const cls = CATEGORY_CLASS[catName] || 'other';
              const payIcon = e.payment_methods?.icon || '💳';
              const payName = e.payment_methods?.name || '';
              const note = e.note ? ` • ${e.note}` : '';

              return `
                <div class="expense-item" data-id="${e.id}">
                  <div class="cat-icon ${cls}">${e.categories?.icon || '📁'}</div>
                  <div class="body">
                    <div class="cat-name">
                      <span class="emoji">${e.categories?.icon || '📁'}</span>
                      ${catName}
                    </div>
                    <div class="meta">
                      <span>${payIcon}</span>
                      <span>${payName}${note}</span>
                    </div>
                  </div>
                  <div class="right">
                    <div class="amount">฿${Number(e.amount).toLocaleString()}</div>
                    <div class="actions">
                      <button class="action-btn edit" data-edit="${e.id}" title="แก้ไข">✏️</button>
                      <button class="action-btn delete" data-delete="${e.id}" title="ลบ">🗑️</button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    content.querySelectorAll('[data-delete]').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('ลบรายการนี้?')) return;
        const { error } = await db.from('expenses').delete().eq('id', btn.dataset.delete);
        if (error) return alert('ผิดพลาด: ' + error.message);
        showToast('🗑️ ลบเรียบร้อย');
        loadList();
      };
    });

    content.querySelectorAll('[data-edit]').forEach(btn => {
      btn.onclick = () => {
        const item = data.find(x => x.id === btn.dataset.edit);
        if (item) openEditModal(item, categories, loadList);
      };
    });
  }
}

// ===========================================
// EDIT MODAL
// ===========================================
async function openEditModal(expense, categories, onSaved) {
  const { data: pays } = await db.from('payment_methods').select('*').order('name');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>✏️ แก้ไขรายการ</h3>
      <form id="editForm">
        <div class="form-group">
          <label>จำนวนเงิน (บาท)</label>
          <input name="amount" type="number" step="0.01" min="0" required
                 value="${expense.amount}" class="amount-input" />
        </div>

        <div class="form-group">
          <label>หมวดหมู่</label>
          <select name="category_id" required>
            ${categories.map(c => `
              <option value="${c.id}" ${c.id === expense.category_id ? 'selected' : ''}>
                ${c.icon} ${c.name}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>ประเภทการชำระ</label>
          <select name="payment_method_id" required>
            ${(pays || []).map(p => `
              <option value="${p.id}" ${p.id === expense.payment_method_id ? 'selected' : ''}>
                ${p.icon} ${p.name}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>วันที่</label>
          <input name="expense_date" type="date" required value="${expense.expense_date}" />
        </div>

        <div class="form-group">
          <label>โน้ต</label>
          <input name="note" type="text" value="${expense.note || ''}" placeholder="ไม่บังคับ" />
        </div>

        <div class="modal-actions">
          <button type="button" class="cancel" id="modalCancel">ยกเลิก</button>
          <button type="submit" class="save">💾 บันทึก</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#modalCancel').onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.querySelector('#editForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const payload = {
      amount: parseFloat(fd.get('amount')),
      category_id: fd.get('category_id'),
      payment_method_id: fd.get('payment_method_id'),
      expense_date: fd.get('expense_date'),
      note: fd.get('note') || null
    };

    const { error } = await db.from('expenses').update(payload).eq('id', expense.id);
    if (error) return alert('ผิดพลาด: ' + error.message);

    overlay.remove();
    showToast('✅ แก้ไขเรียบร้อย');
    if (onSaved) onSaved();
  });
}

// ===========================================
// BUDGET EDIT MODAL
// ===========================================
async function openBudgetEditModal(category, currentAmount, ym, onSaved) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay budget-edit-modal';

  const [y, m] = ym.split('-');
  const monthLabel = new Date(parseInt(y), parseInt(m) - 1, 1)
    .toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

  overlay.innerHTML = `
    <div class="modal">
      <h3>✏️ แก้ไขวงเงิน</h3>

      <div class="current-info">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
          <span style="font-size:24px;">${category.icon}</span>
          <strong style="font-size:15px; color:#1e293b;">${category.name}</strong>
        </div>
        <div>เดือน: <strong>${monthLabel}</strong></div>
      </div>

      <form id="budgetEditForm">
        <div class="form-group">
          <label>วงเงินใหม่ (บาท)</label>
          <input name="limit" type="number" min="0" step="100" required
                 value="${currentAmount}" class="amount-input" autofocus />
        </div>

        <div class="modal-actions">
          <button type="button" class="cancel" id="budgetEditCancel">ยกเลิก</button>
          <button type="submit" class="save">💾 บันทึก</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#budgetEditCancel').onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.querySelector('#budgetEditForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const newLimit = parseFloat(fd.get('limit'));

    const { error } = await db
      .from('monthly_budgets')
      .update({ limit_amount: newLimit })
      .eq('category_id', category.id)
      .eq('year_month', ym);

    if (error) return alert('ผิดพลาด: ' + error.message);

    overlay.remove();
    showToast('✅ แก้ไขวงเงินเรียบร้อย');
    if (onSaved) onSaved();
  });
}

// ===========================================
// ADD EXPENSE
// ===========================================
async function renderAdd(root) {
  root.innerHTML = skeletonForm();

  const [catRes, payRes] = await Promise.all([
    db.from('categories').select('*').order('name'),
    db.from('payment_methods').select('*').order('name')
  ]);

  const cats = catRes.data || [];
  const pays = payRes.data || [];
  const today = new Date().toISOString().slice(0,10);

  const preselectCat = sessionStorage.getItem('preselectCategory');
  sessionStorage.removeItem('preselectCategory');

  root.innerHTML = `
    <div style="max-width:520px;margin:0 auto">
      <h2>➕ บันทึกค่าใช้จ่าย</h2>
      <form id="expForm" class="card">
        <div class="form-group">
          <label>จำนวนเงิน (บาท)</label>
          <input name="amount" type="number" step="0.01" min="0" required class="amount-input" placeholder="0.00" />
        </div>

        <div class="form-group">
          <label>หมวดหมู่</label>
          <select name="category_id" required>
            <option value="">-- เลือกหมวดหมู่ --</option>
            ${cats.map(c => `<option value="${c.id}" ${preselectCat === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>ประเภทการชำระ</label>
          <div class="payment-grid">
            ${pays.map((p, i) => `
              <label class="payment-option">
                <input type="radio" name="payment_method_id" value="${p.id}" ${i===0?'checked':''} required />
                <div class="payment-box">
                  <span class="icon">${p.icon}</span>
                  ${p.name}
                </div>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label>วันที่</label>
          <input name="expense_date" type="date" value="${today}" required />
        </div>

        <div class="form-group">
          <label>โน้ต (ไม่บังคับ)</label>
          <input name="note" type="text" placeholder="เช่น กาแฟลาเต้" />
        </div>

        <button type="submit" class="btn btn-primary">💾 บันทึก</button>
      </form>

      <div id="recent" style="margin-top:24px"></div>
    </div>
  `;

  const loadRecent = async () => {
    const { data } = await db
      .from('expenses')
      .select('*, categories(name,icon), payment_methods(name,icon)')
      .order('created_at', { ascending: false })
      .limit(5);

    document.getElementById('recent').innerHTML = !data?.length ? '' : `
      <h3 style="font-size:14px;color:#64748b;margin-bottom:10px;font-weight:700">📌 รายการล่าสุด</h3>
      <div class="card" style="padding:10px">
        ${data.map(e => `
          <div class="list-item">
            <span class="icon">${e.categories?.icon || '📁'}</span>
            <div class="info">
              <div class="name">${e.categories?.name || '-'}</div>
              <div class="meta">${e.expense_date} · ${e.payment_methods?.icon || ''} ${e.payment_methods?.name || ''}</div>
            </div>
            <div style="font-weight:700;color:#dc2626">-฿${Number(e.amount).toLocaleString()}</div>
          </div>
        `).join('')}
      </div>
    `;
  };
  loadRecent();

  document.getElementById('expForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const payload = {
      amount: parseFloat(fd.get('amount')),
      category_id: fd.get('category_id'),
      payment_method_id: fd.get('payment_method_id'),
      expense_date: fd.get('expense_date'),
      note: fd.get('note') || null
    };

    const btn = ev.target.querySelector('button[type=submit]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="loading-spinner"></span> กำลังบันทึก...';
    btn.disabled = true;

    const { error } = await db.from('expenses').insert(payload);

    if (error) {
      btn.innerHTML = originalText;
      btn.disabled = false;
      return alert('ผิดพลาด: ' + error.message);
    }

    ev.target.reset();
    document.querySelector('[name=expense_date]').value = today;
    await loadRecent();
    showToast('✅ บันทึกสำเร็จ!');

    btn.innerHTML = originalText;
    btn.disabled = false;
  });
}

// ===========================================
// SETTINGS
// ===========================================
async function renderSettings(root) {
  root.innerHTML = skeletonList();

  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  const load = async () => {
    const [c, p, b] = await Promise.all([
      db.from('categories').select('*').order('name'),
      db.from('payment_methods').select('*').order('name'),
      db.from('monthly_budgets').select('*').eq('year_month', ym)
    ]);
    return { cats: c.data || [], pays: p.data || [], budgets: b.data || [] };
  };

  const draw = async () => {
    const { cats, pays, budgets } = await load();

    root.innerHTML = `
      <h2>⚙️ ตั้งค่า</h2>

      <div class="grid-2">
        <div class="card">
          <h3>📁 หมวดหมู่ค่าใช้จ่าย</h3>
          <form id="catForm" class="form-row">
            <input name="icon" placeholder="📁" maxlength="2" />
            <input name="name" placeholder="ชื่อหมวด" required />
            <button type="submit" class="btn btn-small">+</button>
          </form>
          <div class="scroll-box">
            ${cats.map(c => `
              <div class="list-item">
                <span class="icon">${c.icon}</span>
                <span style="flex:1;font-size:14px">${c.name}</span>
                <button class="btn btn-danger" data-del-cat="${c.id}">🗑️</button>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="card">
          <h3>💳 ประเภทการชำระ</h3>
          <form id="payForm" class="form-row">
            <input name="icon" placeholder="💳" maxlength="2" />
            <input name="name" placeholder="ชื่อ" required />
            <button type="submit" class="btn btn-small">+</button>
          </form>
          <div class="scroll-box">
            ${pays.map(p => `
              <div class="list-item">
                <span class="icon">${p.icon}</span>
                <span style="flex:1;font-size:14px">${p.name}</span>
                <button class="btn btn-danger" data-del-pay="${p.id}">🗑️</button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <h3>🎯 วงเงินต่อเดือน (${ym})</h3>
        <p class="muted" style="margin-bottom:16px">กำหนดวงเงินสำหรับเดือนนี้</p>
        <div class="budget-grid">
          ${cats.map(c => {
            const b = budgets.find(x => x.category_id === c.id);
            return `
              <div class="budget-input-wrap">
                <span class="icon">${c.icon}</span>
                <div class="info">
                  <div class="name">${c.name}</div>
                  <input type="number" min="0" step="100" data-budget-cat="${c.id}"
                         value="${b?.limit_amount ?? ''}" placeholder="ไม่กำหนด" />
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <button id="saveBudgets" class="btn btn-primary" style="margin-top:16px">💾 บันทึกวงเงิน</button>
      </div>
    `;

    document.getElementById('catForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const { error } = await db.from('categories').insert({
        name: fd.get('name'),
        icon: fd.get('icon') || '📁'
      });
      if (error) return alert(error.message);
      showToast('✅ เพิ่มหมวดหมู่แล้ว');
      draw();
    });

    document.getElementById('payForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const { error } = await db.from('payment_methods').insert({
        name: fd.get('name'),
        icon: fd.get('icon') || '💳'
      });
      if (error) return alert(error.message);
      showToast('✅ เพิ่มประเภทชำระแล้ว');
      draw();
    });

    root.querySelectorAll('[data-del-cat]').forEach(b => {
      b.onclick = async () => {
        if (!confirm('ลบหมวดนี้?')) return;
        await db.from('categories').delete().eq('id', b.dataset.delCat);
        showToast('🗑️ ลบหมวดหมู่แล้ว');
        draw();
      };
    });
    root.querySelectorAll('[data-del-pay]').forEach(b => {
      b.onclick = async () => {
        if (!confirm('ลบประเภทนี้?')) return;
        await db.from('payment_methods').delete().eq('id', b.dataset.delPay);
        showToast('🗑️ ลบประเภทชำระแล้ว');
        draw();
      };
    });

    document.getElementById('saveBudgets').onclick = async () => {
      const inputs = root.querySelectorAll('[data-budget-cat]');
      const rows = [];
      inputs.forEach(inp => {
        const val = inp.value.trim();
        if (val !== '') {
          rows.push({
            category_id: inp.dataset.budgetCat,
            year_month: ym,
            limit_amount: Number(val)
          });
        }
      });

      await db.from('monthly_budgets').delete().eq('year_month', ym);
      if (rows.length) {
        const { error } = await db.from('monthly_budgets').insert(rows);
        if (error) return alert(error.message);
      }
      showToast('✅ บันทึกวงเงินเรียบร้อย');
    };
  };

  await draw();
}
