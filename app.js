import { initializeApp }                                          from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'
import { getAuth, createUserWithEmailAndPassword,
         signInWithEmailAndPassword, signOut,
         onAuthStateChanged, updateProfile }                       from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js'
import { getFirestore, collection, addDoc, deleteDoc,
         doc, query, where, getDocs }                              from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'

const fbApp = initializeApp({
  apiKey:            'AIzaSyC-QlZzDFhPzyfVhy4LDrsU-22bYD971Gw',
  authDomain:        'cuentasdb-558bf.firebaseapp.com',
  projectId:         'cuentasdb-558bf',
  storageBucket:     'cuentasdb-558bf.firebasestorage.app',
  messagingSenderId: '153042308100',
  appId:             '1:153042308100:web:53593124ca12492f89f951',
})
const auth  = getAuth(fbApp)
const store = getFirestore(fbApp)

const CATS = {
  gasto:   ['Comida','Transporte','Vivienda','Salud','Entretenimiento','Ropa','Educación','Otro'],
  ingreso: ['Sueldo','Freelance','Inversión','Regalo','Otro'],
}
const MESES  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#a855f7','#ec4899','#6b7280']

const fmt = n => {
  const abs = Math.abs(+n)
  const [int, dec] = abs.toFixed(2).split('.')
  return (+n < 0 ? '-' : '') + '$' + int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + dec
}
const fmtMes = ym => MESES[+ym.slice(5) - 1].slice(0, 3) + ' ' + ym.slice(2, 4)

let ME     = null
let VIEW   = { mes: new Date().getMonth() + 1, anio: new Date().getFullYear() }
let CHARTS = {}

// ── Auth ──────────────────────────────────────────────────────────────────────
async function register(e) {
  e.preventDefault()
  const btn    = e.target.querySelector('button[type="submit"]')
  const nombre = document.getElementById('r-nombre').value.trim()
  const email  = document.getElementById('r-email').value.trim()
  const pass   = document.getElementById('r-pass').value
  const confirm= document.getElementById('r-confirm').value

  if (!nombre || !email || !pass) return alert('Todos los campos son obligatorios.')
  if (pass !== confirm)           return alert('Las contraseñas no coinciden.')
  if (pass.length < 6)            return alert('La contraseña debe tener al menos 6 caracteres.')

  btn.disabled = true
  btn.textContent = 'Creando cuenta...'
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass)
    await updateProfile(cred.user, { displayName: nombre })
  } catch (err) {
    btn.disabled = false
    btn.textContent = 'Crear cuenta'
    const msgs = {
      'auth/email-already-in-use':  'Ya existe una cuenta con ese correo.',
      'auth/invalid-email':         'Correo electrónico inválido.',
      'auth/weak-password':         'La contraseña es muy débil (mínimo 6 caracteres).',
      'auth/unauthorized-domain':   'Dominio no autorizado. Ve a Firebase Console → Authentication → Settings → Authorized domains y agrega: poeta2475.github.io',
      'auth/network-request-failed':'Sin conexión. Revisa tu internet.',
    }
    alert(msgs[err.code] || 'Error al registrar: ' + err.message)
  }
}

async function login(e) {
  e.preventDefault()
  const btn   = e.target.querySelector('button[type="submit"]')
  const email = document.getElementById('l-email').value.trim()
  const pass  = document.getElementById('l-pass').value

  btn.disabled = true
  btn.textContent = 'Entrando...'
  try {
    await signInWithEmailAndPassword(auth, email, pass)
  } catch (err) {
    btn.disabled = false
    btn.textContent = 'Iniciar sesión'
    if (err.code === 'auth/unauthorized-domain') {
      alert('Dominio no autorizado en Firebase.\nVe a Firebase Console → Authentication → Settings → Authorized domains\ny agrega: poeta2475.github.io')
    } else if (err.code === 'auth/network-request-failed') {
      alert('Sin conexión. Revisa tu internet.')
    } else {
      alert('Correo o contraseña incorrectos.')
    }
  }
}

async function logout() {
  try { await signOut(auth) } catch (_) {}
}

// ── Transactions ──────────────────────────────────────────────────────────────
async function loadAllTxs() {
  const q    = query(collection(store, 'transacciones'), where('userId', '==', ME.id))
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.fecha < a.fecha ? -1 : b.fecha > a.fecha ? 1 : 0))
}

