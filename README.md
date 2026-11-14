# Mis Finanzas (PWA)

App para administrar tus finanzas personales: ingresos, gastos, tarjetas y préstamos, presupuesto, metas de ahorro y gastos fijos. Se instala en el celular y guarda los datos en Supabase.

## Configuración
1. En Supabase, ejecutá `supabase/schema.sql` (en el SQL Editor).
2. Completá `config.js` con la URL del proyecto y la publishable key.
3. En Supabase > Authentication > URL Configuration, poné la URL de GitHub Pages como *Site URL*.

## Publicación
Cada push a `main` se publica solo con GitHub Pages (en Settings > Pages, la fuente tiene que ser **GitHub Actions**).

## Instalar en el celular
Abrí la URL en el navegador:
- **Android (Chrome):** menú ⋮ > *Instalar app*.
- **iPhone (Safari):** botón Compartir > *Agregar a inicio*.

## Backup
En el menú ⋯ de la app tenés *Exportar JSON* e *Importar JSON*.
