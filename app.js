// ===========================================
// ⚠️ แก้ 2 บรรทัดนี้ก่อนอัปโหลด!
// ===========================================
const SUPABASE_URL = 'https://gzorqanbqwcnvohfywog.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6b3JxYW5icXdjbnZvaGZ5d29nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1MjgzNjcsImV4cCI6MjEwNTEwNDM2N30.NyQAg9LhgCXHKf-ddYjCUkHFQ94Tw8j3JA9bdpxgs7I';
// ===========================================

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const fmt = n => new Intl.NumberFormat('th-TH', {
  style: 'currency', currency: 'THB', maximumFractionDigits: 0
}).format(n);

function startOf(unit) {
  const d = new Date();
  if (unit === 'day')   d.setHours(0,0,0,0);
  if (unit === 'week')  { d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); }
  if (unit === 'month') { d.setDate(1); d.setHours(0,0,0,0); }
  if (unit === 'year')  { d.setMonth(0,1); d.setHours(0,0,0,0); }
  return d.toISOString().slice(0,10);
}

function showToast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.className = 'toast';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}

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

  if (route === 'add') {
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
  root.innerHTML = '<p class="muted">กำลังโหลด...</p>';

  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  const [expRes, budRes, catRes] = await Promise.all([
    db.from('expenses').select('*, categories(name,icon), payment_methods(name,icon)').order('expense_date', { ascending: false }),
    db.from('monthly_budgets').select('*').eq('year_month', ym),
    db.from('categories').select('*')
  ]);

  const expenses = expRes.data || [];
  const budgets = budRes.data || [];
  const categories = catRes.data || [];

  const sum = arr => arr.reduce((s,e) => s + Number(e.amount), 0);
  const inRange = from => expenses.filter(e => e.expense_date >= from);

  const totalDay   = sum(inRange(startOf('day')));
  const totalWeek  = sum(inRange(startOf('week')));
  const totalMonth = sum(inRange(startOf('month')));
  const totalYear  = sum(inRange(startOf('year')));

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

  root.innerHTML = `
    <div class="grid-4">
      ${[
        ['วันนี้', totalDay, '☀️'],
        ['สัปดาห์นี้', totalWeek, '📅'],
        ['เดือนนี้', totalMonth, '🗓️'],
        ['ปีนี้', totalYear, '🎯']
      ].map(([label, val, icon]) => `
        <div class="card summary-card">
          <div class="label"><span>${label}</span><span>${icon}</span></div>
          <div class="value">${fmt(val)}</div>
        </div>
      `).join('')}
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
      <h3>🎯 วงเงินคงเหลือแต่ละหมวด (เดือนนี้)</h3>
      <div id="budgets"></div>
    </div>
  `;

  const colors = ['#059669','#DC2626','#F59E0B','#7C3AED','#EC4899','#3B82F6','#0891B2','#10B981','#8B5CF6','#14B8A6','#6B7280'];

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10, font: { family: 'Sarabun' } } } }
  };

  new Chart(document.getElementById('catChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(byCategory).length ? Object.keys(byCategory) : ['ยังไม่มีข้อมูล'],
      datasets: [{
        data: Object.values(byCategory).length ? Object.values(byCategory) : [1],
        backgroundColor: Object.values(byCategory).length ? colors : ['#e5e7eb'],
        borderWidth: 0
      }]
    },
    options: { ...chartDefaults, cutout: '60%' }
  });

  new Chart(document.getElementById('payChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(byPayment).length ? Object.keys(byPayment) : ['ยังไม่มีข้อมูล'],
      datasets: [{
        data: Object.values(byPayment).length ? Object.values(byPayment) : [1],
        backgroundColor: Object.values(byPayment).length ? colors.slice().reverse() : ['#e5e7eb'],
        borderWidth: 0
      }]
    },
    options: { ...chartDefaults, cutout: '60%' }
  });

  new Chart(document.getElementById('weekChart'), {
    type: 'bar',
    data: {
      labels: last7.map(d => d.label),
      datasets: [{
        data: last7.map(d => d.total),
        backgroundColor: '#059669',
        borderRadius: 8
      }]
    },
    options: {
      ...chartDefaults,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() } } }
    }
  });

  const budEl = document.getElementById('budgets');
  if (!budgets.length) {
    budEl.innerHTML = '<p class="empty">ยังไม่ได้ตั้งวงเงิน — ไปที่หน้าตั้งค่าเพื่อเพิ่ม</p>';
  } else {
    budEl.innerHTML = budgets.map(b => {
      const cat = categories.find(c => c.id === b.category_id);
      const used = byCategory[cat?.name] || 0;
      const pct = Math.min(100, (used / b.limit_amount) * 100);
      const remain = b.limit_amount - used;
      const remainPct = Math.max(0, 100 - pct);
      const cls = pct >= 100 ? 'danger' : pct >= 80 ? 'warn' : 'ok';

      return `
        <div class="budget-item">
          <div class="budget-header">
            <span>${cat?.icon || '📁'} ${cat?.name || 'ไม่ระบุ'}</span>
            <span>${fmt(used)} / ${fmt(b.limit_amount)} 
              <strong style="color:${remain >= 0 ? '#059669' : '#dc2626'}">(${remainPct.toFixed(0)}%)</strong>
            </span>
          </div>
          <div class="budget-bar"><div class="budget-fill ${cls}" style="width:${pct}%"></div></div>
        </div>
      `;
    }).join('');
  }
}

// ===========================================
// ADD EXPENSE
// ===========================================
async function renderAdd(root) {
  root.innerHTML = '<p class="muted">กำลังโหลด...</p>';

  const [catRes, payRes] = await Promise.all([
    db.from('categories').select('*').order('name'),
    db.from('payment_methods').select('*').order('name')
  ]);

  const cats = catRes.data || [];
  const pays = payRes.data || [];
  const today = new Date().toISOString().slice(0,10);

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
            ${cats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}
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
      <h3 style="font-size:14px;color:#64748b;margin-bottom:8px">รายการล่าสุด</h3>
      <div class="card" style="padding:8px">
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

    const { error } = await db.from('expenses').insert(payload);
    if (error) return alert('ผิดพลาด: ' + error.message);

    ev.target.reset();
    document.querySelector('[name=expense_date]').value = today;
    await loadRecent();
    showToast('✅ บันทึกสำเร็จ!');
  });
}

// ===========================================
// SETTINGS
// ===========================================
async function renderSettings(root) {
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

    // Add category
    document.getElementById('catForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const { error } = await db.from('categories').insert({
        name: fd.get('name'),
        icon: fd.get('icon') || '📁'
      });
      if (error) return alert(error.message);
      draw();
    });

    // Add payment method
    document.getElementById('payForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const { error } = await db.from('payment_methods').insert({
        name: fd.get('name'),
        icon: fd.get('icon') || '💳'
      });
      if (error) return alert(error.message);
      draw();
    });

    // Delete
    root.querySelectorAll('[data-del-cat]').forEach(b => {
      b.onclick = async () => {
        if (!confirm('ลบหมวดนี้?')) return;
        await db.from('categories').delete().eq('id', b.dataset.delCat);
        draw();
      };
    });
    root.querySelectorAll('[data-del-pay]').forEach(b => {
      b.onclick = async () => {
        if (!confirm('ลบประเภทนี้?')) return;
        await db.from('payment_methods').delete().eq('id', b.dataset.delPay);
        draw();
      };
    });

    // Save budgets
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
