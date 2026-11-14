const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f=n=>(n<0?'-':'')+'$'+Math.abs(Number(n||0)).toLocaleString('es-AR',{maximumFractionDigits:0});
const K=['mov','deu','bud','meta','fij'];
const CATS=['Sueldo','Hogar','Servicios','Super','Tarjeta crédito','Préstamo','Transporte','Salud','Ocio','Educación','Ahorro','Otros'];
const TABS={res:'Resumen',mov:'Movimientos',deu:'Tarjetas y préstamos',bud:'Presupuesto',meta:'Metas',fij:'Gastos fijos'};
const empty=()=>({mov:[],deu:[],bud:[],meta:[],fij:[]});
let S=empty(),tab='res',mes=new Date().toISOString().slice(0,7),user=null;
const $=id=>document.getElementById(id);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const setSt=t=>{$('st').textContent=t};
const err=x=>setSt('Error: '+(x&&x.message||x));

// ---------- Supabase ----------
const configured=window.SUPABASE_URL&&!/PEGAR/.test(window.SUPABASE_URL);
const sb=configured?supabase.createClient(window.SUPABASE_URL,window.SUPABASE_KEY):null;

async function load(){
  setSt('Sincronizando…');
  const {data,error}=await sb.from('items').select('id,k,data');
  if(error)return err(error);
  const n=empty();data.forEach(r=>{if(n[r.k])n[r.k].push({...r.data,id:r.id,k:r.k})});
  S=n;setSt('Guardado en la nube · privado');render();
}
async function save(rows){
  const {error}=await sb.from('items').upsert(rows.map(o=>({id:o.id,k:o.k,data:o,user_id:user.id})));
  if(error)err(error);else setSt('Guardado en la nube · privado');
}
async function put(k,o){o.k=k;o.id=o.id||k+'_'+uid();const i=S[k].findIndex(x=>x.id===o.id);i<0?S[k].push(o):S[k][i]=o;render();await save([o])}
async function del(k,i){S[k]=S[k].filter(x=>x.id!==i);render();const {error}=await sb.from('items').delete().eq('id',i);if(error)err(error)}

// ---------- Auth ----------
function authView(msg=''){
  $('tools').hidden=true;$('nav').innerHTML='';$('opts').hidden=true;
  if(!configured){$('app').innerHTML='<div class="c auth"><b>Falta configurar Supabase</b><p><small>Completá <code>config.js</code> con la URL y la publishable key del proyecto.</small></p></div>';setSt('Sin configurar');return}
  setSt('Iniciá sesión');
  $('app').innerHTML=`<div class="c auth"><h3>Ingresar</h3><form onsubmit="login(event)">
   <input name="email" type="email" placeholder="Email" autocomplete="email" required>
   <input name="pass" type="password" placeholder="Contraseña" autocomplete="current-password" minlength="6" required>
   <button class="p" name="a" value="in">Ingresar</button><button name="a" value="up">Crear cuenta</button></form>
   <small>${e(msg)}</small></div>`;
}
async function login(ev){
  ev.preventDefault();const fd=new FormData(ev.target),a=ev.submitter?.value||'in';
  const cred={email:fd.get('email'),password:fd.get('pass')};
  const {data,error}=a==='up'?await sb.auth.signUp(cred):await sb.auth.signInWithPassword(cred);
  if(error)return authView(error.message);
  if(a==='up'&&!data.session)authView('Te mandamos un email para confirmar la cuenta. Confirmá y después ingresá.');
}
async function salir(){await sb.auth.signOut()}
function menu(){$('opts').hidden=!$('opts').hidden}

