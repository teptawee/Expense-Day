// ===========================================
// ⚠️ แก้ 2 บรรทัดนี้ก่อนอัปโหลด!
// ===========================================
const SUPABASE_URL = 'https://gzorqanbqwcnvohfywog.supabase.co';
const SUPABASE_ANON_KEY = 'ใส่ anon key ของคุณที่นี่';
// ===========================================

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===========================================
// UTILITIES
// ===========================================
const fmt = n => new Intl.NumberFormat('th-TH', {
  style: 'currency', currency: 'THB', maximumFractionDigits: 0
}).format(n);

// ✅ Helper: YYYY-MM-DD จากเวลาท้องถิ่น
function localDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ✅ Helper: YYYY-MM จากเวลาท้องถิ่น
function localMonthStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// สัปดาห์เริ่มวันจันทร์ (แบบไทย)
function startOf(unit, baseDate = new Date()) {
  const d = new Date(baseDate);
  d.setHours(0, 0, 0, 0);

  if (unit === 'week') {
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
  }
  if (unit === 'month') { d.setDate(1); }
  if (unit === 'year')  { d.setMonth(0, 1); }

  return localDateStr(d);
}

function endOf(unit, baseDate = new Date()) {
  const d = new Date(baseDate);
  d.setHours(23, 59, 59, 999);

  if (unit === 'week') {
    const day = d.getDay();
    const diff = day === 0 ? 0 : 7 - day;
    d.setDate(d.getDate() + diff);
  }
  if (unit === 'month') { d.setMonth(d.getMonth() + 1, 0); }
  if (unit === 'year')  { d.setMonth(11, 31); }

  return localDateStr(d);
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

// ===========================================
// SKELETON LOADERS
// ===========================================
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
let currentMonth = localMonthStr(new Date());
let currentYear = new Date().getFullYear();

let compareMonths = (() => {
  const now = new Date();
  const b = localMonthStr(now);
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const a = localMonthStr(prevDate);
  return { a, b };
})();

let notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
let notifPanelOpen = false;
let allSubcategories = [];

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
  } else if (route === 'year') {
    await renderYear(app);
  } else if (route === 'compare') {
    await renderCompare(app);
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
  root.innerHTML = skeletonSummary() + skeletonCharts() +
    '<div class="skeleton skeleton-chart" style="margin-bottom:16px"></div>' +
    '<div class="skeleton skeleton-chart"></div>';

  const monthDate = new Date(currentMonth + '-01T00:00:00');
  const monthStart = localDateStr(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1));
  const monthEnd = localDateStr(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0));

  const loadStart = new Date(monthDate);
  loadStart.setDate(loadStart.getDate() - 60);
  const loadStartStr = localDateStr(loadStart);

  const [expRes, budRes, catRes, subcatRes] = await Promise.all([
    db.from('expenses')
      .select('*, categories(name,icon), payment_methods(name,icon), subcategories(name,icon)')
      .gte('expense_date', loadStartStr)
      .lte('expense_date', monthEnd)
      .order('expense_date', { ascending: false }),
    db.from('monthly_budgets').select('*').eq('year_month', currentMonth),
    db.from('categories').select('*'),
    db.from('subcategories').select('*')
  ]);

  const allExpenses = expRes.data || [];
  const expenses = allExpenses.filter(e =>
    e.expense_date >= monthStart && e.expense_date <= monthEnd
  );
  const budgets = budRes.data || [];
  const categories = catRes.data || [];
  const subcats = subcatRes.data || [];
  allSubcategories = subcats;

  const now = new Date();
  const isCurrentMonth = currentMonth === localMonthStr(now);

  const sum = arr => arr.reduce((s,e) => s + Number(e.amount), 0);

  const todayStr = localDateStr(now);
  const totalDay = sum(allExpenses.filter(e => e.expense_date === todayStr));

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = localDateStr(yesterday);
  const totalYesterday = sum(allExpenses.filter(e => e.expense_date === yesterdayStr));

  const weekStart = startOf('week');
  const weekEnd = endOf('week');
  const totalWeek = sum(allExpenses.filter(e => e.expense_date >= weekStart && e.expense_date <= weekEnd));

  const prevWeekBase = new Date(now);
  prevWeekBase.setDate(prevWeekBase.getDate() - 7);
  const prevWeekStartStr = startOf('week', prevWeekBase);
  const prevWeekEndStr = endOf('week', prevWeekBase);
  const totalPrevWeek = sum(allExpenses.filter(e =>
    e.expense_date >= prevWeekStartStr && e.expense_date <= prevWeekEndStr
  ));

  const totalMonth = sum(expenses);

  const prevMonthDate = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);
  const prevMonthStr = localMonthStr(prevMonthDate);
  const prevMonthStart = prevMonthStr + '-01';
  const prevMonthEnd = localDateStr(new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0));

  const { data: prevMonthExp } = await db
    .from('expenses')
    .select('amount')
    .gte('expense_date', prevMonthStart)
    .lte('expense_date', prevMonthEnd);

  const totalPrevMonth = sum(prevMonthExp || []);
  const hasPrevMonthData = prevMonthExp && prevMonthExp.length > 0;

  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const daysPassed = isCurrentMonth ? now.getDate() : daysInMonth;
  const avgPerDay = daysPassed > 0 ? totalMonth / daysPassed : 0;
  const forecast = avgPerDay * daysInMonth;

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

    <div class="card" style="margin-top:16px">
      <div class="budget-section-title" style="margin-bottom:12px">🕐 รายการล่าสุด 3 วัน</div>
      <div id="recentSection"></div>
    </div>
  `;

  document.getElementById('monthPicker').addEventListener('change', (e) => {
    currentMonth = e.target.value;
    renderDashboard(root);
  });

  const btnCurrent = document.getElementById('btnCurrent');
  if (btnCurrent) {
    btnCurrent.onclick = () => {
      currentMonth = localMonthStr(new Date());
      renderDashboard(root);
    };
  }

  // ===========================================
  // Aggregate
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

  // ยอดแยกตามหมวดย่อย (สำหรับแสดงใน budget card)
  const bySubcategory = {};
  expenses.forEach(e => {
    if (e.subcategory_id && e.subcategories) {
      const key = e.subcategory_id;
      if (!bySubcategory[key]) {
        bySubcategory[key] = {
          name: e.subcategories.name,
          icon: e.subcategories.icon,
          parentName: e.categories?.name,
          amount: 0
        };
      }
      bySubcategory[key].amount += Number(e.amount);
    }
  });

  const last7 = [...Array(7)].map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = localDateStr(d);
    const label = d.toLocaleDateString('th-TH', { weekday: 'short' });
    const total = allExpenses.filter(e => e.expense_date === key)
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
    animation: { duration: 900, easing: 'easeOutQuart' },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12, padding: 12,
          font: { family: 'Sarabun', size: 12 },
          usePointStyle: true, pointStyle: 'circle'
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
        borderWidth: 0, hoverOffset: 12
      }]
    },
    options: {
      ...chartDefaults, cutout: '62%',
      animation: { animateRotate: true, animateScale: true, duration: 1000, easing: 'easeOutQuart' }
    }
  });

  new Chart(document.getElementById('payChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(byPayment).length ? Object.keys(byPayment) : ['ยังไม่มีข้อมูล'],
      datasets: [{
        data: Object.values(byPayment).length ? Object.values(byPayment) : [1],
        backgroundColor: Object.values(byPayment).length ? colors.slice().reverse() : ['#e5e7eb'],
        borderWidth: 0, hoverOffset: 12
      }]
    },
    options: {
      ...chartDefaults, cutout: '62%',
      animation: { animateRotate: true, animateScale: true, duration: 1000, delay: 200, easing: 'easeOutQuart' }
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
        borderRadius: 10, borderSkipped: false, maxBarThickness: 48
      }]
    },
    options: {
      ...chartDefaults,
      plugins: { ...chartDefaults.plugins, legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(226, 232, 240, 0.5)', drawBorder: false },
          ticks: { callback: v => v.toLocaleString(), font: { family: 'Sarabun', size: 11 }, color: '#94a3b8' }
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Sarabun', size: 11, weight: '600' }, color: '#64748b' }
        }
      },
      animation: { duration: 900, easing: 'easeOutQuart', delay: 300 }
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

          // ยอดหมวดย่อยในหมวดนี้
          const subBreakdown = Object.values(bySubcategory).filter(s => s.parentName === cat.name);
          const maxSubAmount = Math.max(...subBreakdown.map(s => s.amount), 1);

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

              ${subBreakdown.length > 0 ? `
                <div class="subcat-breakdown">
                  <div class="subcat-breakdown-title">🏷️ แยกหมวดย่อย</div>
                  <div class="subcat-bars">
                    ${subBreakdown.sort((a,b) => b.amount - a.amount).slice(0, 4).map(s => `
                      <div class="subcat-bar-row">
                        <span class="icon">${s.icon || '🏷️'}</span>
                        <div class="bar-wrap">
                          <div class="bar-fill" style="width:${(s.amount / maxSubAmount) * 100}%"></div>
                        </div>
                        <span class="bar-value">฿${Math.round(s.amount).toLocaleString()}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
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

    // 🔔 ตรวจสอบงบประมาณ
    const alerts = await checkBudgetAlerts(budgets, byCategory, categories);

    if (alerts.length > 0) {
      const bannerHTML = renderAlertBanner(alerts);
      const monthSelector = document.querySelector('.month-selector');
      if (monthSelector) {
        monthSelector.insertAdjacentHTML('afterend', bannerHTML);
        document.getElementById('alertClose')?.addEventListener('click', () => {
          document.getElementById('alertBanner')?.remove();
        });
      }
    }
  }

  // ===========================================
  // รายการล่าสุด 3 วัน
  // ===========================================
  async function loadRecent3Days() {
    const section = document.getElementById('recentSection');
    if (!section) return;

    const today = new Date();
    const from3Days = new Date(today);
    from3Days.setDate(from3Days.getDate() - 2);

    const fromStr = localDateStr(from3Days);
    const toStr = localDateStr(today);

    const { data, error } = await db
      .from('expenses')
      .select('*, categories(name,icon), payment_methods(name,icon), subcategories(name,icon)')
      .gte('expense_date', fromStr)
      .lte('expense_date', toStr)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      section.innerHTML = `
        <div class="empty-state" style="padding:30px 20px">
          <span class="emoji" style="font-size:48px">📭</span>
          <p>ไม่มีรายการ 3 วันล่าสุด</p>
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

    const todayStr = localDateStr(today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = localDateStr(yesterday);

    section.innerHTML = sortedDates.map((date, gIdx) => {
      const items = groups[date];
      const total = items.reduce((s, e) => s + Number(e.amount), 0);

      let dayLabel, dayIcon;
      if (date === todayStr) {
        dayLabel = 'วันนี้';
        dayIcon = '☀️';
      } else if (date === yesterdayStr) {
        dayLabel = 'เมื่อวาน';
        dayIcon = '🌙';
      } else {
        dayLabel = new Date(date + 'T00:00:00').toLocaleDateString('th-TH', {
          weekday: 'long', day: 'numeric', month: 'short'
        });
        dayIcon = '📅';
      }

      return `
        <div class="date-group" style="animation-delay:${gIdx * 0.1}s;margin-bottom:14px">
          <div class="date-group-header" style="padding:6px 8px;margin-bottom:6px">
            <div class="date-label">
              <span>${dayIcon}</span>
              <span>${dayLabel}</span>
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
                <div class="expense-item" data-id="${e.id}" style="padding:12px 14px">
                  <div class="cat-icon ${cls}" style="width:42px;height:42px;font-size:20px">
                    ${e.categories?.icon || '📁'}
                  </div>
                  <div class="body">
                    <div class="cat-name" style="font-size:14px">
                      <span class="emoji">${e.categories?.icon || '📁'}</span>
                      ${catName}
                      ${e.subcategories ? `<span class="subcat-chip">${e.subcategories.icon || '🏷️'} ${e.subcategories.name}</span>` : ''}
                    </div>
                    <div class="meta">
                      <span>${payIcon}</span>
                      <span>${payName}${note}</span>
                    </div>
                  </div>
                  <div class="right">
                    <div class="amount" style="font-size:16px">฿${Number(e.amount).toLocaleString()}</div>
                    <div class="actions">
                      <button class="action-btn edit" data-edit="${e.id}" title="แก้ไข" style="width:30px;height:30px">✏️</button>
                      <button class="action-btn delete" data-delete="${e.id}" title="ลบ" style="width:30px;height:30px">🗑️</button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    section.querySelectorAll('[data-edit]').forEach(btn => {
      btn.onclick = () => {
        const item = data.find(x => x.id === btn.dataset.edit);
        if (item) openEditModal(item, categories, () => renderDashboard(root));
      };
    });

    section.querySelectorAll('[data-delete]').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('ลบรายการนี้?')) return;
        const { error } = await db.from('expenses').delete().eq('id', btn.dataset.delete);
        if (error) return alert('ผิดพลาด: ' + error.message);
        showToast('🗑️ ลบเรียบร้อย');
        loadRecent3Days();
      };
    });
  }

  loadRecent3Days();
}

// ===========================================
// LIST PAGE
// ===========================================
function getDateRange() {
  const today = new Date();

  if (listState.range === 'all') return { from: null, to: null };

  const days = listState.range === '7' ? 7 : 30;
  const from = new Date(today);
  from.setDate(from.getDate() - (days - 1));
  return { from: localDateStr(from), to: localDateStr(today) };
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
      .select('*, categories(name,icon), payment_methods(name,icon), subcategories(name,icon)')
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
                      ${e.subcategories ? `<span class="subcat-chip">${e.subcategories.icon || '🏷️'} ${e.subcategories.name}</span>` : ''}
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
// EDIT MODAL (มี subcategory)
// ===========================================
async function openEditModal(expense, categories, onSaved) {
  const [paysRes, subcatsRes] = await Promise.all([
    db.from('payment_methods').select('*').order('name'),
    db.from('subcategories').select('*').order('name')
  ]);
  const pays = paysRes.data || [];
  const subcats = subcatsRes.data || [];

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
          <select name="category_id" id="editCatSelect" required>
            ${categories.map(c => `
              <option value="${c.id}" ${c.id === expense.category_id ? 'selected' : ''}>
                ${c.icon} ${c.name}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-group subcat-dropdown-wrap" id="editSubcatWrap" style="display:none">
          <label>หมวดย่อย <span style="font-weight:400;color:#94a3b8;font-size:11px">(ไม่บังคับ)</span></label>
          <select name="subcategory_id" id="editSubcatSelect">
            <option value="">-- ไม่ระบุ --</option>
          </select>
        </div>

        <div class="form-group">
          <label>ประเภทการชำระ</label>
          <select name="payment_method_id" required>
            ${pays.map(p => `
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

  // Subcategory dropdown
  const editCatSelect = overlay.querySelector('#editCatSelect');
  const editSubcatWrap = overlay.querySelector('#editSubcatWrap');
  const editSubcatSelect = overlay.querySelector('#editSubcatSelect');

  function updateEditSubcat() {
    const catId = editCatSelect.value;
    if (!catId) {
      editSubcatWrap.style.display = 'none';
      return;
    }

    const children = subcats.filter(s => s.parent_id === catId);

    if (children.length === 0) {
      editSubcatWrap.style.display = 'none';
      editSubcatSelect.innerHTML = '<option value="">-- ไม่ระบุ --</option>';
      return;
    }

    editSubcatSelect.innerHTML = '<option value="">-- ไม่ระบุ --</option>' +
      children.map(s => `
        <option value="${s.id}" ${s.id === expense.subcategory_id ? 'selected' : ''}>
          ${s.icon} ${s.name}
        </option>
      `).join('');

    editSubcatWrap.style.display = 'block';
  }

  editCatSelect.addEventListener('change', updateEditSubcat);
  updateEditSubcat();

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
      note: fd.get('note') || null,
      subcategory_id: fd.get('subcategory_id') || null
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
// ADD EXPENSE (มี subcategory)
// ===========================================
async function renderAdd(root) {
  root.innerHTML = skeletonForm();

  const [catRes, payRes, subcatRes] = await Promise.all([
    db.from('categories').select('*').order('name'),
    db.from('payment_methods').select('*').order('name'),
    db.from('subcategories').select('*').order('name')
  ]);

  const cats = catRes.data || [];
  const pays = payRes.data || [];
  const subcats = subcatRes.data || [];
  allSubcategories = subcats;
  const today = localDateStr(new Date());

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
          <select name="category_id" id="catSelect" required>
            <option value="">-- เลือกหมวดหมู่ --</option>
            ${cats.map(c => `<option value="${c.id}" ${preselectCat === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}
          </select>
        </div>

        <div class="form-group subcat-dropdown-wrap" id="subcatWrap" style="display:none">
          <label>หมวดย่อย <span style="font-weight:400;color:#94a3b8;font-size:11px">(ไม่บังคับ)</span></label>
          <select name="subcategory_id" id="subcatSelect">
            <option value="">-- ไม่ระบุ --</option>
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
    </div>
  `;

  // Subcategory dropdown
  const catSelect = document.getElementById('catSelect');
  const subcatWrap = document.getElementById('subcatWrap');
  const subcatSelect = document.getElementById('subcatSelect');

  function updateSubcatDropdown() {
    const catId = catSelect.value;
    if (!catId) {
      subcatWrap.style.display = 'none';
      return;
    }

    const children = subcats.filter(s => s.parent_id === catId);

    if (children.length === 0) {
      subcatWrap.style.display = 'none';
      subcatSelect.innerHTML = '<option value="">-- ไม่ระบุ --</option>';
      return;
    }

    subcatSelect.innerHTML = '<option value="">-- ไม่ระบุ --</option>' +
      children.map(s => `<option value="${s.id}">${s.icon} ${s.name}</option>`).join('');

    subcatWrap.style.display = 'block';
  }

  catSelect.addEventListener('change', updateSubcatDropdown);
  updateSubcatDropdown();

  document.getElementById('expForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const payload = {
      amount: parseFloat(fd.get('amount')),
      category_id: fd.get('category_id'),
      payment_method_id: fd.get('payment_method_id'),
      expense_date: fd.get('expense_date'),
      note: fd.get('note') || null,
      subcategory_id: fd.get('subcategory_id') || null
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
    showToast('✅ บันทึกสำเร็จ!');

    btn.innerHTML = originalText;
    btn.disabled = false;
  });
}

// ===========================================
// SETTINGS (มี subcategory CRUD)
// ===========================================
async function renderSettings(root) {
  root.innerHTML = skeletonList();

  const now = new Date();
  const ym = localMonthStr(now);

  const load = async () => {
    const [c, p, b, s] = await Promise.all([
      db.from('categories').select('*').order('name'),
      db.from('payment_methods').select('*').order('name'),
      db.from('monthly_budgets').select('*').eq('year_month', ym),
      db.from('subcategories').select('*').order('name')
    ]);
    return {
      cats: c.data || [],
      pays: p.data || [],
      budgets: b.data || [],
      subcats: s.data || []
    };
  };

  const draw = async () => {
    const { cats, pays, budgets, subcats } = await load();

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

      <!-- 🆕 หมวดย่อย -->
      <div class="card" style="margin-top:16px">
        <h3>🏷️ หมวดย่อย (Subcategories)</h3>
        <p class="muted" style="margin-bottom:12px;font-size:12px">
          คลิกที่หมวดเพื่อเพิ่ม/ลบหมวดย่อย
        </p>
        <div class="scroll-box" style="max-height:500px">
          ${cats.map(c => {
            const children = subcats.filter(s => s.parent_id === c.id);
            return `
              <div class="subcat-group" data-cat-group="${c.id}">
                <div class="subcat-header" data-toggle-group="${c.id}">
                  <span class="parent-icon">${c.icon}</span>
                  <span class="parent-name">${c.name}</span>
                  <span class="subcat-count">${children.length}</span>
                  <span class="toggle-icon">▼</span>
                </div>
                <div class="subcat-body">
                  <div class="subcat-list" data-subcat-list="${c.id}">
                    ${children.length === 0
                      ? '<p class="muted" style="font-size:11px;padding:6px 0">ยังไม่มีหมวดย่อย</p>'
                      : children.map(s => `
                        <div class="subcat-item">
                          <span class="subcat-icon">${s.icon}</span>
                          <span class="subcat-name">${s.name}</span>
                          <button class="subcat-del" data-del-subcat="${s.id}" title="ลบ">✕</button>
                        </div>
                      `).join('')
                    }
                  </div>
                  <form class="subcat-add-form" data-add-subcat="${c.id}">
                    <input name="icon" placeholder="🏷️" maxlength="2" />
                    <input name="name" placeholder="ชื่อหมวดย่อย" required />
                    <button type="submit">+</button>
                  </form>
                </div>
              </div>
            `;
          }).join('')}
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

    // Subcategory: Toggle expand
    root.querySelectorAll('[data-toggle-group]').forEach(el => {
      el.onclick = () => {
        const group = el.closest('.subcat-group');
        group.classList.toggle('expanded');
      };
    });

    // Subcategory: Add
    root.querySelectorAll('[data-add-subcat]').forEach(form => {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const parentId = form.dataset.addSubcat;
        const fd = new FormData(form);
        const name = (fd.get('name') || '').trim();
        const icon = (fd.get('icon') || '🏷️').trim() || '🏷️';

        if (!name) return;

        const { error } = await db.from('subcategories').insert({
          parent_id: parentId,
          name,
          icon
        });

        if (error) {
          if (error.code === '23505') return alert('หมวดย่อยนี้มีอยู่แล้ว');
          return alert('ผิดพลาด: ' + error.message);
        }

        showToast('✅ เพิ่มหมวดย่อยแล้ว');
        draw();
      };
    });

    // Subcategory: Delete
    root.querySelectorAll('[data-del-subcat]').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm('ลบหมวดย่อยนี้?')) return;

        const { error } = await db
          .from('subcategories')
          .delete()
          .eq('id', btn.dataset.delSubcat);

        if (error) return alert('ผิดพลาด: ' + error.message);
        showToast('🗑️ ลบหมวดย่อยแล้ว');
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

// ===========================================
// YEAR PAGE
// ===========================================
async function renderYear(root) {
  root.innerHTML = skeletonSummary() +
    '<div class="skeleton skeleton-chart" style="height:340px;margin-bottom:16px"></div>' +
    skeletonCharts();

  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;
  const prevYearStart = `${currentYear - 1}-01-01`;
  const prevYearEnd = `${currentYear - 1}-12-31`;

  const [expRes, prevExpRes] = await Promise.all([
    db.from('expenses')
      .select('*, categories(name,icon)')
      .gte('expense_date', yearStart)
      .lte('expense_date', yearEnd)
      .order('expense_date', { ascending: false }),
    db.from('expenses')
      .select('amount, expense_date')
      .gte('expense_date', prevYearStart)
      .lte('expense_date', prevYearEnd)
  ]);

  const expenses = expRes.data || [];
  const prevExpenses = prevExpRes.data || [];

  const sum = arr => arr.reduce((s,e) => s + Number(e.amount), 0);

  const totalYear = sum(expenses);
  const totalPrevYear = sum(prevExpenses);

  const monthsWithData = new Set(expenses.map(e => e.expense_date.slice(0, 7))).size;
  const avgPerMonthFull = totalYear / 12;

  const monthlyTotals = {};
  expenses.forEach(e => {
    const m = parseInt(e.expense_date.slice(5, 7));
    monthlyTotals[m] = (monthlyTotals[m] || 0) + Number(e.amount);
  });

  let maxMonth = 0, maxMonthAmount = 0;
  Object.entries(monthlyTotals).forEach(([m, amt]) => {
    if (amt > maxMonthAmount) {
      maxMonthAmount = amt;
      maxMonth = parseInt(m);
    }
  });

  const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  let yearChange;
  if (totalPrevYear === 0 && totalYear === 0) yearChange = { pct: 0, type: 'flat' };
  else if (totalPrevYear === 0) yearChange = { pct: 100, type: 'new' };
  else {
    const change = ((totalYear - totalPrevYear) / totalPrevYear) * 100;
    yearChange = { pct: Math.abs(change), type: change > 0 ? 'up' : change < 0 ? 'down' : 'flat' };
  }

  const byCategory = {};
  expenses.forEach(e => {
    const k = e.categories?.name || 'ไม่ระบุ';
    if (!byCategory[k]) byCategory[k] = { amount: 0, count: 0, icon: e.categories?.icon || '📁' };
    byCategory[k].amount += Number(e.amount);
    byCategory[k].count += 1;
  });

  const rankedCategories = Object.entries(byCategory)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.amount - a.amount);

  const isCurrentYear = currentYear === new Date().getFullYear();

  root.innerHTML = `
    <div class="year-selector">
      <div class="year-selector-label">
        <span>📅</span>
        <span>ดูปี:</span>
      </div>
      <div class="year-selector-input">
        <input type="number" id="yearPicker" value="${currentYear}" min="2000" max="2100" step="1" />
      </div>
      ${!isCurrentYear ? `
        <button class="btn-year-current" id="btnYearCurrent">
          <span>📍</span> ปัจจุบัน
        </button>
      ` : ''}
    </div>

    <div class="year-stats-grid">
      <div class="year-stat-card total">
        <div class="label">💰 ยอดรวมทั้งปี</div>
        <div class="value">${totalYear.toLocaleString()}<span class="unit">บาท</span></div>
        <div class="sub">${expenses.length} รายการ</div>
      </div>

      <div class="year-stat-card avg">
        <div class="label">📊 เฉลี่ย/เดือน</div>
        <div class="value">${Math.round(avgPerMonthFull).toLocaleString()}<span class="unit">บาท</span></div>
        <div class="sub">${monthsWithData} เดือนที่มีข้อมูล</div>
      </div>

      <div class="year-stat-card max">
        <div class="label">🔥 เดือนที่ใช้มากสุด</div>
        <div class="value">${maxMonth ? monthNames[maxMonth - 1] : '-'}</div>
        <div class="sub">${maxMonthAmount > 0 ? `฿${maxMonthAmount.toLocaleString()}` : 'ยังไม่มีข้อมูล'}</div>
      </div>

      <div class="year-stat-card compare">
        <div class="label">📈 เทียบปีก่อน</div>
        <div class="value" style="color: ${
          yearChange.type === 'up' ? '#dc2626' :
          yearChange.type === 'down' ? '#16a34a' :
          yearChange.type === 'new' ? '#f59e0b' : '#64748b'
        }">
          ${yearChange.type === 'new' ? 'ใหม่' : 
            yearChange.type === 'flat' ? '—' :
            (yearChange.type === 'up' ? '▲ ' : '▼ ') + yearChange.pct.toFixed(1) + '%'}
        </div>
        <div class="sub">${totalPrevYear > 0 ? `ปีก่อน: ฿${totalPrevYear.toLocaleString()}` : 'ยังไม่มีข้อมูล'}</div>
      </div>
    </div>

    <div class="card year-chart-card">
      <h3>📈 รายจ่าย 12 เดือน (${currentYear})</h3>
      <div class="chart-container"><canvas id="yearChart"></canvas></div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3>🥇 หมวดที่ใช้มากสุด (Top 10)</h3>
        <div class="rank-list" id="rankList"></div>
      </div>
      <div class="card">
        <h3>📊 เปรียบเทียบรายเดือน</h3>
        <div class="chart-container"><canvas id="monthCompareChart"></canvas></div>
      </div>
    </div>
  `;

  document.getElementById('yearPicker').addEventListener('change', (e) => {
    const y = parseInt(e.target.value);
    if (y >= 2000 && y <= 2100) {
      currentYear = y;
      renderYear(root);
    }
  });

  const btnYearCurrent = document.getElementById('btnYearCurrent');
  if (btnYearCurrent) {
    btnYearCurrent.onclick = () => {
      currentYear = new Date().getFullYear();
      renderYear(root);
    };
  }

  const monthlyData = Array.from({ length: 12 }, (_, i) => monthlyTotals[i + 1] || 0);

  new Chart(document.getElementById('yearChart'), {
    type: 'bar',
    data: {
      labels: monthNames,
      datasets: [{
        label: 'บาท',
        data: monthlyData,
        backgroundColor: (ctx) => {
          const chart = ctx.chart;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return '#10b981';
          const gradient = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, '#34d399');
          gradient.addColorStop(1, '#059669');
          return gradient;
        },
        borderRadius: 10, borderSkipped: false, maxBarThickness: 40
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          padding: 12,
          titleFont: { family: 'Sarabun', size: 13, weight: '600' },
          bodyFont: { family: 'Sarabun', size: 13 },
          cornerRadius: 10,
          callbacks: {
            title: (ctx) => `${ctx[0].label} ${currentYear}`,
            label: (ctx) => ` รวม: ฿${ctx.parsed.y.toLocaleString()}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(226, 232, 240, 0.5)', drawBorder: false },
          ticks: { callback: v => v.toLocaleString(), font: { family: 'Sarabun', size: 11 }, color: '#94a3b8' }
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Sarabun', size: 11, weight: '600' }, color: '#64748b' }
        }
      },
      animation: { duration: 1000, easing: 'easeOutQuart' }
    }
  });

  const prevMonthly = Array(12).fill(0);
  prevExpenses.forEach(e => {
    const m = parseInt(e.expense_date.slice(5, 7));
    prevMonthly[m - 1] += Number(e.amount);
  });

  new Chart(document.getElementById('monthCompareChart'), {
    type: 'line',
    data: {
      labels: monthNames,
      datasets: [
        {
          label: String(currentYear),
          data: monthlyData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4, fill: true,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff', pointBorderWidth: 2,
          pointRadius: 5, pointHoverRadius: 7, borderWidth: 3
        },
        {
          label: String(currentYear - 1),
          data: prevMonthly,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.05)',
          tension: 0.4, fill: true,
          pointBackgroundColor: '#f59e0b',
          pointBorderColor: '#fff', pointBorderWidth: 2,
          pointRadius: 5, pointHoverRadius: 7, borderWidth: 3,
          borderDash: [5, 5]
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: { family: 'Sarabun', size: 12, weight: '600' },
            usePointStyle: true, pointStyle: 'circle',
            boxWidth: 8, padding: 15
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          padding: 12,
          titleFont: { family: 'Sarabun', size: 13, weight: '600' },
          bodyFont: { family: 'Sarabun', size: 13 },
          cornerRadius: 10,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ฿${ctx.parsed.y.toLocaleString()}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(226, 232, 240, 0.5)', drawBorder: false },
          ticks: { callback: v => v.toLocaleString(), font: { family: 'Sarabun', size: 11 }, color: '#94a3b8' }
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Sarabun', size: 11, weight: '600' }, color: '#64748b' }
        }
      },
      animation: { duration: 1200, easing: 'easeOutQuart' }
    }
  });

  const rankList = document.getElementById('rankList');
  if (!rankedCategories.length) {
    rankList.innerHTML = '<p class="empty">ยังไม่มีข้อมูลในปีนี้</p>';
  } else {
    rankList.innerHTML = rankedCategories.slice(0, 10).map((cat, i) => `
      <div class="rank-item">
        <div class="rank-num">${i + 1}</div>
        <div class="rank-icon">${cat.icon}</div>
        <div class="rank-body">
          <div class="rank-name">${cat.name}</div>
          <div class="rank-count">${cat.count} รายการ</div>
        </div>
        <div class="rank-amount">฿${cat.amount.toLocaleString()}</div>
      </div>
    `).join('');
  }
}

