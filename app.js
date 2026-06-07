'use strict'

const CATS = {
  gasto:   ['Comida','Transporte','Vivienda','Salud','Entretenimiento','Ropa','Educación','Otro'],
  ingreso: ['Sueldo','Freelance','Inversión','Regalo','Otro'],
}
const MESES  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#a855f7','#ec4899','#6b7280']

const db = {
  users:      () => JSON.parse(localStorage.getItem('ga_users')  || '[]'),
  txs:        () => JSON.parse(localStorage.getItem('ga_txs')    || '[]'),
  session:    () => JSON.parse(sessionStorage.getItem('ga_sess') || 'null'),
  saveUsers:  v  => localStorage.setItem('ga_users',  JSON.stringify(v)),
  saveTxs:    v  => localStorage.setItem('ga_txs',    JSON.stringify(v)),
  setSession: v  => v ? sessionStorage.setItem('ga_sess', JSON.stringify(v))
                      : sessionStorage.removeItem('ga_sess'),
}

let ME     = null
let VIEW   = { mes: new Date().getMonth() + 1, anio: new Date().getFullYear() }
let CHARTS = {}

function register(e) {
  e.preventDefault()
  const nombre  = document.getElementById('r-nombre').value.trim()
  const email   = document.getElementById('r-email').value.trim().toLowerCase()
  const pass    = document.getElementById('r-pass').value
  const confirm = document.getElementById('r-confirm').value
  if (!nombre || !email || !pass) return alert('Todos los campos son obligatorios.')
  if (pass !== confirm)           return alert('Las contraseñas no coinciden.')
  if (pass.length < 6)            return alert('La contraseña debe tener al menos 6 caracteres.')
  const users = db.users()
  if (users.find(u => u.email === email)) return alert('Ya existe una cuenta con ese correo.')
  const user = { id: Date.now(), nombre, email, password: pass }
  users.push(user)
  db.saveUsers(users)
  db.setSession(user)
  ME = user
  showDashboard()
}

function login(e) {
  e.preventDefault()
  const email = document.getElementById('l-email').value.trim().toLowerCase()
  const pass  = document.getElementById('l-pass').value
  const user  = db.users().find(u => u.email === email && u.password === pass)
  if (!user) return alert('Correo o contraseña incorrectos.')
  db.setSession(user)
  ME = user
  showDashboard()
}

function logout() {
  db.setSession(null)
  ME = null
  showAuth('login')
}

function addTx(e) {
  e.preventDefault()
  const tipo      = document.querySelector('input[name="tipo"]:checked').value
  const categoria = document.getElementById('f-cat').value
  const desc      = document.getElementById('f-desc').value.trim()
  const monto     = +document.getElementById('f-monto').value
  const fecha     = document.getElementById('f-fecha').value
  const txs = db.txs()
  txs.push({ id: Date.now(), userId: ME.id, tipo, categoria, descripcion: desc, monto, fecha })
  db.saveTxs(txs)
  const d = new Date(fecha + 'T12:00:00')
  VIEW.mes  = d.getMonth() + 1
  VIEW.anio = d.getFullYear()
  showDashboard()
}

function deleteTx(id) {
  if (!confirm('¿Eliminar esta transacción?')) return
  db.saveTxs(db.txs().filter(t => !(t.id === id && t.userId === ME.id)))
  showDashboard()
}

function filteredTxs() {
  return db.txs()
    .filter(t => {
      if (t.userId !== ME.id) return false
      const d = new Date(t.fecha + 'T12:00:00')
      return d.getMonth() + 1 === VIEW.mes && d.getFullYear() === VIEW.anio
    })
    .sort((a, b) => b.fecha < a.fecha ? -1 : b.fecha > a.fecha ? 1 : b.id - a.id)
}

function totals(txs) {
  const ing = txs.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0)
  const gas = txs.filter(t => t.tipo === 'gasto').reduce((s, t)   => s + t.monto, 0)
  return { ingresos: ing, gastos: gas, balance: ing - gas }
}

function catData(txs) {
  const m = {}
  txs.filter(t => t.tipo === 'gasto').forEach(t => { m[t.categoria] = (m[t.categoria] || 0) + t.monto })
  return Object.entries(m).sort((a, b) => b[1] - a[1])
}

