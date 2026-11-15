'use strict';
// =====================================================================
//  Mis Finanzas · PWA
// =====================================================================

// ---------- Utilidades ----------
const $ = id => document.getElementById(id);
const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const f = n => (n < 0 ? '-' : '') + '$' + Math.abs(Math.round(Number(n || 0))).toLocaleString('es-AR');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const mesLargo = m => MESES[+m.slice(5) - 1] + ' ' + m.slice(0, 4);
const fmtF = d => d ? d.slice(8, 10) + '/' + d.slice(5, 7) : '';
const diasA = d => Math.round((Date.parse(d) - Date.parse(today())) / 864e5);
const addMes = (m, n) => { const [y, mm] = m.split('-').map(Number); return new Date(Date.UTC(y, mm - 1 + n, 1)).toISOString().slice(0, 7); };
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
// "45.000", "45000,50", "1,5k", "2 mil" -> número
function parseMoney(s) {
  if (typeof s === 'number') return s;
  s = String(s ?? '').trim().toLowerCase().replace(/\$|\s/g, '');
  let mult = 1;
  const m = s.match(/(k|mil|lucas|luca)$/); if (m) { mult = 1000; s = s.slice(0, -m[0].length); }
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s); return isFinite(n) ? Math.round(n * mult * 100) / 100 : 0;
}

// ---------- Íconos ----------
const I = {
  home: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
  pie: '<path d="M12 3v9l7 5"/><circle cx="12" cy="12" r="9"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  repeat: '<path d="M17 2l3 3-3 3M3 11V9a4 4 0 0 1 4-4h13M7 22l-3-3 3-3M21 13v2a4 4 0 0 1-4 4H4"/>',
  down: '<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>', up: '<path d="M12 20V8M6 14l6-6 6 6M4 4h16"/>',
  moon: '<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>', out: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>', send: '<path d="M12 19V5M5 12l7-7 7 7"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="M5 12l5 5 9-10"/>', pen: '<path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/>',
};
const ic = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;

// ---------- Datos ----------
const K = ['mov', 'deu', 'bud', 'meta', 'fij', 'ven'];
const CATS_G = ['Super', 'Hogar', 'Servicios', 'Tarjeta crédito', 'Préstamo', 'Transporte', 'Salud', 'Ocio', 'Educación', 'Ahorro', 'Otros'];
const CATS_I = ['Sueldo', 'Extra', 'Ventas', 'Reintegro', 'Otros'];
const CAT_COL = { Super: '#c96442', Hogar: '#7a6ad8', Servicios: '#2f8fb0', 'Tarjeta crédito': '#b5463a', 'Préstamo': '#8a5a3c', Transporte: '#3f8f6e', Salud: '#c2577e',
  Ocio: '#c9922f', 'Educación': '#4f6fbf', Ahorro: '#5a8a5e', Sueldo: '#5a8a5e', Extra: '#3f8f6e', Ventas: '#2f8fb0', Reintegro: '#7a6ad8', Otros: '#8a877d',
  'Otra deuda': '#8a877d' };
const EXTRA_COL = ['#c96442', '#2f8fb0', '#7a6ad8', '#c9922f', '#3f8f6e', '#c2577e', '#4f6fbf', '#8a5a3c'];
const catCol = c => CAT_COL[c] || EXTRA_COL[[...String(c)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % EXTRA_COL.length];
const GUESS = [
  [/super|mercado|chino|verdu|carnic|almac|coto|carrefour|jumbo/, 'Super'], [/\bluz\b|edenor|edesur|\bagua\b|\bgas\b|internet|wifi|celu|movistar|personal|claro|cable|netflix|spotify|disney|youtube/, 'Servicios'],
  [/alquiler|expensa|mueble|ferret|limpieza/, 'Hogar'], [/nafta|combust|sube|uber|cabify|didi|colectivo|tren|taxi|remis|peaje/, 'Transporte'],
  [/farmac|medic|doctor|obra social|prepaga|osde|dentist|analisis/, 'Salud'], [/tarjeta|visa|master|amex|naranja/, 'Tarjeta crédito'],
  [/prestamo|préstamo|cuota/, 'Préstamo'], [/cine|salida|\bbar\b|birra|resto|pizza|delivery|pedidos|rappi|helado|cafe|café/, 'Ocio'],
  [/curso|facu|colegio|escuela|libro|udemy/, 'Educación'], [/ahorro|plazo fijo|dolar|dólar/, 'Ahorro'],
  [/sueldo|salario|aguinaldo|haberes/, 'Sueldo'], [/venta|vendi|vendí/, 'Ventas'], [/reintegro|devoluc/, 'Reintegro'], [/extra|changa|freelance|cobr/, 'Extra'],
];
const INGRESO_RE = /^\s*\+|sueldo|salario|aguinaldo|haberes|cobr|venta|vendi|vendí|reintegro|devoluc|ingreso|changa|freelance/;

const TABS = [['res', 'Resumen', 'home'], ['mov', 'Movimientos', 'list'], ['ven', 'Vencimientos', 'bell'], ['graf', 'Gráficos', 'chart'],
  ['deu', 'Tarjetas y préstamos', 'card'], ['bud', 'Presupuesto', 'pie'], ['meta', 'Metas', 'flag'], ['fij', 'Gastos fijos', 'repeat'], ['auto', 'Carga automática', 'bolt']];
const empty = () => ({ mov: [], deu: [], bud: [], meta: [], fij: [], ven: [] });
let S = empty(), user = null, tab = ls.get('fin_tab', 'res'), mes = today().slice(0, 7), filtro = 'todos';
if (!TABS.some(t => t[0] === tab)) tab = 'res';

const find = (k, id) => S[k].find(x => x.id === id);
const fechaMov = m => m.fecha || (m.mes + '-01');
const M = () => S.mov.filter(m => m.mes === mes);
const sum = (a, t) => a.filter(m => m.tipo === t).reduce((s, m) => s + (+m.monto || 0), 0);
const defFecha = () => today().startsWith(mes) ? today() : mes + '-01';

// ---------- Supabase + cola offline ----------
const configured = window.SUPABASE_URL && !/PEGAR/.test(window.SUPABASE_URL) && window.supabase;
const sb = configured ? supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY) : null;
let queue = ls.get('fin_queue', []), flushing = false, lastErr = '';

function status(t) {
  const el = $('st'); if (!el || !user) return;
  const n = queue.length;
  let cls = '', txt = 'Sincronizado';
  if (t === 'busy') { cls = 'busy'; txt = 'Guardando…'; }
  else if (lastErr) { cls = 'err'; txt = 'Error al guardar'; }
  else if (n) { cls = 'off'; txt = (navigator.onLine ? '' : 'Sin conexión · ') + `${n} pendiente${n > 1 ? 's' : ''}`; }
  else if (!navigator.onLine) { cls = 'off'; txt = 'Sin conexión'; }
  el.className = 'sync ' + cls; el.innerHTML = `<span>${txt}</span>`; el.title = lastErr || txt;
}
const cacheKey = () => 'fin_cache_' + (user?.id || '');
const persist = () => { ls.set('fin_queue', queue); if (user) ls.set(cacheKey(), S); };

function enqueue(op) { queue.push(op); persist(); flush(); }
async function flush() {
  if (flushing || !sb || !user) return; flushing = true; status('busy');
  try {
    while (queue.length) {
      const op = queue[0];
      const r = op.t === 'up' ? await sb.from('items').upsert(op.rows) : await sb.from('items').delete().eq('id', op.id);
      if (r.error) {
        const net = !navigator.onLine || /fetch|network|timeout|load failed/i.test(r.error.message || '');
        if (net) break; // se reintenta cuando vuelve la conexión
        lastErr = r.error.message; toast('No se pudo guardar: ' + r.error.message);
      } else lastErr = '';
      queue.shift(); persist();
    }
  } catch { /* sin red: queda en cola */ }
  flushing = false; status();
}
addEventListener('online', () => { flush().then(load); });
addEventListener('offline', () => status());