// ===========================================
// COMPARE PAGE
// ===========================================
async function renderCompare(root) {
  root.innerHTML = skeletonSummary() + skeletonCharts();

  const monthA = compareMonths.a;
  const monthB = compareMonths.b;

  const [yearA, monA] = monthA.split('-').map(Number);
  const [yearB, monB] = monthB.split('-').map(Number);

  const startA = `${monthA}-01`;
  const endA = localDateStr(new Date(yearA, monA, 0));
  const startB = `${monthB}-01`;
  const endB = localDateStr(new Date(yearB, monB, 0));

  const [expA, expB] = await Promise.all([
    db.from('expenses')
      .select('*, categories(name,icon)')
      .gte('expense_date', startA).lte('expense_date', endA),
    db.from('expenses')
      .select('*, categories(name,icon)')
      .gte('expense_date', startB).lte('expense_date', endB)
  ]);

  const dataA = expA.data || [];
  const dataB = expB.data || [];

  const sum = arr => arr.reduce((s,e) => s + Number(e.amount), 0);
  const totalA = sum(dataA);
  const totalB = sum(dataB);

  const daysInA = new Date(yearA, monA, 0).getDate();
  const daysInB = new Date(yearB, monB, 0).getDate();
  const avgA = daysInA > 0 ? totalA / daysInA : 0;
  const avgB = daysInB > 0 ? totalB / daysInB : 0;

  let diff = 0, diffPct = 0, diffType = 'flat';
  if (totalA === 0 && totalB === 0) {
    diff = 0; diffPct = 0; diffType = 'flat';
  } else if (totalA === 0) {
    diff = totalB; diffPct = 100; diffType = 'up';
  } else {
    diff = totalB - totalA;
    diffPct = (diff / totalA) * 100;
    diffType = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
  }

  const catA = {}, catB = {};
  dataA.forEach(e => {
    const k = e.categories?.name || 'ไม่ระบุ';
    if (!catA[k]) catA[k] = { amount: 0, count: 0, icon: e.categories?.icon || '📁' };
    catA[k].amount += Number(e.amount);
    catA[k].count += 1;
  });
  dataB.forEach(e => {
    const k = e.categories?.name || 'ไม่ระบุ';
    if (!catB[k]) catB[k] = { amount: 0, count: 0, icon: e.categories?.icon || '📁' };
    catB[k].amount += Number(e.amount);
    catB[k].count += 1;
  });

  const allCatNames = new Set([...Object.keys(catA), ...Object.keys(catB)]);
  const catComparison = [...allCatNames].map(name => {
    const a = catA[name]?.amount || 0;
    const b = catB[name]?.amount || 0;
    const diffVal = b - a;
    let type = 'same';
    if (diffVal > 0) type = 'increase';
    else if (diffVal < 0) type = 'decrease';

    return {
      name,
      icon: catA[name]?.icon || catB[name]?.icon || '📁',
      a, b, diff: diffVal, type
    };
  }).sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff));

  const monthLabelA = new Date(yearA, monA - 1, 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
  const monthLabelB = new Date(yearB, monB - 1, 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

  const maxCat = Math.max(...catComparison.map(c => Math.max(c.a, c.b)), 1);

  const dailyA = Array(daysInA).fill(0);
  const dailyB = Array(daysInB).fill(0);
  dataA.forEach(e => {
    const d = parseInt(e.expense_date.slice(8, 10));
    dailyA[d - 1] += Number(e.amount);
  });
  dataB.forEach(e => {
    const d = parseInt(e.expense_date.slice(8, 10));
    dailyB[d - 1] += Number(e.amount);
  });

  root.innerHTML = `
    <div class="compare-selector">
      <div class="compare-month-input month-a">
        <label>📅 เดือน A</label>
        <input type="month" id="monthA" value="${monthA}" />
      </div>
      <div class="vs-badge">VS</div>
      <div class="compare-month-input month-b">
        <label>📅 เดือน B</label>
        <input type="month" id="monthB" value="${monthB}" />
      </div>
    </div>

    <div class="compare-cards">
      <div class="compare-card month-a">
        <div class="month-label">🟢 ${monthLabelA}</div>
        <div class="amount">${totalA.toLocaleString()}<span class="unit">บาท</span></div>
        <div class="count">${dataA.length} รายการ</div>
        <div class="avg">📊 เฉลี่ย/วัน ฿${Math.round(avgA).toLocaleString()}</div>
      </div>

      <div class="compare-card month-b">
        <div class="month-label">🔴 ${monthLabelB}</div>
        <div class="amount">${totalB.toLocaleString()}<span class="unit">บาท</span></div>
        <div class="count">${dataB.length} รายการ</div>
        <div class="avg">📊 เฉลี่ย/วัน ฿${Math.round(avgB).toLocaleString()}</div>
      </div>
    </div>

    <div style="text-align:center;margin-bottom:20px">
      <div class="diff-badge ${diffType}">
        ${diffType === 'up' ? '▲' : diffType === 'down' ? '▼' : '•'}
        ${diffType === 'flat' ? 'เท่ากัน' : 
          (diff > 0 ? '+' : '') + diff.toLocaleString() + ' บาท (' + 
          (diff > 0 ? '+' : '') + diffPct.toFixed(1) + '%)'}
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <h3>📈 แนวโน้มรายวัน (2 เดือน)</h3>
      <div class="chart-container"><canvas id="dailyChart"></canvas></div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <h3>📊 เปรียบเทียบตามหมวด</h3>
      <div class="cat-compare-list">
        ${catComparison.length === 0 
          ? '<p class="empty">ยังไม่มีข้อมูลใน 2 เดือนนี้</p>' 
          : catComparison.map(c => {
            const pctA = (c.a / maxCat) * 100;
            const pctB = (c.b / maxCat) * 100;
            const diffLabel = c.diff === 0 ? 'เท่ากัน' :
              (c.diff > 0 ? '+' : '') + c.diff.toLocaleString() + ' ฿';
            return `
              <div class="cat-compare-item ${c.type}">
                <div class="cat-compare-header">
                  <div class="cat-compare-name">
                    <span class="icon">${c.icon}</span>
                    <span>${c.name}</span>
                  </div>
                  <div class="cat-compare-diff ${c.type === 'increase' ? 'up' : c.type === 'decrease' ? 'down' : 'flat'}">
                    ${c.type === 'increase' ? '▲' : c.type === 'decrease' ? '▼' : '•'} ${diffLabel}
                  </div>
                </div>
                <div class="cat-compare-bars">
                  <div class="cat-compare-bar a">
                    <span class="label">A</span>
                    <div class="bar-wrap"><div class="bar-fill" style="width:${pctA}%"></div></div>
                    <span class="value">฿${c.a.toLocaleString()}</span>
                  </div>
                  <div class="cat-compare-bar b">
                    <span class="label">B</span>
                    <div class="bar-wrap"><div class="bar-fill" style="width:${pctB}%"></div></div>
                    <span class="value">฿${c.b.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')
        }
      </div>
    </div>
  `;

  document.getElementById('monthA').addEventListener('change', (e) => {
    compareMonths.a = e.target.value;
    renderCompare(root);
  });

  document.getElementById('monthB').addEventListener('change', (e) => {
    compareMonths.b = e.target.value;
    renderCompare(root);
  });

  const maxDays = Math.max(daysInA, daysInB);
  const dayLabels = Array.from({ length: maxDays }, (_, i) => `${i + 1}`);
  const seriesA = [...dailyA, ...Array(maxDays - daysInA).fill(null)];
  const seriesB = [...dailyB, ...Array(maxDays - daysInB).fill(null)];

  new Chart(document.getElementById('dailyChart'), {
    type: 'line',
    data: {
      labels: dayLabels,
      datasets: [
        {
          label: monthLabelA,
          data: seriesA,
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22, 163, 74, 0.1)',
          tension: 0.4, fill: true,
          pointBackgroundColor: '#16a34a',
          pointBorderColor: '#fff', pointBorderWidth: 2,
          pointRadius: 3, pointHoverRadius: 6,
          borderWidth: 3, spanGaps: false
        },
        {
          label: monthLabelB,
          data: seriesB,
          borderColor: '#db2777',
          backgroundColor: 'rgba(219, 39, 119, 0.1)',
          tension: 0.4, fill: true,
          pointBackgroundColor: '#db2777',
          pointBorderColor: '#fff', pointBorderWidth: 2,
          pointRadius: 3, pointHoverRadius: 6,
          borderWidth: 3, spanGaps: false
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: { family: 'Sarabun', size: 12, weight: '600' },
            usePointStyle: true, pointStyle: 'circle',
            boxWidth: 8, padding: 15
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          padding: 12,
          titleFont: { family: 'Sarabun', size: 13, weight: '600' },
          bodyFont: { family: 'Sarabun', size: 13 },
          cornerRadius: 10,
          callbacks: {
            title: (ctx) => `วันที่ ${ctx[0].label}`,
            label: (ctx) => {
              if (ctx.parsed.y === null || ctx.parsed.y === undefined) return null;
              return ` ${ctx.dataset.label}: ฿${ctx.parsed.y.toLocaleString()}`;
            }
          },
          filter: (item) => item.parsed.y !== null
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(226, 232, 240, 0.5)', drawBorder: false },
          ticks: { callback: v => v.toLocaleString(), font: { family: 'Sarabun', size: 11 }, color: '#94a3b8' }
        },
        x: {
          grid: { display: false },
          ticks: {
            font: { family: 'Sarabun', size: 10 },
            color: '#94a3b8',
            maxRotation: 0, autoSkip: true, maxTicksLimit: 15
          }
        }
      },
      animation: { duration: 1200, easing: 'easeOutQuart' }
    }
  });
}

// ===========================================
// NOTIFICATIONS & ALERTS
// ===========================================
async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

function showBrowserNotification(title, body, type = 'warn') {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const icons = { warn: '⚠️', danger: '🔴', over: '🚨' };

  try {
    new Notification(`${icons[type]} ${title}`, {
      body: body,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💰</text></svg>',
      tag: `budget-${type}-${Date.now()}`,
      requireInteraction: type === 'over'
    });
  } catch (err) {
    console.warn('Notification error:', err);
  }
}

function saveNotification({ title, message, type }) {
  const notif = {
    id: Date.now().toString(),
    title, message, type,
    time: new Date().toISOString(),
    read: false
  };

  notifications.unshift(notif);
  if (notifications.length > 50) notifications = notifications.slice(0, 50);
  localStorage.setItem('notifications', JSON.stringify(notifications));
  updateNotifBadge();
}

function updateNotifBadge() {
  const unreadCount = notifications.filter(n => !n.read).length;

  ['notifBadge', 'notifBadgeMobile'].forEach(id => {
    const badge = document.getElementById(id);
    if (!badge) return;
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  });

  const btn = document.getElementById('notifToggle');
  if (btn) btn.classList.toggle('active', unreadCount > 0);
}

async function checkBudgetAlerts(budgets, byCategory, categories) {
  const alerts = [];

  budgets.forEach(b => {
    const cat = categories.find(c => c.id === b.category_id);
    if (!cat) return;

    const used = byCategory[cat.name] || 0;
    const limit = Number(b.limit_amount);
    if (limit <= 0) return;

    const pct = (used / limit) * 100;

    if (pct >= 100) {
      alerts.push({
        type: 'over',
        icon: '🚨',
        title: 'เกินวงเงินแล้ว!',
        message: `${cat.icon} ${cat.name}: ฿${used.toLocaleString()} / ฿${limit.toLocaleString()} (${pct.toFixed(0)}%)`,
        categoryId: cat.id
      });
    } else if (pct >= 90) {
      alerts.push({
        type: 'danger',
        icon: '🔴',
        title: 'ใกล้เต็มวงเงิน!',
        message: `${cat.icon} ${cat.name}: ใช้ไป ${pct.toFixed(0)}% ของวงเงิน`,
        categoryId: cat.id
      });
    } else if (pct >= 70) {
      alerts.push({
        type: 'warn',
        icon: '⚠️',
        title: 'ใช้จ่ายใกล้ถึง 70%',
        message: `${cat.icon} ${cat.name}: ใช้ไป ${pct.toFixed(0)}% ของวงเงิน`,
        categoryId: cat.id
      });
    }
  });

  const todayStr = localDateStr(new Date());
  const existingToday = notifications.filter(n =>
    n.time.startsWith(todayStr) && n.type === 'over'
  );

  alerts.forEach(alert => {
    if (alert.type === 'over') {
      const alreadyNotified = existingToday.some(
        n => n.message.includes(alert.message.split(':')[0])
      );

      if (!alreadyNotified) {
        saveNotification(alert);
        showAlertToast(alert);
        showBrowserNotification(alert.title, alert.message, alert.type);
      }
    }
  });

  return alerts;
}

function showAlertToast(alert) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const t = document.createElement('div');
  t.className = `toast ${alert.type}`;
  t.innerHTML = `${alert.icon} <span>${alert.title}</span>`;
  document.body.appendChild(t);

  setTimeout(() => {
    t.style.transition = 'opacity 0.3s, transform 0.3s';
    t.style.opacity = '0';
    t.style.transform = 'translate(-50%, -20px)';
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

function renderAlertBanner(alerts) {
  if (!alerts.length) return '';

  const hasOver = alerts.some(a => a.type === 'over');
  const hasDanger = alerts.some(a => a.type === 'danger');
  const bannerLevel = hasOver ? 'over' : hasDanger ? 'danger' : 'warn';

  const bannerIcon = hasOver ? '🚨' : hasDanger ? '🔴' : '⚠️';
  const bannerTitle = hasOver ? 'เกินวงเงิน!'
    : hasDanger ? 'ใกล้เต็มวงเงิน!'
    : 'ใช้จ่ายใกล้ถึงเกณฑ์';

  const topAlerts = alerts.slice(0, 3);
  const moreCount = alerts.length - topAlerts.length;

  return `
    <div class="alert-banner ${bannerLevel}" id="alertBanner">
      <div class="alert-icon">${bannerIcon}</div>
      <div class="alert-body">
        <div class="alert-title">${bannerTitle}</div>
        <div class="alert-list">
          ${topAlerts.map(a => `
            <span class="alert-chip">
              ${a.icon} ${a.message.split(':')[0].replace(/^[^\s]+\s/, '')}
            </span>
          `).join('')}
          ${moreCount > 0 ? `<span class="alert-chip">+${moreCount} อื่นๆ</span>` : ''}
        </div>
      </div>
      <button class="alert-close" id="alertClose" title="ปิด">✕</button>
    </div>
  `;
}

function renderNotifPanel() {
  const existing = document.querySelector('.notif-panel');
  if (existing) {
    existing.remove();
    notifPanelOpen = false;
    return;
  }

  notifications.forEach(n => n.read = true);
  localStorage.setItem('notifications', JSON.stringify(notifications));
  updateNotifBadge();

  const panel = document.createElement('div');
  panel.className = 'notif-panel';
  panel.innerHTML = `
    <div class="notif-panel-header">
      <h4>🔔 การแจ้งเตือน</h4>
      <button class="clear-btn" id="clearNotifs">ล้างทั้งหมด</button>
    </div>
    <div class="notif-list">
      ${notifications.length === 0
        ? '<div class="notif-empty">ยังไม่มีการแจ้งเตือน</div>'
        : notifications.slice(0, 20).map(n => `
          <div class="notif-item ${n.type}">
            <span class="notif-icon">${n.type === 'over' ? '🚨' : n.type === 'danger' ? '🔴' : '⚠️'}</span>
            <div class="notif-body">
              <div class="notif-title">${n.title}</div>
              <div class="notif-time">${new Date(n.time).toLocaleString('th-TH', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
              })}</div>
            </div>
          </div>
        `).join('')
      }
    </div>
  `;

  document.body.appendChild(panel);
  notifPanelOpen = true;

  panel.querySelector('#clearNotifs').onclick = () => {
    notifications = [];
    localStorage.setItem('notifications', JSON.stringify(notifications));
    updateNotifBadge();
    panel.remove();
    notifPanelOpen = false;
    showToast('🗑️ ล้างการแจ้งเตือนแล้ว');
  };

  setTimeout(() => {
    const closeOnOutside = (e) => {
      if (!panel.contains(e.target) &&
          !e.target.closest('.notif-toggle') &&
          !e.target.closest('.notif-toggle-mobile')) {
        panel.remove();
        notifPanelOpen = false;
        document.removeEventListener('click', closeOnOutside);
      }
    };
    document.addEventListener('click', closeOnOutside);
  }, 100);
}

function initNotifications() {
  const btnDesktop = document.getElementById('notifToggle');
  const btnMobile = document.getElementById('notifToggleMobile');

  const handleClick = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const granted = await requestNotificationPermission();
      if (granted) showToast('🔔 เปิดการแจ้งเตือนแล้ว');
    }
    renderNotifPanel();
  };

  if (btnDesktop) btnDesktop.addEventListener('click', handleClick);
  if (btnMobile) btnMobile.addEventListener('click', handleClick);

  updateNotifBadge();
}

window.addEventListener('load', initNotifications);

// ===========================================
// DARK MODE TOGGLE
// ===========================================
function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');

  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
  const icons = document.querySelectorAll('.theme-icon');
  icons.forEach(el => {
    el.textContent = theme === 'dark' ? '☀️' : '🌙';
  });
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';

  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon(next);

  showToast(next === 'dark' ? '🌙 โหมดกลางคืน' : '☀️ โหมดสว่าง');
}

(function applyThemeEarly() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
})();

window.addEventListener('load', () => {
  initTheme();

  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
  document.getElementById('themeToggleMobile')?.addEventListener('click', toggleTheme);
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!localStorage.getItem('theme')) {
    const theme = e.matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
  }
});