async function addTx(e) {
  e.preventDefault()
  const btn  = document.getElementById('f-btn')
  const tipo = document.querySelector('input[name="tipo"]:checked').value
  btn.disabled    = true
  btn.textContent = 'Guardando...'
  try {
    await addDoc(collection(store, 'transacciones'), {
      userId:      ME.id,
      tipo,
      categoria:   document.getElementById('f-cat').value,
      descripcion: document.getElementById('f-desc').value.trim(),
      monto:       +document.getElementById('f-monto').value,
      fecha:       document.getElementById('f-fecha').value,
    })
    const d = new Date(document.getElementById('f-fecha').value + 'T12:00:00')
    VIEW.mes  = d.getMonth() + 1
    VIEW.anio = d.getFullYear()
    await showDashboard()
  } catch (err) {
    btn.disabled    = false
    btn.textContent = tipo === 'gasto' ? '+ Agregar gasto' : '+ Agregar ingreso'
    if (err.code === 'permission-denied') {
      alert('Sin permiso en Firestore.\nActualiza las reglas en Firebase Console → Firestore → Reglas.')
    } else {
      alert('Error al guardar: ' + err.message)
    }
  }
}

async function deleteTx(id) {
  if (!confirm('¿Eliminar esta transacción?')) return
  try {
    await deleteDoc(doc(store, 'transacciones', id))
    await showDashboard()
  } catch (err) {
    alert('Error al eliminar: ' + err.message)
  }
}

// ── Compute ───────────────────────────────────────────────────────────────────
function filterTxs(all) {
  return all.filter(t => {
    const d = new Date(t.fecha + 'T12:00:00')
    return d.getMonth() + 1 === VIEW.mes && d.getFullYear() === VIEW.anio
  })
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

function monthlyData(all) {
  const m = {}
  all.forEach(t => {
    const k = t.fecha.slice(0, 7)
    if (!m[k]) m[k] = { ingreso: 0, gasto: 0 }
    m[k][t.tipo] += t.monto
  })
  const labels = Object.keys(m).sort()
  return { labels, ingresos: labels.map(l => m[l].ingreso), gastos: labels.map(l => m[l].gasto) }
}

// ── Charts ────────────────────────────────────────────────────────────────────
function destroyCharts() {
  Object.values(CHARTS).forEach(c => { try { c.destroy() } catch (_) {} })
  CHARTS = {}
}

function initCharts(cats, all) {
  if (cats.length) {
    CHARTS.donut = new Chart(document.getElementById('c-cats'), {
      type: 'doughnut',
      data: {
        labels:   cats.map(c => c[0]),
        datasets: [{ data: cats.map(c => c[1]), backgroundColor: COLORS, borderWidth: 2, borderColor: '#1e293b' }],
      },
      options: { plugins: { legend: { position: 'right', labels: { color: '#94a3b8', padding: 12, boxWidth: 12 } }, tooltip: { callbacks: { label: ctx => ' ' + ctx.label + ': ' + fmt(ctx.parsed) } } }, cutout: '65%' },
    })
  }
  const md = monthlyData(all)
  if (md.labels.length) {
    CHARTS.bar = new Chart(document.getElementById('c-monthly'), {
      type: 'bar',
      data: { labels: md.labels, datasets: [
        { label: 'Ingresos', data: md.ingresos, backgroundColor: '#22c55e', borderRadius: 6 },
        { label: 'Gastos',   data: md.gastos,   backgroundColor: '#ef4444', borderRadius: 6 },
      ]},
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: '#94a3b8' } },
          tooltip: { callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + fmt(ctx.parsed.y) } },
        },
        scales: {
          x: { ticks: { color: '#64748b', callback: (_, i) => fmtMes(md.labels[i]) }, grid: { color: '#1e293b' } },
          y: { beginAtZero: true, ticks: { color: '#64748b', callback: v => fmt(v) }, grid: { color: '#334155' } },
        },
      },
    })
  }
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function updateFormCats(radio) {
  document.getElementById('f-cat').innerHTML = CATS[radio.value].map(c => `<option>${c}</option>`).join('')
  const btn = document.getElementById('f-btn')
  btn.textContent = radio.value === 'gasto' ? '+ Agregar gasto' : '+ Agregar ingreso'
  btn.className   = radio.value === 'gasto' ? 'btn-primary'     : 'btn-success'
}

function setMes(v)  { VIEW.mes  = +v; showDashboard() }
function setAnio(v) { VIEW.anio = +v; showDashboard() }