const sig = st => JSON.stringify(K.map(k => st[k].map(x => JSON.stringify(x)).sort()));
async function load() {
  if (!sb || !user) return;
  await flush();
  if (queue.length) return; // hay cambios sin subir: no pisar lo local
  const { data, error } = await sb.from('items').select('id,k,data');
  if (error) { status(); return; }
  const n = empty();
  data.forEach(r => { if (n[r.k]) n[r.k].push({ ...r.data, id: r.id, k: r.k }); });
  const changed = sig(n) !== sig(S);
  S = n; persist(); status();
  if (changed) render(); // solo redibuja si cambió algo (no pisa lo que estás escribiendo)
  avisarLocal();
}
function put(k, o, quiet) {
  o = { ...o, k, id: o.id || k + '_' + uid() };
  const i = S[k].findIndex(x => x.id === o.id); i < 0 ? S[k].push(o) : (S[k][i] = o);
  enqueue({ t: 'up', rows: [{ id: o.id, k, data: o, user_id: user.id }] });
  if (!quiet) render();
  return o;
}
function del(k, id) {
  const o = find(k, id); if (!o) return;
  S[k] = S[k].filter(x => x.id !== id);
  enqueue({ t: 'del', id }); render();
  toast('Eliminado', 'Deshacer', () => put(k, o));
}

// ---------- Toast ----------
let toastT;
function toast(msg, action, fn) {
  const t = $('toast');
  t.innerHTML = `<span>${e(msg)}</span>${action ? `<button>${e(action)}</button>` : ''}`;
  if (action) t.querySelector('button').onclick = () => { t.classList.remove('show'); fn(); };
  t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), action ? 5000 : 2600);
}

// ---------- Auth ----------
let recovering = false;
function authView(msg = '', mode = 'in') {
  document.body.classList.remove('drawer');
  $('side').hidden = true; $('fab').hidden = true; $('mesNav').hidden = true; $('st').innerHTML = ''; $('st').className = '';
  if (!configured) { $('app').innerHTML = `<div class="auth"><div class="logo">$</div><h1>Mis Finanzas</h1><p class="lead">No se pudo conectar. Revisá tu conexión a internet y volvé a abrir la app.</p></div>`; return; }
  const body = mode === 'reset'
    ? `<input class="in" name="email" type="email" placeholder="Tu email" autocomplete="email" required>
       <button class="btn p" name="a" value="reset">Enviarme un link</button>
       <button type="button" class="link" data-act="auth" data-m="in">Volver</button>`
    : mode === 'newpass'
    ? `<input class="in" name="pass" type="password" placeholder="Nueva contraseña (mín. 6)" autocomplete="new-password" minlength="6" required>
       <button class="btn p" name="a" value="newpass">Guardar contraseña</button>`
    : `<input class="in" name="email" type="email" placeholder="Email" autocomplete="email" required>
       <input class="in" name="pass" type="password" placeholder="Contraseña" autocomplete="current-password" minlength="6" required>
       <button class="btn p" name="a" value="in">Ingresar</button>
       <button class="btn" name="a" value="up">Crear cuenta</button>
       <button type="button" class="link" data-act="auth" data-m="reset">¿Olvidaste tu contraseña?</button>`;
  const lead = mode === 'newpass' ? 'Elegí una contraseña nueva.' : mode === 'reset' ? 'Te mandamos un link para cambiarla.' : 'Tus ingresos, gastos y vencimientos, en un solo lugar.';
  $('app').innerHTML = `<div class="auth"><div class="logo">$</div><h1>Mis Finanzas</h1><p class="lead">${lead}</p>
    <form id="authF">${body}</form><div class="msg mu">${e(msg)}</div></div>`;
  $('authF').onsubmit = login;
}
async function login(ev) {
  ev.preventDefault();
  const fd = new FormData(ev.target), a = ev.submitter?.value || (fd.has('email') ? (fd.has('pass') ? 'in' : 'reset') : 'newpass');
  const btn = ev.submitter; if (btn) { btn.disabled = true; btn.textContent = 'Un momento…'; }
  const email = fd.get('email'), password = fd.get('pass'), back = location.origin + location.pathname;
  let r;
  if (a === 'up') r = await sb.auth.signUp({ email, password, options: { emailRedirectTo: back } });
  else if (a === 'reset') r = await sb.auth.resetPasswordForEmail(email, { redirectTo: back });
  else if (a === 'newpass') r = await sb.auth.updateUser({ password });
  else r = await sb.auth.signInWithPassword({ email, password });
  if (r.error) return authView(traducir(r.error.message), a === 'up' ? 'in' : a);
  if (a === 'up' && !r.data.session) authView('Te mandamos un email para confirmar la cuenta. Confirmá y después ingresá.');
  if (a === 'reset') authView('Listo: revisá tu email y tocá el link.', 'reset');
  if (a === 'newpass') { recovering = false; render(); toast('Contraseña actualizada'); }
}
const traducir = m => /invalid login/i.test(m) ? 'Email o contraseña incorrectos.' : /not confirmed/i.test(m) ? 'Tenés que confirmar tu email primero.'
  : /already registered/i.test(m) ? 'Ese email ya tiene cuenta. Ingresá.' : /rate limit/i.test(m) ? 'Demasiados intentos, esperá un rato.'
  : /fetch|network/i.test(m) ? 'Sin conexión. Probá de nuevo.' : m;

// ---------- Estructura ----------
function shell() {
  $('side').hidden = false; $('fab').hidden = false;
  $('mesNav').hidden = !['res', 'mov', 'graf', 'bud'].includes(tab);
  const actual = mes === today().slice(0, 7);
  $('mesLbl').textContent = mesLargo(mes); $('mesLbl').title = actual ? '' : 'Volver al mes actual';
  $('mesLbl').style.color = actual ? '' : 'var(--ac)';
  const urg = S.ven.filter(x => !x.pagado && diasA(x.fecha) <= (x.aviso || 0)).length;
  $('nav').innerHTML = TABS.map(([k, t, i]) => `<button class="${k === tab ? 'on' : ''}" data-act="tab" data-tab="${k}">${ic(i)}<span>${t}</span>${k === 'ven' && urg ? `<span class="n">${urg}</span>` : ''}</button>`).join('');
  const th = document.documentElement.dataset.theme || 'auto';
  $('sideFoot').innerHTML = `
    <button data-act="theme">${ic('moon')}Tema: ${th === 'dark' ? 'oscuro' : th === 'light' ? 'claro' : 'automático'}</button>
    <button data-act="export">${ic('down')}Exportar copia</button>
    <button data-act="import">${ic('up')}Importar copia</button>
    <button data-act="logout">${ic('out')}Cerrar sesión</button>
    <div class="who"><b>${e((user.email || '?')[0])}</b><span>${e(user.email || '')}</span></div>`;
}
function render() {
  disposeCharts();
  if (!user) return authView();
  if (recovering) return authView('', 'newpass');
  shell(); status();
  $('app').innerHTML = V[tab]();
  if (tab === 'graf') drawCharts();
  if (tab === 'auto' && autoTok === undefined) autoCargar();
}

// ---------- Componentes ----------
const av = c => `<span class="av" style="--c:${catCol(c)}">${e((c || '?').slice(0, 1).toUpperCase())}</span>`;
const bar = (v, m, c) => `<div class="b"><i style="width:${m > 0 ? Math.min(100, Math.max(0, v) / m * 100) : 0}%;background:${c}"></i></div>`;
const emptyBox = (t, s) => `<div class="list"><div class="empty"><b>${t}</b>${s}</div></div>`;
const estadoV = d => d < 0 ? `<span class="pill bad">Vencido hace ${-d} d</span>` : d === 0 ? '<span class="pill bad">Vence hoy</span>'
  : d === 1 ? '<span class="pill wn">Mañana</span>' : d <= 5 ? `<span class="pill wn">En ${d} días</span>` : `<span class="pill">En ${d} días</span>`;