// ---------- Backup ----------
function exportar(){
  const all=K.flatMap(k=>S[k]);
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(all,null,1)],{type:'application/json'}));
  a.download='mis-finanzas-'+new Date().toISOString().slice(0,10)+'.json';a.click();
}
async function importar(inp){
  const file=inp.files[0];inp.value='';if(!file)return;
  try{
    const arr=JSON.parse(await file.text());
    const rows=(Array.isArray(arr)?arr:[]).filter(o=>o&&K.includes(o.k)&&o.id);
    if(!rows.length)return alert('El archivo no tiene datos válidos.');
    if(!confirm(`Importar ${rows.length} registros? Los que tengan el mismo id se reemplazan.`))return;
    await save(rows);await load();
  }catch(x){err(x)}
}

// ---------- Vistas ----------
const find=(k,i)=>S[k].find(x=>x.id===i);
const M=()=>S.mov.filter(m=>m.mes===mes);
const sum=(a,t)=>a.filter(m=>m.tipo===t).reduce((s,m)=>s+m.monto,0);
const bar=(v,m,c)=>`<div class="b"><i style="width:${m>0?Math.min(100,v/m*100):0}%;background:${c}"></i></div>`;
const opts=a=>a.map(x=>`<option>${e(x)}</option>`).join('');
const dl=`<datalist id="cats">${opts(CATS)}</datalist>`;
function sub(ev,k){ev.preventDefault();const o=Object.fromEntries(new FormData(ev.target));
 for(const n of['monto','saldo','cuota','limite','objetivo','ahorrado'])if(n in o)o[n]=+o[n]||0;
 if(k==='mov')o.mes=o.mes||mes;if(k==='deu')o.inicial=o.saldo;if(k==='meta')o.ahorrado=o.ahorrado||0;
 if(k==='bud')o.id='bud_'+o.cat.replace(/\W/g,'_');
 put(k,o);ev.target.reset()}
