# EL INTER DE VERDUN - App móvil web

SPA en **HTML + CSS + JS** (sin frameworks), preparada para GitHub Pages.

## Ejecutar en local
```bash
python3 -m http.server 4173
```
Abrir: `http://localhost:4173`

## Publicar en GitHub Pages
1. Subir cambios a la rama principal del repositorio.
2. En GitHub: **Settings → Pages**.
3. Seleccionar **Deploy from a branch**.
4. Elegir rama (`main` o la que use el repo) y carpeta `/ (root)`.
5. Guardar y esperar el despliegue.

## Datos
- La app carga jugadores, partidos, asistencia y votos MVP directamente desde Supabase.
- El flujo de MVP persiste únicamente en `public.mvp_votes` mediante `upsert`.
- Se mantiene `localStorage` solo para utilidades de panel admin (mock email y overrides locales), no para MVP.