const movRow = x => `<div class="item" data-act="edit" data-k="mov" data-id="${e(x.id)}">${av(x.cat)}
  <div class="grow"><div class="t">${e(x.concepto)}</div><div class="s">${e(x.cat)} · ${x.fecha ? fmtF(x.fecha) : mesLargo(x.mes)}${x.auto ? ' · ⚡ ' + e(x.auto) : ''}</div></div>
  <div class="r"><span class="amt ${x.tipo === 'ingreso' ? 'ok' : ''}">${x.tipo === 'ingreso' ? '+' : '−'}${f(x.monto)}</span>
  <button class="pill ${x.estado === 'Pendiente' ? 'wn' : ''}" data-act="toggle" data-id="${e(x.id)}" title="Cambiar estado">${x.estado === 'Pendiente' ? 'Pendiente' : 'Pagado'}</button></div></div>`;
const venRow = x => `<div class="item" data-act="edit" data-k="ven" data-id="${e(x.id)}">${av(x.cat)}
  <div class="grow"><div class="t">${e(x.concepto)}</div><div class="s">${fmtF(x.fecha)} · ${x.rep === 'mensual' ? 'mensual' : 'una vez'} · aviso ${x.aviso || 0} d</div></div>
  <div class="r"><span class="amt">${f(x.monto)}</span>${x.pagado ? '<span class="pill ok">Pagado</span>' : `<span style="display:flex;gap:6px">${estadoV(diasA(x.fecha))}<button class="pill ok" data-act="pagarV" data-id="${e(x.id)}">Pagar</button></span>`}</div></div>`;