// ── Render: Auth ──────────────────────────────────────────────────────────────
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
            <div class="field"><label>Correo electrónico</label>
              <input type="email" id="l-email" placeholder="tu@correo.com" required autofocus></div>
            <div class="field"><label>Contraseña</label>
              <input type="password" id="l-pass" placeholder="••••••••" required></div>
            <button type="submit" class="btn-auth">Iniciar sesión</button>
          </form>
          <p class="auth-switch">¿No tienes cuenta?
            <a href="#" onclick="showAuth('register');return false">Regístrate gratis →</a></p>
        ` : `
          <form class="auth-form" onsubmit="register(event)">
            <div class="field"><label>Nombre</label>
              <input type="text" id="r-nombre" placeholder="Tu nombre" required autofocus></div>
            <div class="field"><label>Correo electrónico</label>
              <input type="email" id="r-email" placeholder="tu@correo.com" required></div>
            <div class="field"><label>Contraseña</label>
              <input type="password" id="r-pass" placeholder="Mínimo 6 caracteres" required></div>
            <div class="field"><label>Confirmar contraseña</label>
              <input type="password" id="r-confirm" placeholder="Repite la contraseña" required></div>
            <button type="submit" class="btn-auth">Crear cuenta</button>
          </form>
          <p class="auth-switch">¿Ya tienes cuenta?
            <a href="#" onclick="showAuth('login');return false">← Inicia sesión</a></p>
        `}
      </div>
    </div>
  `
}

// ── Render: Error (siempre muestra opciones de navegación) ────────────────────
function showError(err) {
  destroyCharts()
  const isPerm = err.code === 'permission-denied' || (err.message && err.message.includes('permission'))
  document.getElementById('root').innerHTML = `
    <div class="loading-screen" style="gap:1.5rem;padding:2rem;text-align:center">
      <div style="font-size:2.5rem">⚠️</div>
      <div style="max-width:440px">
        <p style="color:var(--red);font-weight:700;font-size:1.05rem;margin-bottom:0.7rem">
          ${isPerm ? 'Sin permiso en Firestore' : 'Error al cargar datos'}
        </p>
        <p style="color:var(--muted);font-size:0.87rem;line-height:1.7">
          ${isPerm
            ? `Las reglas de Firestore bloquean el acceso.<br><br>
               Ve a <strong style="color:var(--text)">Firebase Console → Firestore Database → Reglas</strong>
               y reemplaza todo el contenido por:<br><br>
               <code style="display:block;background:#0a0f1e;padding:0.6rem 0.8rem;border-radius:6px;font-size:0.78rem;text-align:left;line-height:1.8">
                 rules_version = '2';<br>
                 service cloud.firestore {<br>
                 &nbsp;&nbsp;match /databases/{database}/documents {<br>
                 &nbsp;&nbsp;&nbsp;&nbsp;match /{document=**} {<br>
                 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;allow read, write: if request.auth != null;<br>
                 &nbsp;&nbsp;&nbsp;&nbsp;}<br>
                 &nbsp;&nbsp;}<br>
                 }
               </code>`
            : `<span style="color:var(--red);font-size:0.82rem">${err.message}</span>`
          }
        </p>
      </div>
      <div style="display:flex;gap:0.7rem;flex-wrap:wrap;justify-content:center;margin-top:0.4rem">
        <button onclick="showDashboard()" style="background:var(--accent);color:#fff;border:none;border-radius:8px;padding:0.55rem 1.4rem;cursor:pointer;font-size:0.9rem;font-weight:600">
          Reintentar
        </button>
        <button onclick="logout()" style="background:var(--panel);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:0.55rem 1.4rem;cursor:pointer;font-size:0.9rem;font-weight:600">
          Cerrar sesión
        </button>
      </div>
    </div>`
}