function monthlyData() {
  const m = {}
  db.txs().filter(t => t.userId === ME.id).forEach(t => {
    const k = t.fecha.slice(0, 7)
    if (!m[k]) m[k] = { ingreso: 0, gasto: 0 }
    m[k][t.tipo] += t.monto
  })
  const labels = Object.keys(m).sort()
  return { labels, ingresos: labels.map(l => m[l].ingreso), gastos: labels.map(l => m[l].gasto) }
}

function destroyCharts() {
  Object.values(CHARTS).forEach(c => { try { c.destroy() } catch (_) {} })
  CHARTS = {}
}

function initCharts(cats) {
  if (cats.length) {
    CHARTS.donut = new Chart(document.getElementById('c-cats'), {
      type: 'doughnut',
      data: { labels: cats.map(c => c[0]), datasets: [{ data: cats.map(c => c[1]), backgroundColor: COLORS, borderWidth: 2, borderColor: '#1e293b' }] },
      options: { plugins: { legend: { position: 'right', labels: { color: '#94a3b8', padding: 12, boxWidth: 12 } } }, cutout: '65%' },
    })
  }
  const md = monthlyData()
  if (md.labels.length) {
    CHARTS.bar = new Chart(document.getElementById('c-monthly'), {
      type: 'bar',
      data: { labels: md.labels, datasets: [
        { label: 'Ingresos', data: md.ingresos, backgroundColor: '#22c55e', borderRadius: 6 },
        { label: 'Gastos',   data: md.gastos,   backgroundColor: '#ef4444', borderRadius: 6 },
      ]},
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#94a3b8' } } },
        scales: {
          x: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
          y: { beginAtZero: true, ticks: { color: '#64748b' }, grid: { color: '#334155' } },
        },
      },
    })
  }
}

function updateFormCats(radio) {
  document.getElementById('f-cat').innerHTML = CATS[radio.value].map(c => `<option>${c}</option>`).join('')
  const btn = document.getElementById('f-btn')
  btn.textContent = radio.value === 'gasto' ? '+ Agregar gasto' : '+ Agregar ingreso'
  btn.className   = radio.value === 'gasto' ? 'btn-primary'     : 'btn-success'
}

function setMes(v)  { VIEW.mes  = +v; showDashboard() }
function setAnio(v) { VIEW.anio = +v; showDashboard() }