const head = (t, s, btn) => `<h1>${t}</h1>${s ? `<p class="lead">${s}</p>` : ''}${btn || ''}`;
function saludo() { const h = new Date().getHours(); return h < 6 ? 'Buenas noches' : h < 13 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches'; }
function alertas() {
  const l = S.ven.filter(x => !x.pagado && diasA(x.fecha) <= (x.aviso || 0)).sort((a, b) => a.fecha.localeCompare(b.fecha));
  return l.length ? `<h2>Vencimientos próximos</h2><div class="list alert">${l.map(venRow).join('')}</div>` : '';
}

// ---------- Vistas ----------
const V = {
  res() {
    const m = M(), ing = sum(m, 'ingreso'), gas = sum(m, 'gasto'), bal = ing - gas;
    const penMov = m.filter(x => x.tipo === 'gasto' && x.estado === 'Pendiente').reduce((s, x) => s + x.monto, 0);
    const penVen = S.ven.filter(x => !x.pagado && x.fecha?.startsWith(mes)).reduce((s, x) => s + x.monto, 0);
    const deuda = S.deu.reduce((s, d) => s + d.saldo, 0);
    const bc = {}; m.filter(x => x.tipo === 'gasto').forEach(x => bc[x.cat] = (bc[x.cat] || 0) + x.monto);
    const cats = Object.entries(bc).sort((a, b) => b[1] - a[1]);
    const ult5 = [...m].sort((a, b) => fechaMov(b).localeCompare(fechaMov(a))).slice(0, 5);
    const name = (user.email || '').split('@')[0].split(/[._\d-]/)[0];
    const actual = mes === today().slice(0, 7);
    return `<h1>${actual ? saludo() + (name ? ', ' + e(name[0].toUpperCase() + name.slice(1)) : '') : 'Resumen'}</h1><p class="lead">${actual ? 'Así viene' : 'Así fue'} ${MESES[+mes.slice(5) - 1]}.</p>
    <div class="card hero"><div class="lbl">Balance del mes</div><div class="big ${bal < 0 ? 'bad' : ''}">${f(bal)}</div>
      <div class="split"><span><i class="dot" style="background:var(--ok)"></i>Ingresos <b>${f(ing)}</b></span><span><i class="dot" style="background:var(--ac)"></i>Gastos <b>${f(gas)}</b></span></div>
      ${ing ? bar(gas, ing, gas > ing ? 'var(--bad)' : 'var(--ac)') + `<small>Gastaste el ${Math.round(gas / ing * 100)}% de lo que ingresó</small>` : ''}</div>
    <div class="stats"><div class="stat"><small>Por pagar este mes</small><b class="wn">${f(penMov + penVen)}</b></div>
      <div class="stat"><small>Deuda total</small><b>${f(deuda)}</b></div>
      <div class="stat"><small>Ahorrado en metas</small><b class="ok">${f(S.meta.reduce((s, x) => s + x.ahorrado, 0))}</b></div></div>
    ${alertas()}
    <h2>Gastos por categoría</h2>
    ${cats.length ? `<div class="list">${cats.map(([c, v]) => { const b = S.bud.find(x => x.cat === c), over = b && v > b.limite;
      return `<div class="prog" data-act="filtcat" data-cat="${e(c)}"><div class="row"><span style="display:flex;align-items:center;gap:10px">${av(c)}${e(c)}</span><span class="amt ${over ? 'bad' : ''}">${f(v)} <small>${b ? '/ ' + f(b.limite) : Math.round(v / gas * 100) + '%'}</small></span></div>${bar(v, b ? b.limite : gas, over ? 'var(--bad)' : catCol(c))}</div>`; }).join('')}</div>`
      : emptyBox('Sin gastos este mes', 'Tocá el botón + para cargar el primero.')}
    <h2>Últimos movimientos ${m.length > 5 ? '<button class="btn sm ghost" data-act="tab" data-tab="mov">Ver todos</button>' : ''}</h2>
    ${ult5.length ? `<div class="list">${ult5.map(movRow).join('')}</div>` : emptyBox('Todavía no hay movimientos', 'Probá escribir “super 45000” con el botón +.')}`;
  },
  mov() {
    let l = M();
    if (filtro === 'gasto' || filtro === 'ingreso') l = l.filter(x => x.tipo === filtro);
    else if (filtro === 'pend') l = l.filter(x => x.estado === 'Pendiente');
    else if (filtro.startsWith('cat:')) l = l.filter(x => x.cat === filtro.slice(4));
    l.sort((a, b) => fechaMov(b).localeCompare(fechaMov(a)) || (b.tipo === 'ingreso') - (a.tipo === 'ingreso'));
    const chip = (k, t) => `<button class="chip ${filtro === k ? 'on' : ''}" data-act="filtro" data-f="${e(k)}">${e(t)}</button>`;
    return head('Movimientos', '') + `<div class="chips">${chip('todos', 'Todos')}${chip('gasto', 'Gastos')}${chip('ingreso', 'Ingresos')}${chip('pend', 'Pendientes')}${filtro.startsWith('cat:') ? chip(filtro, filtro.slice(4) + '  ✕') : ''}</div>
      <div class="tot"><span>Ingresos <b>${f(sum(l, 'ingreso'))}</b></span><span>Gastos <b>${f(sum(l, 'gasto'))}</b></span><span>${l.length} movimiento${l.length === 1 ? '' : 's'}</span></div>
      ${l.length ? `<div class="list">${l.map(movRow).join('')}</div>` : emptyBox('No hay movimientos', 'Usá el botón + para agregar uno.')}`;
  },
  ven() {
    const l = [...S.ven].sort((a, b) => (a.pagado ? 1 : 0) - (b.pagado ? 1 : 0) || a.fecha.localeCompare(b.fecha));
    return head('Vencimientos', 'Te aviso con la anticipación que elijas, aunque la app esté cerrada.') + pushBox() +
      `<h2>Próximos</h2>${l.length ? `<div class="list">${l.map(venRow).join('')}</div>` : emptyBox('Sin vencimientos', 'Cargá tarjetas, servicios o cuotas con el botón +.')}`;
  },
  deu() {
    return head('Tarjetas y préstamos', 'Lo que debés y cuánto vas pagando.') + (S.deu.length ? `<div class="grid2">${S.deu.map(d => {
      const ini = Math.max(d.inicial || 0, d.saldo), pag = ini - d.saldo;
      return `<div class="card dcard"><div class="row"><span style="display:flex;gap:10px;align-items:center;min-width:0">${av(d.tipo)}<span style="min-width:0"><div class="t">${e(d.nombre)}</div><div class="s">${e(d.tipo)}${d.cuota ? ' · cuota ' + f(d.cuota) : ''}</div></span></span>
        <button class="icon" data-act="edit" data-k="deu" data-id="${e(d.id)}" aria-label="Editar">${ic('pen')}</button></div>
        <div class="big" style="font-size:30px;margin:14px 0 4px">${f(d.saldo)}</div><small>Pagado ${f(pag)} de ${f(ini)}</small>${bar(pag, ini, 'var(--ok)')}
        <div class="acts"><button class="btn p sm" data-act="pago" data-id="${e(d.id)}" ${d.saldo > 0 ? '' : 'disabled'}>${d.saldo > 0 ? 'Registrar pago' : '¡Saldada!'}</button></div></div>`; }).join('')}</div>`
      : emptyBox('Sin deudas cargadas', 'Agregá tus tarjetas o préstamos con el botón +.'));
  },
  bud() {
    const bc = {}; M().filter(x => x.tipo === 'gasto').forEach(x => bc[x.cat] = (bc[x.cat] || 0) + x.monto);
    const tl = S.bud.reduce((s, b) => s + b.limite, 0), tg = S.bud.reduce((s, b) => s + (bc[b.cat] || 0), 0);
    return head('Presupuesto', 'Un límite mensual por categoría.') + (S.bud.length ? `<div class="tot"><span>Usado <b>${f(tg)}</b> de <b>${f(tl)}</b></span></div><div class="list">${S.bud.map(b => { const v = bc[b.cat] || 0, over = v > b.limite;
      return `<div class="prog" data-act="edit" data-k="bud" data-id="${e(b.id)}"><div class="row"><span style="display:flex;align-items:center;gap:10px">${av(b.cat)}${e(b.cat)}</span><span class="amt ${over ? 'bad' : ''}">${f(v)} <small>/ ${f(b.limite)}</small></span></div>${bar(v, b.limite, over ? 'var(--bad)' : 'var(--ok)')}${over ? `<small class="bad">Te pasaste ${f(v - b.limite)}</small>` : `<small>Te quedan ${f(b.limite - v)}</small>`}</div>`; }).join('')}</div>`
      : emptyBox('Sin límites', 'Definí cuánto querés gastar por categoría con el botón +.'));
  },
  meta() {
    return head('Metas', 'Lo que estás juntando.') + (S.meta.length ? `<div class="grid2">${S.meta.map(x => `<div class="card dcard"><div class="row"><div class="t" style="font:500 17px var(--serif)">${e(x.nombre)}</div>
      <button class="icon" data-act="edit" data-k="meta" data-id="${e(x.id)}" aria-label="Editar">${ic('pen')}</button></div>
      <div class="big" style="font-size:30px;margin:10px 0 4px">${f(x.ahorrado)}</div><small>de ${f(x.objetivo)} · ${x.objetivo ? Math.min(100, Math.round(x.ahorrado / x.objetivo * 100)) : 0}%</small>${bar(x.ahorrado, x.objetivo, 'var(--ok)')}
      <div class="acts"><button class="btn p sm" data-act="aporte" data-id="${e(x.id)}">Aportar</button></div></div>`).join('')}</div>`
      : emptyBox('Sin metas', 'Creá una con el botón +, por ejemplo “Fondo de emergencia”.'));
  },
  fij() {
    const hecho = S.fij.length && S.fij.every(x => S.mov.some(m => m.fid === x.id && m.mes === mes));
    return head('Gastos fijos', 'Lo que se repite todos los meses. Aplicalo y se cargan como pendientes en el mes elegido.',
      S.fij.length ? `<div class="row" style="justify-content:flex-start;flex-wrap:wrap;margin-bottom:6px"><button class="btn ${hecho ? '' : 'p'}" data-act="aplicar" ${hecho ? 'disabled' : ''}>${ic(hecho ? 'check' : 'plus')}${hecho ? 'Ya aplicados a ' : 'Aplicar a '}${mesLargo(mes)}</button>
      <span style="display:flex;align-items:center"><button class="icon" data-act="mes" data-d="-1" aria-label="Mes anterior"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button><button class="icon" data-act="mes" data-d="1" aria-label="Mes siguiente"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button></span></div>` : '') +
      (S.fij.length ? `<h2>Plantilla</h2><div class="list">${S.fij.map(x => `<div class="item" data-act="edit" data-k="fij" data-id="${e(x.id)}">${av(x.cat)}<div class="grow"><div class="t">${e(x.concepto)}</div><div class="s">${e(x.cat)}</div></div><div class="r"><span class="amt ${x.tipo === 'ingreso' ? 'ok' : ''}">${x.tipo === 'ingreso' ? '+' : '−'}${f(x.monto)}</span></div></div>`).join('')}</div>`
      : emptyBox('Sin gastos fijos', 'Cargá alquiler, servicios, sueldo… con el botón +.'));
  },
  auto() {
    const url = window.SUPABASE_URL + '/functions/v1/ingesta' + (autoTok ? '?t=' + autoTok : '');
    const val = (t, v, mono) => `<div class="row" style="margin:6px 0"><span class="s" style="flex:none">${t}</span><span style="display:flex;gap:6px;align-items:center;min-width:0"><code class="code" ${mono ? '' : 'style="font-family:inherit"'}>${e(v)}</code><button class="icon" style="width:32px;height:32px" data-act="copy" data-v="${e(v)}" aria-label="Copiar">${ic('copy')}</button></span></div>`;
    const step = (n, t, body = '') => `<div class="item" style="cursor:default;align-items:flex-start"><span class="av" style="--c:var(--ac)">${n}</span><div class="grow" style="white-space:normal"><div class="t" style="white-space:normal">${t}</div>${body}</div></div>`;
    return head('Carga automática', 'Cuando pagás o cobrás con Mercado Pago o MODO, el movimiento se carga solo.') +
      `<div class="card"><div class="row"><b>Últimas notificaciones recibidas</b><button class="btn sm ghost" data-act="autorefresh">Actualizar</button></div>
      ${autoLog === undefined ? '<p class="s">Cargando…</p>' : autoLog.length ? `<div style="margin-top:8px">${autoLog.map(l => `<div style="padding:8px 0;border-top:1px solid var(--bd)"><div class="row"><small>${e(l.app || '')} · ${new Date(l.at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</small></div><div style="font-size:13.5px">${e(l.texto)}</div><div class="${/^Cargado/.test(l.resultado) ? 'ok' : /^Ignorada/.test(l.resultado) ? 'mu' : /^Prueba/.test(l.resultado) ? 'ok' : 'bad'}" style="font-size:13px">${e(l.resultado)}</div></div>`).join('')}</div>`
        : '<p class="s" style="margin:8px 0 0">Todavía no llegó ninguna. Seguí los pasos de abajo y tocá “Probar conexión”.</p>'}
      <div class="acts" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn p sm" data-act="autotest" ${autoTok ? '' : 'disabled'}>Probar conexión</button></div></div>
      <h2>Opción A · Desde tus mails de Gmail (recomendada)</h2>
      <div class="list">
      ${step(1, 'Escribí tu nombre como figura en el banco (así se ignoran las transferencias entre tus cuentas):', `<input class="in" id="miNombre" placeholder="Ej. Juan Pérez" value="${e(ls.get('fin_minombre', ''))}" style="margin-top:8px">`)}
      ${step(2, 'Copiá el código, que ya lleva tu código personal:', `<button class="btn p sm" data-act="gscopy" style="margin-top:8px" ${autoTok ? '' : 'disabled'}>${ic('copy')}Copiar código</button>`)}
      ${step(3, 'Desde la computadora entrá a <b>script.google.com</b> → <b>Nuevo proyecto</b>. Borrá lo que aparece, pegá el código y guardá (💾).')}
      ${step(4, 'Arriba, en la lista de funciones, elegí <b>instalar</b> y tocá <b>▶ Ejecutar</b>.')}
      ${step(5, 'Google te va a pedir permisos: <b>Revisar permisos</b> → elegí tu cuenta → <b>Configuración avanzada</b> → <b>Ir a Proyecto sin título</b> → <b>Permitir</b>.', '<div class="s" style="white-space:normal">Aparece ese aviso porque el programa lo creaste vos y no está verificado por Google. Solo lee los mails de bancos y billeteras.</div>')}
      ${step(6, '¡Listo! Cada 5 minutos revisa tus mails y carga los pagos y transferencias. Los procesados quedan con la etiqueta “mis-finanzas”.')}
      </div>
      <h2>Opción B · Desde las notificaciones (Android + MacroDroid)</h2>
      <div class="list">
      ${step(1, 'Instalá <b>MacroDroid</b> desde Play Store (gratis) y abrilo.')}
      ${step(2, 'Tocá <b>Agregar macro</b> → Disparador <b>+</b> → <b>Aplicaciones</b> → <b>Notificación</b> → <b>Notificación recibida</b>.', '<div class="s" style="white-space:normal">Elegí las apps <b>Mercado Pago</b> y <b>MODO</b>, contenido “Cualquiera”. Si te pide permiso de acceso a notificaciones, aceptalo.</div>')}
      ${step(3, 'Acciones <b>+</b> → <b>Web / Conectividad</b> → <b>Solicitud HTTP</b>. Método <b>POST</b> y esta URL:', autoTok ? val('URL', url, true) : '<p class="s">Generando tu código…</p>')}
      ${step(4, 'En la pestaña <b>Parámetros de consulta</b> (Query params) agregá estos 3:', `${val('app', '[app_name]', true)}${val('title', '[notification_title]', true)}${val('text', '[notification]', true)}<div class="s" style="white-space:normal">Si el texto mágico no aparece igual, tocá el botón <b>…</b> de cada valor y elegí “Nombre de la app”, “Título de la notificación” y “Texto de la notificación”.</div>`)}
      ${step(5, 'Guardá la macro con un nombre (ej. “Mis Finanzas”). En Ajustes de Android → Batería, poné MacroDroid como <b>sin restricciones</b> para que no lo cierre.')}
      </div>
      <h2>Probar con una notificación de ejemplo</h2>
      <div class="card"><input class="in" id="simTxt" placeholder="Pagaste $ 5.000 a KIOSCO EL SOL" value="Pagaste $ 2.500 a CAFE MARTINEZ"><div class="s" style="margin:6px 2px 10px;white-space:normal">Ojo: si la entiende, la carga de verdad (después la podés borrar).</div><button class="btn sm" data-act="autosim" ${autoTok ? '' : 'disabled'}>Simular</button></div>
      <h2>Tu código</h2><div class="card"><div class="s" style="white-space:normal">Es privado: con él cualquiera podría cargar movimientos en tu cuenta. Si lo compartiste por error, generá uno nuevo.</div>
      ${autoTok ? val('Código', autoTok, true) : ''}<button class="btn sm danger" data-act="autoregen" style="margin-top:6px">Generar código nuevo</button></div>`;
  },
  graf() {
    const m = M(), ing = sum(m, 'ingreso'), gas = sum(m, 'gasto'), ms = ult(6);
    const ev = ms.map(x => { const a = S.mov.filter(y => y.mes === x); return { g: sum(a, 'gasto'), i: sum(a, 'ingreso') }; });
    const con = ev.filter(x => x.g || x.i), prom = con.length ? con.reduce((s, x) => s + x.g, 0) / con.length : 0;
    const box = (id, t) => `<div class="card"><h3>${t}</h3><div class="cv" id="${id}"></div><div class="lg" id="${id}_lg"></div></div>`;
    return head('Gráficos', 'Arrastrá para girar · tocá una barra o porción para ver el valor.') +
      `<div class="stats" style="margin:0 0 14px"><div class="stat"><small>Tasa de ahorro</small><b class="${ing - gas < 0 ? 'bad' : 'ok'}">${ing ? Math.round((ing - gas) / ing * 100) + '%' : '—'}</b></div>
      <div class="stat"><small>Gasto promedio 6 m</small><b>${f(prom)}</b></div><div class="stat"><small>Deuda pendiente</small><b class="wn">${f(S.deu.reduce((s, d) => s + d.saldo, 0))}</b></div></div>
      <div class="grid2">${box('ch_gas', 'Gastos por categoría')}${box('ch_ing', 'Ingresos por categoría')}${box('ch_evo', 'Últimos 6 meses')}${box('ch_deu', 'Deudas')}${box('ch_meta', 'Metas')}</div>`;
  },
};

// ---------- Hoja (agregar / editar) ----------
const FORMS = {
  mov: { t: 'movimiento', quick: true, def: () => ({ tipo: 'gasto', fecha: defFecha(), estado: 'Pagado', cat: 'Super' }),
    f: [['tipo', 'seg', '', [['gasto', 'Gasto'], ['ingreso', 'Ingreso']]], ['monto', 'money'], ['concepto', 'text', 'Concepto'], ['cat', 'cat', 'Categoría'],
        ['fecha', 'date', 'Fecha'], ['estado', 'seg', 'Estado', [['Pagado', 'Pagado'], ['Pendiente', 'Pendiente']]]] },
  ven: { t: 'vencimiento', def: () => ({ fecha: defFecha(), aviso: 3, rep: 'mensual', cat: 'Tarjeta crédito' }),
    f: [['monto', 'money'], ['concepto', 'text', 'Concepto (ej. Visa, Luz)'], ['cat', 'cat', 'Categoría'], ['fecha', 'date', 'Vence el'],
        ['aviso', 'num', 'Avisarme cuántos días antes'], ['rep', 'seg', 'Se repite', [['mensual', 'Todos los meses'], ['una', 'Una sola vez']]]] },
  deu: { t: 'deuda', def: () => ({ tipo: 'Tarjeta crédito' }),
    f: [['tipo', 'seg', '', [['Tarjeta crédito', 'Tarjeta'], ['Préstamo', 'Préstamo'], ['Otra deuda', 'Otra']]], ['nombre', 'text', 'Nombre (ej. Visa Galicia)'],
        ['saldo', 'num', 'Saldo actual'], ['cuota', 'num', 'Cuota mensual (opcional)'], ['inicial', 'num', 'Monto original (opcional)']] },
  bud: { t: 'límite', def: () => ({ cat: 'Super' }), f: [['cat', 'cat', 'Categoría'], ['limite', 'num', 'Límite mensual']] },
  meta: { t: 'meta', def: () => ({ ahorrado: 0 }), f: [['nombre', 'text', 'Nombre (ej. Vacaciones)'], ['objetivo', 'num', 'Objetivo'], ['ahorrado', 'num', 'Ya ahorrado (opcional)']] },
  fij: { t: 'gasto fijo', def: () => ({ tipo: 'gasto', cat: 'Hogar' }),
    f: [['tipo', 'seg', '', [['gasto', 'Gasto'], ['ingreso', 'Ingreso']]], ['monto', 'money'], ['concepto', 'text', 'Concepto (ej. Alquiler)'], ['cat', 'cat', 'Categoría']] },
  pago: { t: 'pago', f: [['monto', 'money']] },
  aporte: { t: 'aporte', f: [['monto', 'money']] },
};
const NUMS = ['monto', 'saldo', 'cuota', 'limite', 'objetivo', 'ahorrado', 'aviso', 'inicial'];
const OPCIONALES = ['inicial', 'ahorrado', 'cuota', 'aviso'];
let sheet = null; // { k, o, editing, ref }

function catField(name, val, tipo) {
  const list = tipo === 'ingreso' ? CATS_I : CATS_G;
  const other = val && !list.includes(val) ? val : '';
  return `<div class="catc" id="catc">${list.map(c => `<label><input type="radio" name="${name}" value="${e(c)}" ${c === val ? 'checked' : ''}>${e(c)}</label>`).join('')}
    <input class="in" name="cat_otro" placeholder="Otra…" value="${e(other)}" autocomplete="off"></div>`;
}
const numStr = v => v === '' || v == null || v === 0 ? '' : Number(parseMoney(v)).toLocaleString('es-AR', { maximumFractionDigits: 2 });
function fieldHTML([n, t, label, opts], o) {
  const v = o[n] ?? '';
  let h;
  if (t === 'seg') h = `<div class="seg">${opts.map(([val, tx]) => `<label><input type="radio" name="${n}" value="${e(val)}" ${String(v) === val ? 'checked' : ''}>${e(tx)}</label>`).join('')}</div>`;
  else if (t === 'money') h = `<input class="in money" name="${n}" inputmode="decimal" placeholder="$0" value="${e(numStr(v))}" autocomplete="off" aria-label="Monto">`;
  else if (t === 'num') h = `<input class="in" name="${n}" inputmode="decimal" placeholder="0" value="${e(n === 'aviso' ? String(v) : numStr(v))}" autocomplete="off">`;
  else if (t === 'date') h = `<input class="in" type="date" name="${n}" value="${e(v)}">`;
  else if (t === 'cat') h = catField(n, v, o.tipo);
  else h = `<input class="in" name="${n}" placeholder="${e(label)}" value="${e(v)}" autocomplete="off" aria-label="${e(label)}">`;
  return t === 'text' || t === 'money' || !label ? `<div class="fld">${h}</div>` : `<div class="fld"><span>${e(label)}</span>${h}</div>`;
}
function openSheet(k, o, ref) {
  const F = FORMS[k], editing = !!(o && o.id);
  o = { ...(F.def ? F.def() : {}), ...(o || {}) };
  sheet = { k, o, editing, ref };
  const refObj = ref && (k === 'pago' ? find('deu', ref) : find('meta', ref));
  if (k === 'pago' && refObj?.cuota) o.monto = Math.min(refObj.cuota, refObj.saldo);
  const title = k === 'pago' ? 'Pago de ' + e(refObj?.nombre) : k === 'aporte' ? 'Aporte a ' + e(refObj?.nombre) : (editing ? 'Editar ' : 'Nuevo ') + F.t;
  $('sheet').innerHTML = `<div class="sh-h"><h3>${title}</h3><button class="icon" data-act="close" aria-label="Cerrar">${ic('x')}</button></div>
    ${F.quick && !editing ? `<div class="composer"><input id="quick" placeholder="Escribí rápido: super 45000" autocomplete="off" enterkeyhint="send" aria-label="Carga rápida"><button class="send" type="button" data-act="quicksend" aria-label="Guardar">${ic('send')}</button></div>
      <div class="hint">Probá “nafta 30k”, “sueldo 3000000” o “+ venta 15000”. El resto lo completo solo.</div>` : ''}
    <form id="shF" novalidate>${F.f.map(x => fieldHTML(x, o)).join('')}
    <div class="sh-f">${editing ? `<button type="button" class="btn danger" data-act="sheetdel">${ic('trash')}Eliminar</button>` : ''}<button class="btn p">${editing ? 'Guardar cambios' : 'Guardar'}</button></div></form>`;
  $('sheetWrap').hidden = false; document.body.style.overflow = 'hidden';
  const q = $('quick');
  if (q) { q.addEventListener('input', () => quickParse(q.value)); q.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); submitSheet(); } }); }
  $('shF').onsubmit = ev => { ev.preventDefault(); submitSheet(); };
  setTimeout(() => (q || $('shF').querySelector('.money') || $('shF').querySelector('input.in'))?.focus({ preventScroll: true }), 80);
}
function closeSheet() { $('sheetWrap').hidden = true; $('sheet').innerHTML = ''; sheet = null; document.body.style.overflow = ''; }

