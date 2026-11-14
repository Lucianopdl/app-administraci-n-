// Recibe notificaciones de billeteras (Mercado Pago, MODO, bancos) reenviadas por MacroDroid
// y carga el movimiento en la cuenta del dueño del token.
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, x-token', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Ingreso / gasto según el verbo (en pasado, para no confundir con publicidades: "Pagá con QR…")
const IN = /(recibiste|te (transfirieron|enviaron|pagaron|devolvieron|depositaron)|se acredito|acreditamos|ingresaron|ingreso de dinero|cobraste|te reintegramos)/;
const OUT = /(pagaste|transferiste|enviaste|compraste|compra (aprobada|realizada)|pago (aprobado|realizado|exitoso|confirmado)|transferencia (enviada|realizada)|debitamos|se debito|retiraste|extrajiste|recargaste|cargaste)/;
const IGNORAR = /(rendimiento|rindieron|rindio|promo|descuento|sorteo|beneficio|cuotas sin interes|te prestamos|credito disponible|ofert|vence|vencimiento|resumen|record)/;

const GUESS: [RegExp, string][] = [
  [/super|mercadito|autoservicio|chino|verdu|carnic|almac|coto|carrefour|jumbo|dia |vea|disco|changomas/, 'Super'],
  [/edenor|edesur|metrogas|aysa|naturgy|internet|movistar|personal|claro|telecentro|fibertel|flow|netflix|spotify|disney|youtube|celular/, 'Servicios'],
  [/alquiler|expensa|ferret|easy|sodimac/, 'Hogar'],
  [/ypf|shell|axion|puma|nafta|sube|uber|cabify|didi|peaje|estacionamiento/, 'Transporte'],
  [/farmac|farmacity|medic|osde|swiss|galeno|prepaga|obra social|dentist/, 'Salud'],
  [/rappi|pedidosya|pedidos ya|mcdonald|burger|cafe|bar |resto|pizza|helad|cine|hoyts|cinemark|steam|playstation/, 'Ocio'],
  [/curso|facultad|colegio|escuela|libreria|udemy/, 'Educación'],
  [/tarjeta|visa|mastercard|amex|naranja/, 'Tarjeta crédito'],
];

function parse(app: string, title: string, text: string) {
  const full = `${title}. ${text}`.replace(/\s+/g, ' ').trim();
  const n = norm(full);
  const AMT = /(?:\$|ARS)\s?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)/i;
  // Se prefiere el texto (suele traer el detalle); si no tiene monto, se usa título + texto
  const src = AMT.test(text) ? text.replace(/\s+/g, ' ') : full;
  const m = src.match(AMT);
  if (!m) return { error: 'sin monto' };
  const monto = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
  if (!(monto > 0)) return { error: 'monto inválido' };
  const tipo = IN.test(n) ? 'ingreso' : OUT.test(n) ? 'gasto' : null;
  if (!tipo) return { error: 'no es un pago ni un cobro' };
  if (IGNORAR.test(n) && !/(pagaste|transferiste|recibiste|enviaste)/.test(n)) return { error: 'publicidad o aviso' };

  // Concepto: "… $ 5.000 a/en/de COMERCIO" o "Pagaste a COMERCIO …"
  const after = src.slice((m.index ?? 0) + m[0].length);
  let c = after.match(/^\s*(?:a|en|de|para|al)\s+(.+?)(?=\s+(?:con|por|desde|mediante|el dia|hoy)\b|[.!|]|$)/i)?.[1]
    ?? full.match(/(?:pagaste|transferiste|enviaste|compraste)\s+(?:a|en)\s+(.+?)(?=\s*(?:\$|[.!|]|$))/i)?.[1]
    ?? full.match(/de\s+(.+?)(?=\s*(?:\$|[.!|]|$))/i)?.[1]
    ?? '';
  c = c.replace(/["*]/g, '').trim().slice(0, 60);
  const sinConcepto = !c || /^\d/.test(c);
  if (sinConcepto) c = (tipo === 'ingreso' ? 'Cobro ' : 'Pago ') + app;
  c = c.length > 3 && c === c.toUpperCase() ? c.toLowerCase().replace(/(^|\s)\S/g, (x) => x.toUpperCase()) : c[0].toUpperCase() + c.slice(1);

  const nc = norm((sinConcepto ? '' : c + ' ') + n);
  let cat = tipo === 'ingreso' ? 'Extra' : (/transfer|enviaste/.test(n) ? 'Otros' : 'Otros');
  if (tipo === 'gasto') for (const [re, k] of GUESS) if (re.test(nc)) { cat = k; break; }
  return { mov: { tipo, monto, concepto: c, cat } };
}

async function sha(s: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const url = new URL(req.url);
  const p: Record<string, string> = Object.fromEntries(url.searchParams);
  try {
    const ct = req.headers.get('content-type') || '';
    if (req.method === 'POST') {
      if (ct.includes('json')) Object.assign(p, await req.json());
      else if (ct.includes('form')) Object.assign(p, Object.fromEntries(await req.formData()));
      else { const t = await req.text(); if (t) { try { Object.assign(p, JSON.parse(t)); } catch { p.text = p.text || t; } } }
    }
  } catch { /* cuerpo inválido: se usa la query */ }

  const token = req.headers.get('x-token') || p.t || p.token;
  if (!token) return json({ ok: false, error: 'falta el código (t)' }, 401);
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: tk } = await db.from('ingest_tokens').select('user_id').eq('token', token).maybeSingle();
  if (!tk) return json({ ok: false, error: 'código inválido' }, 401);
  const user_id = tk.user_id;

  const app = String(p.app || 'Billetera').slice(0, 40);
  const title = String(p.title || '').slice(0, 300), text = String(p.text || '').slice(0, 600);
  const ar = new Date(Date.now() - 3 * 3600000).toISOString();

  let resultado: string, item_id: string | null = null;
  if (!title && !text) resultado = 'Prueba recibida ✔';
  else {
    const r = parse(app, title, text);
    if ('error' in r) resultado = 'Ignorada: ' + r.error;
    else {
      const mov = { ...r.mov, fecha: ar.slice(0, 10), mes: ar.slice(0, 7), estado: 'Pagado', auto: app };
      item_id = 'mov_auto_' + await sha(`${user_id}|${app}|${title}|${text}|${ar.slice(0, 16)}`);
      const { error } = await db.from('items').upsert({ user_id, id: item_id, k: 'mov', data: { ...mov, id: item_id, k: 'mov' } }, { onConflict: 'user_id,id', ignoreDuplicates: true });
      resultado = error ? 'Error: ' + error.message : `Cargado: ${mov.tipo} $${mov.monto} · ${mov.concepto} (${mov.cat})`;
    }
  }
  await db.from('ingest_log').insert({ user_id, app, texto: [title, text].filter(Boolean).join(' · ').slice(0, 900) || '(prueba)', resultado, item_id });
  // Guardar solo los últimos 30 registros
  const { data: old } = await db.from('ingest_log').select('id').eq('user_id', user_id).order('at', { ascending: false }).range(30, 200);
  if (old?.length) await db.from('ingest_log').delete().in('id', old.map((x) => x.id));
  return json({ ok: true, resultado });
});
