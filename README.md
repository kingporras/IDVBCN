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
- `data.json` contiene jugadores, partidos, asistencia inicial y votos base.
- La app intenta cargar `data.json` vía `fetch`; si falla, usa fallback embebido en `script.js`.
- Ediciones y acciones del usuario se guardan en `localStorage`.