function showAuth(modo) {
  destroyCharts()
  const isLogin = modo === 'login'
  document.getElementById('root').innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">💰</div>
        <h1 class="auth-title">GastoApp</h1>
        <p class="auth-sub">${isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta gratis'}</p>
        ${isLogin ? `
          <form class="auth-form" onsubmit="login(event)">
            <div class="field"><label>Correo electrónico</label><input type="email" id="l-email" placeholder="tu@correo.com" required autofocus></div>
            <div class="field"><label>Contraseña</label><input type="password" id="l-pass" placeholder="••••••••" required></div>
            <button type="submit" class="btn-auth">Iniciar sesión</button>
          </form>
          <p class="auth-switch">¿No tienes cuenta? <a href="#" onclick="showAuth('register');return false">Regístrate gratis</a></p>
        ` : `
          <form class="auth-form" onsubmit="register(event)">
            <div class="field"><label>Nombre</label><input type="text" id="r-nombre" placeholder="Tu nombre" required autofocus></div>
            <div class="field"><label>Correo electrónico</label><input type="email" id="r-email" placeholder="tu@correo.com" required></div>
            <div class="field"><label>Contraseña</label><input type="password" id="r-pass" placeholder="Mínimo 6 caracteres" required></div>
            <div class="field"><label>Confirmar contraseña</label><input type="password" id="r-confirm" placeholder="Repite la contraseña" required></div>
            <button type="submit" class="btn-auth">Crear cuenta</button>
          </form>
          <p class="auth-switch">¿Ya tienes cuenta? <a href="#" onclick="showAuth('login');return false">Inicia sesión</a></p>
        `}
      </div>
    </div>
  `
}

function showDashboard() {
  destroyCharts()
  const txs  = filteredTxs()
  const tot  = totals(txs)
  const cats = catData(txs)
  const hoy  = new Date().toISOString().slice(0, 10)
  const { mes, anio } = VIEW
  const mesOpts  = MESES.map((n,i) => `<option value="${i+1}"${i+1===mes?' selected':''}>${n}</option>`).join('')
  const anioOpts = [2023,2024,2025,2026,2027].map(y => `<option value="${y}"${y===anio?' selected':''}>${y}</option>`).join('')
  const balCls   = tot.balance >= 0 ? 'positivo' : 'negativo'
  const rows = txs.length
    ? txs.map(t => `<tr><td class="td-fecha">${t.fecha}</td><td><span class="badge ${t.tipo}">${t.tipo}</span></td><td>${t.categoria}</td><td class="td-desc">${t.descripcion||'—'}</td><td class="right monto-${t.tipo}">$${(+t.monto).toFixed(2)}</td><td><button class="btn-del" onclick="deleteTx(${t.id})">✕</button></td></tr>`).join('')
    : `<tr><td colspan="6" class="empty-row">No hay transacciones este mes.</td></tr>`

  document.getElementById('root').innerHTML = `
    <nav class="navbar">
      <div class="nav-brand">💰 GastoApp</div>
      <div class="nav-right">
        <div class="nav-filter"><select onchange="setMes(this.value)">${mesOpts}</select><select onchange="setAnio(this.value)">${anioOpts}</select></div>
        <div class="nav-user">
          <span class="avatar">${ME.nombre[0].toUpperCase()}</span>
          <span class="nav-nombre">${ME.nombre}</span>
          <a href="#" class="btn-logout" onclick="logout();return false">Salir</a>
        </div>
      </div>
    </nav>
    <main class="app-main">
      <section class="cards">
        <div class="card ingreso"><div class="card-icon">↑</div><div class="card-info"><span class="card-label">Ingresos</span><span class="card-monto">$${tot.ingresos.toFixed(2)}</span></div></div>
        <div class="card gasto"><div class="card-icon">↓</div><div class="card-info"><span class="card-label">Gastos</span><span class="card-monto">$${tot.gastos.toFixed(2)}</span></div></div>
        <div class="card balance ${balCls}"><div class="card-icon">=</div><div class="card-info"><span class="card-label">Balance</span><span class="card-monto">$${tot.balance.toFixed(2)}</span></div></div>
      </section>
      <div class="grid-2">
        <section class="panel">
          <h2 class="panel-title">Nueva transacción</h2>
          <form onsubmit="addTx(event)">
            <div class="tipo-toggle">
              <label class="toggle-opt gasto-opt"><input type="radio" name="tipo" value="gasto" checked onchange="updateFormCats(this)"><span>Gasto</span></label>
              <label class="toggle-opt ingreso-opt"><input type="radio" name="tipo" value="ingreso" onchange="updateFormCats(this)"><span>Ingreso</span></label>
            </div>
            <div class="field"><label>Categoría</label><select id="f-cat">${CATS.gasto.map(c=>`<option>${c}</option>`).join('')}</select></div>
            <div class="field"><label>Descripción <small>(opcional)</small></label><input type="text" id="f-desc" placeholder="Ej: almuerzo con amigos" maxlength="100"></div>
            <div class="field-row">
              <div class="field"><label>Monto</label><input type="number" id="f-monto" step="0.01" min="0.01" required placeholder="0.00"></div>
              <div class="field"><label>Fecha</label><input type="date" id="f-fecha" value="${hoy}" required></div>
            </div>
            <button type="submit" class="btn-primary" id="f-btn">+ Agregar gasto</button>
          </form>
        </section>
        <section class="panel">
          <h2 class="panel-title">Gastos por categoría</h2>
          ${cats.length ? `<div class="chart-wrap"><canvas id="c-cats"></canvas></div>` : `<div class="empty-state"><span class="empty-icon">📊</span><p>Sin gastos este mes</p></div>`}
        </section>
      </div>
      <section class="panel"><h2 class="panel-title">Evolución mensual</h2><div class="chart-wrap-wide"><canvas id="c-monthly"></canvas></div></section>
      <section class="panel">
        <h2 class="panel-title">Transacciones del mes</h2>
        <div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Descripción</th><th class="right">Monto</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
      </section>
    </main>
  `
  initCharts(cats)
}

;(function () {
  const sess = db.session()
  if (sess) {
    const user = db.users().find(u => u.id === sess.id)
    if (user) { ME = user; showDashboard() }
    else       { db.setSession(null); showAuth('login') }
  } else {
    showAuth('login')
  }
})()