function quickParse(txt) {
  const F = $('shF'); if (!F) return;
  const s = txt.trim(), low = s.toLowerCase();
  const m = low.match(/(\d[\d.,]*)\s*(k|mil|lucas|luca)?(?![a-z])/);
  const monto = m ? parseMoney(m[1] + (m[2] || '')) : 0;
  const concepto = (m ? s.slice(0, m.index) + s.slice(m.index + m[0].length) : s).replace(/^\s*[+-]\s*/, '').replace(/\$/g, '').replace(/\s+/g, ' ').trim();
  const tipo = INGRESO_RE.test(low) ? 'ingreso' : 'gasto';
  const setR = (n, v) => { const el = F.querySelector(`input[name="${n}"][value="${v}"]`); if (el) el.checked = true; };
  setR('tipo', tipo); rebuildCats(tipo);
  F.monto.value = monto ? numStr(monto) : '';
  F.concepto.value = concepto ? concepto[0].toUpperCase() + concepto.slice(1) : '';
  const g = GUESS.find(([re]) => re.test(low));
  if (g && (tipo === 'ingreso' ? CATS_I : CATS_G).includes(g[1])) { setR('cat', g[1]); F.cat_otro.value = ''; }
}
function rebuildCats(tipo) {
  const c = $('catc'); if (!c) return;
  const cur = $('shF').querySelector('input[name="cat"]:checked')?.value;
  const list = tipo === 'ingreso' ? CATS_I : CATS_G;
  if (list.includes(cur) && c.querySelector(`input[value="${cur}"]`) && c.querySelectorAll('input[type=radio]').length === list.length) return;
  c.outerHTML = catField('cat', list.includes(cur) ? cur : list[0], tipo);
}
function submitSheet() {
  if (!sheet) return;
  const F = $('shF'), fd = new FormData(F), { k, editing, ref } = sheet;
  const o = { ...sheet.o };
  for (const [n, v] of fd.entries()) if (n !== 'cat_otro') o[n] = typeof v === 'string' ? v.trim() : v;
  const otro = (fd.get('cat_otro') || '').trim(); if (otro) o.cat = otro;
  for (const n of NUMS) if (n in o) o[n] = parseMoney(o[n]);
  // Validación
  const falta = FORMS[k].f.map(x => x[0]).filter(n => !OPCIONALES.includes(n) && !(k === 'deu' && editing && n === 'saldo')).find(n => NUMS.includes(n) ? !(o[n] > 0) : !o[n]);
  if (falta) { F.querySelector(`[name="${falta}"]`)?.focus(); toast(NUMS.includes(falta) ? 'Poné un monto mayor a 0' : 'Completá ' + (falta === 'cat' ? 'la categoría' : falta === 'fecha' ? 'la fecha' : 'el concepto')); return; }

  if (k === 'pago') {
    const d = find('deu', ref); const monto = Math.min(o.monto, d.saldo);
    put('deu', { ...d, saldo: d.saldo - monto }, true);
    put('mov', { tipo: 'gasto', concepto: 'Pago ' + d.nombre, monto, cat: d.tipo === 'Préstamo' ? 'Préstamo' : 'Tarjeta crédito', fecha: defFecha(), mes, estado: 'Pagado' });
    closeSheet(); toast(`Pago de ${f(monto)} registrado`); return;
  }
  if (k === 'aporte') { const x = find('meta', ref); put('meta', { ...x, ahorrado: x.ahorrado + o.monto }); closeSheet(); toast('Aporte sumado'); return; }

  if (k === 'mov') o.mes = o.fecha.slice(0, 7);
  if (k === 'deu') o.inicial = Math.max(o.inicial || 0, o.saldo, editing && !fd.get('inicial') ? sheet.o.inicial || 0 : 0);
  if (k === 'ven') { o.dia = +o.fecha.slice(8); if (o.fecha !== sheet.o.fecha) { o.notif = null; o.pagado = false; } }
  if (k === 'bud' && !editing) { const ex = S.bud.find(b => b.cat === o.cat); if (ex) o.id = ex.id; }
  put(k, o); closeSheet();
  toast(editing ? 'Cambios guardados' : k === 'mov' ? `${o.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'} de ${f(o.monto)} guardado` : 'Guardado');
  if (k === 'mov' && o.mes !== mes && ['res', 'mov'].includes(tab)) { mes = o.mes; render(); }
}