const form=(k,fs,btn)=>`<form onsubmit="sub(event,'${k}')">${fs}<button class="p">${btn}</button></form>`;
const inp=(n,p,t='text',x='')=>`<input name="${n}" placeholder="${p}" type="${t}" ${x} required>`;
const catI=`<input name="cat" list="cats" placeholder="Categoría" required>`;
const estS=`<select name="estado"><option>Pagado</option><option>Pendiente</option></select>`;
const tipS=`<select name="tipo"><option value="gasto">Gasto</option><option value="ingreso">Ingreso</option></select>`;
const V={
res(){const m=M(),ing=sum(m,'ingreso'),gas=sum(m,'gasto'),bal=ing-gas,
 pen=m.filter(x=>x.tipo==='gasto'&&x.estado==='Pendiente').reduce((s,x)=>s+x.monto,0),
 deuda=S.deu.reduce((s,d)=>s+d.saldo,0);
 const bc={};m.filter(x=>x.tipo==='gasto').forEach(x=>bc[x.cat]=(bc[x.cat]||0)+x.monto);
 const cats=Object.entries(bc).sort((a,b)=>b[1]-a[1]);
 const card=(t,v,c='')=>`<div class="c"><small>${t}</small><div class="n ${c}">${f(v)}</div></div>`;
 return `<div class="c hero"><small>Balance de ${e(mes)}</small><div class="big ${bal<0?'bad':''}">${f(bal)}</div><div class="row"><span class="ok">↓ ${f(ing)} ingresos</span><span class="bad">↑ ${f(gas)} gastos</span></div></div><div class="g">${card('Por pagar',pen,'wn')}${card('Deuda total',deuda)}${card('Ahorrado en metas',S.meta.reduce((s,x)=>s+x.ahorrado,0),'ok')}</div>
 <div class="g2"><div class="c"><h3>Gastos por categoría</h3>${cats.map(([c,v])=>`<div class="row"><span>${e(c)}</span><span>${f(v)} <small>(${Math.round(v/gas*100)}%)</small></span></div>${bar(v,gas,'var(--ac)')}`).join('')||'<small>Sin gastos este mes</small>'}</div>
 <div class="c"><h3>Presupuesto del mes</h3>${S.bud.map(b=>{const v=bc[b.cat]||0;return `<div class="row"><span>${e(b.cat)}</span><span class="${v>b.limite?'bad':''}">${f(v)} / ${f(b.limite)}</span></div>${bar(v,b.limite,v>b.limite?'var(--bad)':'var(--ok)')}`}).join('')||'<small>Definí límites en Presupuesto</small>'}</div>
 <div class="c"><h3>Metas de ahorro</h3>${S.meta.map(x=>`<div class="row"><span>${e(x.nombre)}</span><span>${f(x.ahorrado)} / ${f(x.objetivo)}</span></div>${bar(x.ahorrado,x.objetivo,'var(--ok)')}`).join('')||'<small>Sin metas aún</small>'}</div></div>`},
mov(){const m=M().sort((a,b)=>a.tipo<b.tipo?1:-1);
 return dl+form('mov',tipS+inp('concepto','Concepto')+inp('monto','Monto','number','min="0" step="any" inputmode="decimal"')+catI+`<input name="mes" type="month" value="${mes}" required>`+estS,'Agregar')+
 `<div class="c sc"><table><tr><th>Concepto</th><th>Categoría</th><th class="r">Monto</th><th>Mes</th><th>Estado</th><th></th></tr>${m.map(x=>`<tr><td>${e(x.concepto)}</td><td>${e(x.cat)}</td><td class="r ${x.tipo==='ingreso'?'ok':''}">${x.tipo==='ingreso'?'+':'−'}${f(x.monto)}</td><td><input type="month" value="${e(x.mes)}" onchange="mv('${e(x.id)}',this.value)" style="padding:4px 10px"></td><td><button class="pill" onclick="tg('${e(x.id)}')">${e(x.estado)}</button></td><td><button class="x" onclick="del('mov','${e(x.id)}')">✕</button></td></tr>`).join('')||'<tr><td colspan="6"><small>Sin movimientos en este mes</small></td></tr>'}</table></div>`},
deu(){return form('deu',`<select name="tipo"><option>Tarjeta crédito</option><option>Préstamo</option><option>Otra deuda</option></select>`+inp('nombre','Nombre (ej. Tarjeta Banco X)')+inp('saldo','Saldo actual','number','min="0" step="any" inputmode="decimal"')+inp('cuota','Cuota mensual','number','min="0" step="any" inputmode="decimal"')+`<input name="mes" type="month" title="Mes" value="${mes}" required>`,'Agregar')+
 `<div class="g2">${S.deu.map(d=>`<div class="c"><div class="row"><b>${e(d.nombre)}</b><button class="x" onclick="del('deu','${e(d.id)}')">✕</button></div><small>${e(d.tipo)} · cuota ${f(d.cuota)}</small> <input type="month" value="${e(d.mes||mes)}" onchange="mv2('deu','${e(d.id)}',this.value)" style="padding:3px 10px"><div class="n">${f(d.saldo)}</div>${bar(d.inicial-d.saldo,d.inicial,'var(--ok)')}<div class="row"><input id="p_${e(d.id)}" type="number" inputmode="decimal" value="${d.cuota}" style="width:110px"><button class="p" onclick="pay('${e(d.id)}')">Registrar pago</button></div></div>`).join('')||'<small>Sin deudas registradas</small>'}</div>`},
bud(){const bc={};M().filter(x=>x.tipo==='gasto').forEach(x=>bc[x.cat]=(bc[x.cat]||0)+x.monto);
 return dl+form('bud',catI+inp('limite','Límite mensual','number','min="0" step="any" inputmode="decimal"'),'Guardar límite')+
 `<div class="c">${S.bud.map(b=>{const v=bc[b.cat]||0;return `<div class="row"><span>${e(b.cat)} <button class="x" onclick="del('bud','${e(b.id)}')">✕</button></span><span class="${v>b.limite?'bad':''}">${f(v)} / ${f(b.limite)}</span></div>${bar(v,b.limite,v>b.limite?'var(--bad)':'var(--ok)')}`}).join('')||'<small>Sin límites definidos</small>'}</div>`},
meta(){return form('meta',inp('nombre','Meta (ej. Fondo de emergencia)')+inp('objetivo','Monto objetivo','number','min="0" step="any" inputmode="decimal"')+`<input name="ahorrado" type="number" inputmode="decimal" placeholder="Ya ahorrado (opcional)" step="any"><input name="mes" type="month" title="Mes" value="${mes}" required>`,'Crear meta')+
 `<div class="g2">${S.meta.map(x=>`<div class="c"><div class="row"><b>${e(x.nombre)}</b><button class="x" onclick="del('meta','${e(x.id)}')">✕</button></div><div class="n">${f(x.ahorrado)} <small>/ ${f(x.objetivo)}</small></div><input type="month" value="${e(x.mes||mes)}" onchange="mv2('meta','${e(x.id)}',this.value)" style="padding:3px 10px">${bar(x.ahorrado,x.objetivo,'var(--ok)')}<div class="row"><input id="a_${e(x.id)}" type="number" inputmode="decimal" placeholder="Aporte" style="width:110px"><button class="p" onclick="aporte('${e(x.id)}')">Aportar</button></div></div>`).join('')||'<small>Sin metas</small>'}</div>`},
fij(){return dl+`<div class="row" style="margin-bottom:10px"><small>Plantilla de movimientos que se repiten cada mes.</small><button class="p" onclick="aplicar()">Aplicar a ${e(mes)}</button></div>`+
 form('fij',tipS+inp('concepto','Concepto (ej. Alquiler)')+inp('monto','Monto','number','min="0" step="any" inputmode="decimal"')+catI,'Agregar')+
 `<div class="c sc"><table>${S.fij.map(x=>`<tr><td>${e(x.concepto)}</td><td>${e(x.cat)}</td><td class="r ${x.tipo==='ingreso'?'ok':''}">${f(x.monto)}</td><td><button class="x" onclick="del('fij','${e(x.id)}')">✕</button></td></tr>`).join('')||'<tr><td><small>Sin gastos fijos</small></td></tr>'}</table></div>`}
};
function mv(i,v){if(v)put('mov',{...find('mov',i),mes:v})}
function mv2(k,i,v){if(v)put(k,{...find(k,i),mes:v})}
function tg(i){const x=find('mov',i);put('mov',{...x,estado:x.estado==='Pagado'?'Pendiente':'Pagado'})}
function pay(i){const d=find('deu',i),v=+$('p_'+i).value||0;if(v<=0)return;
 put('deu',{...d,saldo:Math.max(0,d.saldo-v)});put('mov',{mes,tipo:'gasto',concepto:'Pago '+d.nombre,monto:v,cat:d.tipo==='Préstamo'?'Préstamo':'Tarjeta crédito',estado:'Pagado'})}
function aporte(i){const x=find('meta',i),v=+$('a_'+i).value||0;if(v>0)put('meta',{...x,ahorrado:x.ahorrado+v})}
function aplicar(){S.fij.forEach(x=>{if(!S.mov.some(m=>m.fid===x.id&&m.mes===mes))put('mov',{mes,tipo:x.tipo,concepto:x.concepto,monto:x.monto,cat:x.cat,estado:'Pendiente',fid:x.id})});tab='mov';render()}
function render(){
 if(!user)return authView();
 $('tools').hidden=false;$('mes').value=mes;$('who').textContent='Sesión: '+(user.email||'');
 $('nav').innerHTML=Object.entries(TABS).map(([k,v])=>`<button class="${k===tab?'on':''}" onclick="tab='${k}';render()">${v}</button>`).join('');
 $('app').innerHTML=V[tab]()}

// ---------- Inicio ----------
if(!sb)authView();
else{
  sb.auth.onAuthStateChange((_ev,session)=>{
    const prev=user?.id;user=session?.user||null;
    if(!user){S=empty();authView();return}
    if(user.id!==prev)load();
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&user)load()});
}
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
