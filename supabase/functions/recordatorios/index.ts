// Envía notificaciones push de vencimientos. Lo llama pg_cron una vez por día.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const DAY = 86400000;
const money = (n: number) => '$' + Math.round(n || 0).toLocaleString('es-AR');

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: sec, error: secErr } = await db.rpc('get_push_secrets');
  if (secErr) return new Response(secErr.message, { status: 500 });
  if (!sec?.cron_secret || req.headers.get('x-cron-secret') !== sec.cron_secret)
    return new Response('unauthorized', { status: 401 });

  webpush.setVapidDetails('https://lucianopdl.github.io/app-administraci-n-/', sec.vapid_public, sec.vapid_private);

  // Fecha de hoy en Argentina (UTC-3, sin horario de verano).
  const hoy = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);
  const hoyMs = Date.parse(hoy);

  const { data: vens, error } = await db.from('items').select('user_id,id,data').eq('k', 'ven');
  if (error) return new Response(error.message, { status: 500 });

  const pend = (vens ?? []).filter((v) => {
    const d = v.data;
    if (!d?.fecha || d.pagado || d.notif === hoy) return false;
    const dias = Math.round((Date.parse(d.fecha) - hoyMs) / DAY);
    return dias <= (Number(d.aviso) || 0);
  });

  const users = [...new Set(pend.map((v) => v.user_id))];
  const { data: subs } = users.length
    ? await db.from('push_subs').select('*').in('user_id', users)
    : { data: [] };

  let enviados = 0;
  for (const v of pend) {
    const d = v.data;
    const dias = Math.round((Date.parse(d.fecha) - hoyMs) / DAY);
    const cuando = dias > 1 ? `vence en ${dias} días` : dias === 1 ? 'vence mañana'
      : dias === 0 ? 'vence HOY' : `venció hace ${-dias} día${dias === -1 ? '' : 's'}`;
    const payload = JSON.stringify({ title: `${d.concepto} · ${money(d.monto)}`, body: `${cuando} (${d.fecha.split('-').reverse().join('/')})`, tag: v.id });
    for (const s of (subs ?? []).filter((s) => s.user_id === v.user_id)) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
        enviados++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.from('push_subs').delete().eq('endpoint', s.endpoint);
      }
    }
    await db.from('items').update({ data: { ...d, notif: hoy } }).eq('user_id', v.user_id).eq('id', v.id);
  }
  return Response.json({ hoy, pendientes: pend.length, enviados });
});