// ---------- Acciones ----------
function sigMes(fe, dia) { const [y, m] = fe.split('-').map(Number), last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); return new Date(Date.UTC(y, m, Math.min(dia, last))).toISOString().slice(0, 10); }
function pagarV(id) {
  const x = find('ven', id); if (!x) return;
  put('mov', { tipo: 'gasto', concepto: x.concepto, monto: x.monto, cat: x.cat, fecha: today(), mes: today().slice(0, 7), estado: 'Pagado' }, true);
  const prox = x.rep === 'mensual' ? sigMes(x.fecha, x.dia || +x.fecha.slice(8)) : null;
  put('ven', prox ? { ...x, fecha: prox, notif: null } : { ...x, pagado: true });
  toast(prox ? `Pagado · el próximo vence el ${fmtF(prox)}` : 'Pagado');
}
function aplicar() {
  let n = 0;
  S.fij.forEach(x => { if (!S.mov.some(m => m.fid === x.id && m.mes === mes)) { put('mov', { mes, fecha: mes + '-01', tipo: x.tipo, concepto: x.concepto, monto: x.monto, cat: x.cat, estado: 'Pendiente', fid: x.id }, true); n++; } });
  render(); toast(n ? `${n} movimiento${n > 1 ? 's' : ''} agregado${n > 1 ? 's' : ''} como pendiente${n > 1 ? 's' : ''}` : 'Ya estaban aplicados');
}
function exportar() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(K.flatMap(k => S[k]), null, 1)], { type: 'application/json' }));
  a.download = 'mis-finanzas-' + today() + '.json'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast('Copia descargada');
}
$('fileIn').addEventListener('change', async ev => {
  const file = ev.target.files[0]; ev.target.value = ''; if (!file) return;
  try {
    const arr = JSON.parse(await file.text());
    const rows = (Array.isArray(arr) ? arr : []).filter(o => o && K.includes(o.k) && o.id);
    if (!rows.length) return toast('El archivo no tiene datos válidos');
    if (!confirm(`¿Importar ${rows.length} registros? Los que ya existan se reemplazan.`)) return;
    rows.forEach(o => put(o.k, o, true)); render(); toast(`${rows.length} registros importados`);
  } catch { toast('No se pudo leer el archivo'); }
});
function setTheme() {
  const r = document.documentElement, n = { auto: 'light', light: 'dark', dark: 'auto' }[r.dataset.theme || 'auto'];
  if (n === 'auto') delete r.dataset.theme; else r.dataset.theme = n;
  try { if (n === 'auto') localStorage.removeItem('fin_theme'); else localStorage.setItem('fin_theme', n); } catch {}
  render();
}

