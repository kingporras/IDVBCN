# EL INTER DE VERDUN - App móvil web

SPA en **HTML + CSS + JavaScript**, sin React, sin Vite y sin framework. Está preparada para GitHub Pages y usa Supabase para autenticación, jugadores, partidos, convocatoria, MVP, alineaciones, actas y estadísticas.

## Ejecutar en local

```bash
python -m http.server 4173
```

Abrir: `http://localhost:4173`

## Publicar en GitHub Pages

1. Subir cambios a la rama principal del repositorio.
2. En GitHub: **Settings -> Pages**.
3. Seleccionar **Deploy from a branch**.
4. Elegir rama `main` y carpeta `/ (root)`.
5. Guardar y esperar el despliegue.

## Supabase

La app usa la clave pública del frontend y nunca debe incluir `service_role` ni secretos en `script.js`.

SQL existente:
- `supabase_acta_admin_schema.sql`: acta/resultados y RPC admin.
- `supabase_backfill_match_results_2026.sql`: resultados históricos.
- `supabase_platform_modules_schema.sql`: pagos/cuotas, Inter TV persistente, medios de jugador, contenido IA y palmarés.

Para activar los módulos nuevos de plataforma, pega **todo** `supabase_platform_modules_schema.sql` en el SQL Editor de Supabase y ejecútalo una sola vez. Es idempotente y usa RLS:
- Pagos: solo admin puede leer/escribir.
- Inter TV, medios de jugador y palmarés: jugadores autenticados pueden leer; solo admin escribe.
- IA generada: solo admin.

## HeyGen y Hugging Face

HeyGen queda preparado como capa opcional manual: el admin puede generar/copiar guiones y pegar una URL de vídeo. No hay llamadas automáticas a la API.

Hugging Face queda como módulo preparado con fallback local. Si se conecta en el futuro, el token debe vivir en una variable de entorno de una Supabase Edge Function o backend seguro, nunca en el JavaScript público de GitHub Pages.

## Smoke test recomendado

- Login jugador y login admin.
- Home: próximo partido, actualizar app, mensaje, Inter TV, jugador destacado, último partido.
- Convocatoria: Voy, Duda y No voy.
- Calendario: filtros y modal de partido.
- Club: estadísticas, palmarés, ranking, plantilla, rivales y enlaces oficiales.
- MVP: voto, ranking, podio y último MVP.
- Admin: acta, alineación, imagen convocatoria, Inter TV, Inter AI y pagos.
- Generar imagen convocatoria PNG.
- Recargar app con service worker activo.