// ── Render: Dashboard ─────────────────────────────────────────────────────────
async function showDashboard() {
  destroyCharts()
  document.getElementById('root').innerHTML =
    `<div class="loading-screen"><div class="loading-spinner"></div><p>Cargando...</p></div>`
  try {
    const all  = await loadAllTxs()
    const txs  = filterTxs(all)
    const tot  = totals(txs)
    const cats = catData(txs)
    const hoy  = new Date().toISOString().slice(0, 10)
    const { mes, anio } = VIEW
    const mesOpts  = MESES.map((n, i) => `<option value="${i+1}"${i+1===mes?' selected':''}>` + n + '</option>').join('')
    const anioOpts = [2023,2024,2025,2026,2027].map(y => `<option value="${y}"${y===anio?' selected':''}>${y}</option>`).join('')
    const balCls   = tot.balance >= 0 ? 'positivo' : 'negativo'
    const inicial  = (ME.nombre || ME.email || '?')[0].toUpperCase()

    const rows = txs.length
      ? txs.map(t => `
          <tr>
            <td class="td-fecha">${t.fecha}</td>
            <td><span class="badge ${t.tipo}">${t.tipo}</span></td>
            <td>${t.categoria}</td>
            <td class="td-desc">${t.descripcion || '—'}</td>
            <td class="right monto-${t.tipo}">${fmt(t.monto)}</td>
            <td><button class="btn-del" title="Eliminar" onclick="deleteTx('${t.id}')">🗑</button></td>
          </tr>`).join('')
      : `<tr><td colspan="6" class="empty-row">No hay transacciones este mes.</td></tr>`

    document.getElementById('root').innerHTML = `
      <nav class="navbar">
        <div class="nav-brand">💰 GastoApp</div>
        <div class="nav-right">
          <div class="nav-filter">
            <select onchange="setMes(this.value)">${mesOpts}</select>
            <select onchange="setAnio(this.value)">${anioOpts}</select>
          </div>
          <div class="nav-user">
            <span class="avatar">${inicial}</span>
            <span class="nav-nombre">${ME.nombre || ME.email}</span>
            <a href="#" class="btn-logout" onclick="logout();return false">Salir</a>
          </div>
        </div>
      </nav>

      <main class="app-main">
        <section class="cards">
          <div class="card ingreso">
            <div class="card-icon">↑</div>
            <div class="card-info"><span class="card-label">Ingresos</span><span class="card-monto">${fmt(tot.ingresos)}</span></div>
          </div>
          <div class="card gasto">
            <div class="card-icon">↓</div>
            <div class="card-info"><span class="card-label">Gastos</span><span class="card-monto">${fmt(tot.gastos)}</span></div>
          </div>
          <div class="card balance ${balCls}">
            <div class="card-icon">=</div>
            <div class="card-info"><span class="card-label">Balance</span><span class="card-monto">${fmt(tot.balance)}</span></div>
          </div>
        </section>

        <div class="grid-2">
          <section class="panel">
            <h2 class="panel-title">Nueva transacción</h2>
            <form onsubmit="addTx(event)">
              <div class="tipo-toggle">
                <label class="toggle-opt gasto-opt"><input type="radio" name="tipo" value="gasto" checked onchange="updateFormCats(this)"><span>Gasto</span></label>
                <label class="toggle-opt ingreso-opt"><input type="radio" name="tipo" value="ingreso" onchange="updateFormCats(this)"><span>Ingreso</span></label>
              </div>
              <div class="field"><label>Categoría</label>
                <select id="f-cat">${CATS.gasto.map(c => `<option>${c}</option>`).join('')}</select></div>
              <div class="field"><label>Descripción <small>(opcional)</small></label>
                <input type="text" id="f-desc" placeholder="Ej: almuerzo con amigos" maxlength="100"></div>
              <div class="field-row">
                <div class="field"><label>Monto</label>
                  <input type="number" id="f-monto" step="0.01" min="0.01" required placeholder="0.00"></div>
                <div class="field"><label>Fecha</label>
                  <input type="date" id="f-fecha" value="${hoy}" required></div>
              </div>
              <button type="submit" class="btn-primary" id="f-btn">+ Agregar gasto</button>
            </form>
          </section>

          <section class="panel">
            <h2 class="panel-title">Gastos por categoría</h2>
            ${cats.length
              ? `<div class="chart-wrap"><canvas id="c-cats"></canvas></div>`
              : `<div class="empty-state"><span class="empty-icon">📊</span><p>Sin gastos este mes</p></div>`}
          </section>
        </div>

        <section class="panel">
          <h2 class="panel-title">Evolución mensual</h2>
          <div class="chart-wrap-wide"><canvas id="c-monthly"></canvas></div>
        </section>

        <section class="panel">
          <h2 class="panel-title">Transacciones del mes</h2>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Descripción</th><th class="right">Monto</th><th></th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </section>
      </main>
    `
    initCharts(cats, all)
  } catch (err) {
    showError(err)
  }
}

// ── Expose to window (requerido para inline onclick con type="module") ────────
window.register       = register
window.login          = login
window.logout         = logout
window.addTx          = addTx
window.deleteTx       = deleteTx
window.updateFormCats = updateFormCats
window.setMes         = setMes
window.setAnio        = setAnio
window.showAuth       = showAuth
window.showDashboard  = showDashboard

// ── Bootstrap ─────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, user => {
  if (user) {
    ME = { id: user.uid, nombre: user.displayName || '', email: user.email }
    showDashboard()
  } else {
    ME = null
    showAuth('login')
  }
})