const ACT = {
  menu: () => document.body.classList.toggle('drawer'),
  tab: el => { tab = el.dataset.tab; if (tab !== 'mov') filtro = 'todos'; ls.set('fin_tab', tab); document.body.classList.remove('drawer'); render(); scrollTo(0, 0); },
  mes: el => { const d = +el.dataset.d; mes = d ? addMes(mes, d) : today().slice(0, 7); render(); },
  fab: () => openSheet(['ven', 'deu', 'bud', 'meta', 'fij'].includes(tab) ? tab : 'mov'),
  copy: el => copiar(el.dataset.v),
  autotest: () => autoEnviar(''),
  autosim: () => { const v = $('simTxt')?.value.trim(); if (!v) return toast('Escribí una notificación de ejemplo'); autoEnviar(v); },
  autoregen: async () => { if (!confirm('¿Generar un código nuevo? El anterior deja de funcionar y vas a tener que actualizar MacroDroid.')) return; await sb.from('ingest_tokens').delete().eq('user_id', user.id); autoTok = null; autoCargar(); },
  autorefresh: () => autoCargar(),
  gscopy: async () => {
    const nombre = ($('miNombre')?.value || '').trim(); ls.set('fin_minombre', nombre);
    try {
      const r = await fetch('google-apps-script/mis-finanzas.gs', { cache: 'no-cache' }); if (!r.ok) throw 0;
      const code = (await r.text()).replace('PEGAR_URL_CON_CODIGO', window.SUPABASE_URL + '/functions/v1/ingesta?t=' + autoTok).replace('PEGAR_TU_NOMBRE', nombre.replace(/'/g, ''));
      copiar(code);
    } catch { toast('No se pudo obtener el código. Revisá la conexión.'); }
  },
  edit: el => { const o = find(el.dataset.k, el.dataset.id); if (o) openSheet(el.dataset.k, o); },
  toggle: el => { const x = find('mov', el.dataset.id); if (x) put('mov', { ...x, estado: x.estado === 'Pendiente' ? 'Pagado' : 'Pendiente' }); },
  pagarV: el => pagarV(el.dataset.id),
  pago: el => openSheet('pago', null, el.dataset.id),
  aporte: el => openSheet('aporte', null, el.dataset.id),
  aplicar,
  filtro: el => { filtro = filtro === el.dataset.f && el.dataset.f.startsWith('cat:') ? 'todos' : el.dataset.f; render(); },
  filtcat: el => { filtro = 'cat:' + el.dataset.cat; tab = 'mov'; ls.set('fin_tab', tab); render(); scrollTo(0, 0); },
  close: closeSheet,
  quicksend: submitSheet,
  sheetdel: () => { const { k, o } = sheet; closeSheet(); del(k, o.id); },
  pushon: () => pushOnFn(), pushoff: () => pushOff(),
  theme: setTheme,
  export: exportar,
  import: () => $('fileIn').click(),
  logout: async () => {
    if (queue.length && !confirm('Hay cambios que todavía no se subieron (sin conexión). Si cerrás sesión se pierden. ¿Cerrar igual?')) return;
    queue = []; ls.set('fin_queue', []); ls.set(cacheKey(), null); await sb.auth.signOut();
  },
  auth: el => authView('', el.dataset.m),
};
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]'); if (!el || el.disabled) return;
  const fn = ACT[el.dataset.act]; if (!fn) return;
  ev.preventDefault(); ev.stopPropagation(); fn(el);
});
document.addEventListener('change', ev => {
  if (!sheet) return;
  if (ev.target.name === 'tipo' && $('catc')) rebuildCats(ev.target.value);
  if (ev.target.name === 'cat' && $('shF')?.cat_otro) $('shF').cat_otro.value = '';
});
document.addEventListener('focusout', ev => { if (sheet && ev.target.matches?.('#shF .in[inputmode=decimal]') && ev.target.name !== 'aviso' && ev.target.value) ev.target.value = numStr(ev.target.value); });
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') { if (sheet) closeSheet(); else document.body.classList.remove('drawer'); } });

// ---------- Vencimientos: aviso local al abrir ----------
function avisarLocal() {
  const l = S.ven.filter(x => !x.pagado && diasA(x.fecha) <= (x.aviso || 0));
  if (!l.length || !('Notification' in window) || Notification.permission !== 'granted') return;
  const k = 'fin_avisado_' + today(); if (ls.get(k)) return; ls.set(k, 1);
  navigator.serviceWorker?.ready.then(r => r.showNotification(`Tenés ${l.length} vencimiento${l.length > 1 ? 's' : ''} cerca`,
    { body: l.map(x => `${x.concepto} ${fmtF(x.fecha)}`).join(' · '), icon: 'icons/icon-192.png', tag: 'resumen' }));
}

