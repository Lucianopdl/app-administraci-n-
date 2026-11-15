/**
 * Mis Finanzas · carga automática desde Gmail
 * Cada 5 minutos revisa los mails de bancos y billeteras, detecta pagos/cobros
 * y los manda a la app.
 *
 * Instalación: pegá este código en script.google.com (Nuevo proyecto),
 * arriba elegí la función "instalar" y tocá "Ejecutar". Aceptá los permisos.
 */
const URL_INGESTA = 'PEGAR_URL_CON_CODIGO';
// Tu nombre como figura en los bancos: las transferencias a tus propias cuentas se ignoran
const MI_NOMBRE = 'PEGAR_TU_NOMBRE';

const BUSQUEDA = 'newer_than:3d -label:mis-finanzas -category:promotions ' +
  'from:(avisos@bbva.com.ar OR mercadopago OR modo OR naranjax OR arqfinance OR uala OR brubank)';

function revisarMails() {
  const etiqueta = GmailApp.getUserLabelByName('mis-finanzas') || GmailApp.createLabel('mis-finanzas');
  GmailApp.search(BUSQUEDA, 0, 30).forEach(function (hilo) {
    hilo.getMessages().forEach(function (m) {
      const r = interpretar(m.getSubject(), m.getPlainBody());
      if (!r) return; // no es un pago/cobro (o es duplicado / propio)
      const remitente = m.getFrom().replace(/<.*>/, '').replace(/"/g, '').trim() || 'Gmail';
      // Se manda una frase simple que el servidor ya entiende
      const texto = (r.tipo === 'ingreso' ? 'Recibiste $ ' + r.monto + ' de ' : 'Pagaste $ ' + r.monto + ' a ') + r.quien;
      UrlFetchApp.fetch(URL_INGESTA, {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true,
        payload: JSON.stringify({ app: remitente.slice(0, 30), title: '', text: texto, id: m.getId(),
          fecha: Utilities.formatDate(m.getDate(), 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd') })
      });
    });
    hilo.addLabel(etiqueta);
  });
}

function sinAcentos(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

function esPropio(nombre, texto) {
  const mios = sinAcentos(MI_NOMBRE + ' ' + ((texto.match(/hola,?\s+([a-zñáéíóú ]{3,60}?)[,:]/i) || [])[1] || ''))
    .split(/\s+/).filter(function (w) { return w.length > 2 && w !== 'pegar' && w !== 'nombre'; });
  const suyos = sinAcentos(nombre).split(/\s+/).filter(function (w) { return w.length > 2; });
  if (!suyos.length) return false;
  const comunes = suyos.filter(function (w) { return mios.indexOf(w) >= 0; }).length;
  return comunes >= Math.min(3, suyos.length);
}

function interpretar(asunto, cuerpo) {
  const t = (asunto + '. ' + cuerpo).replace(/\s+/g, ' ');
  const n = sinAcentos(t);
  // Duplicados y avisos que no son movimientos
  if (/aviso transferencia inmediata debitada/.test(n)) return null;            // BBVA repite la transferencia
  if (/(sospechos|bloqueamos|lista de espera|promo|descuento|sorteo|rendimiento|resumen de cuenta|beneficio)/.test(n)
      && !/(realizaste|pagaste|transferiste|recibiste|enviaste)/.test(sinAcentos(asunto))) return null;
  const ingreso = /(recibiste|te (transfirieron|enviaron|pagaron|devolvieron|depositaron)|se acredito|acreditamos|ingresaron|cobraste)/.test(n);
  const gasto = /(realizaste (una|un|la siguiente) (transferencia|pago|compra)|has realizado (una|un) (transferencia|pago)|hiciste (una|un) (transferencia|pago)|pagaste|transferiste|enviaste|compraste|compra (aprobada|realizada)|pago (aprobado|realizado|exitoso|confirmado)|transferencia (enviada|realizada)|debitamos|se debito)/.test(n);
  if (!ingreso && !gasto) return null;

  // Monto: "$ 17.600,00", "ARS 17.600,00" o "3,800 ARS"
  let monto = 0;
  const m1 = t.match(/(?:importe|monto(?: enviado)?|total)\D{0,25}?(?:\$|ARS)\s?([\d.,]+)/i)
    || t.match(/(?:\$|ARS)\s?(\d[\d.,]*)/i) || t.match(/(\d[\d.,]*)\s?ARS/i);
  if (m1) {
    let s = m1[1].replace(/[.,]$/, '');
    if (/^\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, '');               // 3,800 (formato US)
    else if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');  // 17.600,00
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');          // 17.600
    monto = parseFloat(s);
  }
  if (!(monto > 0)) return null;

  // Destinatario / comercio
  let quien = (t.match(/(?:destinatario|beneficiario|comercio|nombre del destinatario)\s*:?\s+(?:fecha y hora\s+)?([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ'. ]{2,50}?)(?=\s+(?:cbu|cvu|cuit|cuil|alias|fecha|llave|n[uú]mero|banco|importe|monto|\d)|[.|]|$)/i) || [])[1]
    || (t.match(/(?:transferencia|pago|enviaste [\d.,]+ ars) a ([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ ]{2,50}?)(?=[.,]|\s+hemos|$)/i) || [])[1]
    || (t.match(/(?:\$|ARS)\s?[\d.,]+\s+(?:a|en)\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ'. ]{1,50}?)(?=\s+(?:con|por|desde)\b|[.,|]|$)/i) || [])[1]
    || '';
  quien = quien.replace(/^(?:(?:fecha y hora|fecha|hora)\s+)+/i, '').trim();
  if (quien && esPropio(quien, t)) return null; // transferencia entre cuentas propias
  const concepto = (t.match(/concepto\s+\$?\s?[\d.,]*\s*([A-Za-zÁÉÍÓÚÑáéíóúñ][^.|]{1,30}?)(?=\s+si no fuiste|\s{2}|[.|]|$)/i) || [])[1];
  quien = (quien || (ingreso ? 'cobro' : 'pago')) + (concepto && !/^(varios|si no)/i.test(concepto) ? ' - ' + concepto.trim() : '');
  return { tipo: ingreso ? 'ingreso' : 'gasto', monto: String(monto).replace('.', ','), quien: quien.slice(0, 60) };
}

function instalar() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('revisarMails').timeBased().everyMinutes(5).create();
  revisarMails();
}