// ---------- Push ----------
let pushOn = null;
function pushBox() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window))
    return `<div class="card" style="margin-bottom:6px"><small>Este navegador no admite notificaciones. En iPhone: instalá la app (Compartir → Agregar a inicio) y abrila desde el ícono.</small></div>`;
  if (pushOn === null) pushEstado();
  const den = Notification.permission === 'denied';
  return `<div class="card row" style="margin-bottom:6px"><span style="display:flex;gap:12px;align-items:center"><span class="av" style="--c:var(--ac)">${ic('bell')}</span>
    <span><b>Notificaciones ${pushOn ? 'activadas' : 'desactivadas'}</b><br><small>${den ? 'Las bloqueaste: habilitalas en la configuración del navegador.' : 'Todos los días a las 9:00, aunque la app esté cerrada.'}</small></span></span>
    ${pushOn ? '<button class="btn sm" data-act="pushoff">Desactivar</button>' : den ? '' : '<button class="btn p sm" data-act="pushon">Activar</button>'}</div>`;
}
async function pushEstado() {
  try {
    const r = await navigator.serviceWorker.ready, s = await r.pushManager.getSubscription(); const v = !!s && Notification.permission === 'granted';
    if (v !== pushOn) { pushOn = v; if (tab === 'ven' && !sheet) render(); }
  } catch { pushOn = false; }
}
const b64u = s => { const p = '='.repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); };
async function pushOnFn() {
  try {
    if (await Notification.requestPermission() !== 'granted') { render(); return toast('Sin permiso no te puedo avisar'); }
    const r = await navigator.serviceWorker.ready;
    const s = await r.pushManager.getSubscription() || await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(window.VAPID_PUBLIC) });
    const j = s.toJSON();
    const { error } = await sb.from('push_subs').upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_id: user.id });
    if (error) throw error;
    pushOn = true; render();
    r.showNotification('Notificaciones activadas', { body: 'Te aviso de tus vencimientos todos los días a las 9:00.', icon: 'icons/icon-192.png' });
  } catch (x) { toast('No se pudieron activar: ' + (x.message || x)); }
}
async function pushOff() {
  try {
    const r = await navigator.serviceWorker.ready, s = await r.pushManager.getSubscription();
    if (s) { await sb.from('push_subs').delete().eq('endpoint', s.endpoint); await s.unsubscribe(); }
    pushOn = false; render();
  } catch (x) { toast('Error: ' + (x.message || x)); }
}

// ---------- Carga automática ----------
let autoTok, autoLog;
async function autoCargar() {
  let { data } = await sb.from('ingest_tokens').select('token').maybeSingle();
  if (!data) ({ data } = await sb.from('ingest_tokens').insert({ user_id: user.id }).select('token').single());
  autoTok = data?.token || null;
  const r = await sb.from('ingest_log').select('at,app,texto,resultado').order('at', { ascending: false }).limit(10);
  autoLog = r.data || [];
  if (tab === 'auto' && !sheet) render();
  if (autoLog.some(l => /^Cargado/.test(l.resultado))) load();
}
async function autoEnviar(text) {
  try {
    const r = await fetch(window.SUPABASE_URL + '/functions/v1/ingesta', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ t: autoTok, app: text ? 'Simulación' : 'Prueba desde la app', title: '', text }) });
    const j = await r.json(); toast(j.resultado || j.error || 'Listo'); autoCargar();
  } catch { toast('Sin conexión'); }
}
function copiar(v) {
  (navigator.clipboard?.writeText(v) || Promise.reject()).then(() => toast('Copiado'), () => { prompt('Copiá esto:', v); });
}

// ---------- Gráficos 3D ----------
let charts = [], chartsMod = null;
const disposeCharts = () => { charts.forEach(d => { try { d(); } catch {} }); charts = []; };
function ult(n) { return Array.from({ length: n }, (_, i) => addMes(mes, i - (n - 1))); }
const porCat = t => { const o = {}; M().filter(x => x.tipo === t).forEach(x => o[x.cat] = (o[x.cat] || 0) + x.monto); return Object.entries(o).sort((a, b) => b[1] - a[1]); };
async function drawCharts() {
  const my = mes;
  try { chartsMod = chartsMod || await import('./charts3d.js'); }
  catch { document.querySelectorAll('.cv').forEach(el => { el.outerHTML = '<div class="empty" style="padding:30px 10px">No se pudo cargar el gráfico 3D. Revisá la conexión.</div>'; }); return; }
  if (tab !== 'graf' || mes !== my || !$('ch_gas') || $('ch_gas').firstChild) return;
  const { pie, bars } = chartsMod;
  const lg = (id, items) => { $(id + '_lg').innerHTML = items.map(i => `<span><i style="background:${i.color}"></i>${e(i.label)}${i.value != null ? ' ' + f(i.value) : ''}</span>`).join(''); };
  const vacio = (id, t) => { $(id).outerHTML = `<div class="empty" style="padding:30px 10px">${t}</div>`; };
  const tryDraw = fn => { try { charts.push(fn()); } catch (x) { console.error(x); } };
  for (const [id, t] of [['ch_gas', 'gasto'], ['ch_ing', 'ingreso']]) {
    const it = porCat(t).map(([label, value]) => ({ label, value, color: catCol(label) }));
    if (!it.length) { vacio(id, 'Sin datos en ' + MESES[+mes.slice(5) - 1]); continue; }
    tryDraw(() => pie($(id), it)); lg(id, it);
  }
  const ms = ult(6), cats = ms.map(x => MESES[+x.slice(5) - 1].slice(0, 3));
  const ev = ms.map(x => { const a = S.mov.filter(y => y.mes === x); return [sum(a, 'ingreso'), sum(a, 'gasto')]; });
  const se = [{ label: 'Ingresos', color: '#5a8a5e', values: ev.map(x => x[0]) }, { label: 'Gastos', color: '#c96442', values: ev.map(x => x[1]) }, { label: 'Balance', color: '#2f8fb0', values: ev.map(x => x[0] - x[1]) }];
  if (ev.every(x => !x[0] && !x[1])) vacio('ch_evo', 'Sin movimientos en los últimos 6 meses'); else { tryDraw(() => bars($('ch_evo'), cats, se)); lg('ch_evo', se); }
  const dd = [{ label: 'Pagado', color: '#5a8a5e', values: S.deu.map(d => Math.max(0, (d.inicial || d.saldo) - d.saldo)) }, { label: 'Pendiente', color: '#c9922f', values: S.deu.map(d => d.saldo) }];
  if (!S.deu.length) vacio('ch_deu', 'Sin deudas cargadas'); else { tryDraw(() => bars($('ch_deu'), S.deu.map(d => d.nombre), dd)); lg('ch_deu', dd); }
  const mm = [{ label: 'Ahorrado', color: '#5a8a5e', values: S.meta.map(x => x.ahorrado) }, { label: 'Falta', color: '#7a6ad8', values: S.meta.map(x => Math.max(0, x.objetivo - x.ahorrado)) }];
  if (!S.meta.length) vacio('ch_meta', 'Sin metas cargadas'); else { tryDraw(() => bars($('ch_meta'), S.meta.map(x => x.nombre), mm)); lg('ch_meta', mm); }
}

// ---------- Inicio ----------
if (!sb) authView();
else {
  sb.auth.onAuthStateChange((ev, session) => {
    if (ev === 'PASSWORD_RECOVERY') recovering = true;
    const prev = user?.id; user = session?.user || null;
    if (!user) { S = empty(); render(); return; }
    if (user.id !== prev) { autoTok = undefined; autoLog = undefined; pushOn = null; S = { ...empty(), ...ls.get(cacheKey(), {}) }; render(); setTimeout(load, 0); }
    else if (ev === 'PASSWORD_RECOVERY') render();
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && user) load(); });
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
