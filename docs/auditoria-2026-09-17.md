---
tipo: analisis-tecnico
proyecto: Planner (Family Day Planner)
repo: https://github.com/clacasta/Planner
deploy: https://clacasta.github.io/Planner/
local: /DATA/Documents/Planificacion
estado: propuesta
fecha: 2026-09-17
commit_analizado: 142c81a
tags:
  - proyecto
  - planificacion
  - auditoria
---

# Análisis del repositorio Planner (Family Day Planner) — 2026-09-17

> Auditoría sobre el estado real del código y del despliegue en `142c81a`.
> Todo lo marcado como **verificado** se comprobó ejecutando el código, `curl`
> contra el sitio desplegado o el navegador con emulación táctil.

## 1. Estado real (verificado)

- `tsc --noEmit` → **sin errores** de tipos.
- `npm run build` en el host falla por entorno (`Cannot find module @rollup/rollup-linux-x64-gnu`,
  binario nativo de rollup ausente en `node_modules`); en CI ubuntu funciona:
  último workflow **completed / success** sobre `142c81a`.
- Live demo https://clacasta.github.io/Planner/ → **200**. `main` local == `main` remoto.
- 7 commits, MVP funcional: creación por arrastre, mover/redimensionar con snap 15 min,
  carriles para solapes, editor de actividades, gestor de días (crear/duplicar/eliminar/importar/exportar),
  export JSON / PNG / impresión A4 apaisado, PWA declarada en README.
- Sin tests, sin lint/formatter, CI solo compila. Repo sin LICENSE, sin topics, sin releases,
  `homepage` sin definir, descripción "Daily Planner".

## 2. Bugs confirmados

### P0 — contradicen lo que promete el README

**B1. La PWA no funciona: el Service Worker no se registra (offline roto).**
- El bundle compilado contiene `register("/sw.js")` (ruta absoluta). Verificado:
  `https://clacasta.github.io/sw.js` → **404**, `https://clacasta.github.io/Planner/sw.js` → **200**.
- `public/sw.js` además precachea rutas absolutas (`/`, `/index.html`, `/vite.svg`,
  `/manifest.webmanifest`) → todas 404 bajo `/Planner/` → `cache.addAll` rechaza → install falla.
- Verificado en navegador: `getRegistrations()` → **0 registros activos**, `caches.keys()` → **[]**,
  `navigator.serviceWorker.controller` → **NO**.
- Fix: `navigator.serviceWorker.register(\`${import.meta.env.BASE_URL}sw.js\`)` y en `sw.js`
  precache relativo (`'', 'index.html', 'vite.svg', 'manifest.webmanifest'`).

**B2. El manifest instala una app que abre en un 404.**
- `start_url: "/"` → al lanzar la PWA instalada abre `https://clacasta.github.io/` → **404 (verificado)**.
- `icons[0].src: "/vite.svg"` → 404; solo SVG (Chrome/Android exige PNG 192/512;
  falta `apple-touch-icon`; `id` y `scope` sin definir).
- Fix: `start_url: "./"`, `scope: "./"`, iconos PNG 192/512 maskable + PNG 180 apple-touch-icon.

**B3. Las interacciones de arrastre no funcionan en táctil (el core en el móvil).**
- `TimelineRow` y `ActivityBlock` usan solo `onMouseDown` + `mousemove`/`mouseup`.
- `grep` de `onTouch|pointerdown|onPointer|touchstart` en `src/` → **ninguno**.
- Verificado con emulación táctil real (CDP `Input.dispatchTouchEvent`) sobre la pista:
  arrastre de 120 px → **15 bloques antes y 15 después**, sin borrador y sin editor.
  El tap sí funciona (evento sintético) y abre el editor.
- Es decir: en el móvil se puede consultar y editar por tap, pero **no crear, mover ni
  redimensionar**. El commit "mobile responsive" dejó la interfaz adaptada, no operable.
- Fix: Pointer Events (`onPointerDown` + `pointermove`/`pointerup` en window) y, crítico,
  `touch-action: none` en `.row-track` y `.activity-block` (sin eso el navegador roba el gesto
  para hacer scroll).

**B4. No existe LICENSE y el README enlaza a una que da 404.**
- `LICENSE` → **404** (verificado en `raw.githubusercontent.com` y en el repo remoto).
- El badge "Licencia: MIT" enlaza a `LICENSE`. Fix: añadir `LICENSE` MIT + `"license"` en package.json.

### P1 — robustez y pérdida de datos

**B5. Importación sin validación profunda (puede romper la app o borrar todo).**
- `isValidDayPlan` solo comprueba `id`, `name`, `rows` (array). Un JSON con `rows: [{}]`
  produce `TypeError` en `row.activities.reduce` (App.tsx footer) → pantalla rota.
- El caso `fullBackup` (`parsed.plans` array) se acepta **sin validar nada** y **reemplaza
  todos los datos** del usuario sin confirmación ni copia previa.
- Fix: validador estricto (zod o manual: `row.{id,name,color,visible,activities[]}`,
  `activity.{id,title,startMinutes,endMinutes,color}` con clamp 0..1440 y `end > start`),
  normalización, previsualización con contadores y copia de seguridad automática antes de importar.

**B6. Datos corruptos en localStorage = pérdida silenciosa.**
- `loadStorageData` devuelve el plan de ejemplo si `JSON.parse` falla y **no conserva el valor
  original**; el autosave inmediato (`useEffect` sobre `storage`) sobrescribe la clave con el ejemplo.
- Fix: preservar el crudo en `family-day-planner:data:corrupt-<fecha>`, avisar con banner y
  no autoguardar hasta que el usuario decida.

**B7. `SCHEMA_VERSION` sin migraciones.** Se escribe pero nunca se lee para migrar; además
`exportAllPlansAsJSON` recibe `schemaVersion: 1` hardcodeado desde `PlanManagerModal`.

**B8. Sin deshacer.** Borrar actividad o día es irreversible (solo `window.confirm`).
Fix: pila de snapshots del plan (20 niveles) + `Ctrl/Cmd+Z` / `Ctrl+Shift+Z` y papelera de días.

**B9. Fallos de guardado invisibles.** Cuota excedida → `console.error` y sigue como si nada.
Fix: banner de error + indicador "Guardado hace X s".

**B10. Sin sincronización entre pestañas.** Dos pestañas abiertas se pisan al guardar.
Fix: escuchar `storage` y reconciliar por `plan.updatedAt`.

**B11. IDs con `Date.now()`.** Dos elementos creados en el mismo milisegundo → clave duplicada
en React (`row-`, `act-`, `plan-`). Fix: `crypto.randomUUID()` con fallback.

**B12. Sin `ErrorBoundary`.** Cualquier error de render deja la pantalla en blanco.

**B13. Gestión de personas incompleta.** Se puede añadir (vía `window.prompt`), reordenar y
ocultar, pero **no renombrar, cambiar color ni eliminar** una persona. Fix: editor de fila en
modal + drag & drop de filas.

**B14. Sin tests ni lint.** `src/domain/{time,collisions}.ts` y `storage/importExport.ts` son
puros y triviales de testear con vitest (snap/clamp/parse/lanes/validación). CI debería hacer
`typecheck + lint + test + build`.

**B15. Accesibilidad.** Modales sin `role="dialog"`/`aria-modal` (verificado: ausente), sin
focus trap ni restauración de foco; no hay alternativa de teclado al arrastre; información
codificada solo por color; `icon-btn` con `title` pero sin `aria-label`.
Atajos propuestos: `N` nueva actividad, `←/→` mover 15 min, `D` duplicar, `Supr` borrar, `+/-` zoom,
`Inicio` ir a ahora.

### P2 — limpieza y pulido

- Código muerto: `PlannerConfig` y `LayoutActivity.totalLanes` no se usan; `rowHeaderWidth={200}`
  hardcodeado en App; `isMobile` derivable.
- `collisions.ts`: first-fit por carriles y `totalLanes` a nivel de fila (el propio comentario
  admite que no agrupa por racimo). Hoy no se nota porque `ActivityBlock` usa altura fija e
  `laneIndex`, pero impide agrupar solapes y calcular alturas por racimo.
- `exportPng.ts` reimplementa el layout (segunda fuente de verdad frente al DOM): extraer un
  renderer compartido o un test de consistencia.
- README: badge v1.0 vs `package.json` 0.1.0; promete offline (falso) y móvil sin matices;
  falta "limitaciones conocidas". UI solo en español aunque el README es bilingüe.
- Repo GitHub: sin `homepage` (debería ser la URL de Pages), sin topics, sin release v1.0,
  descripción genérica. `dist/` local desactualizado (es gitignored, no afecta al deploy).
- Autosave sin debounce (escribe el JSON completo en cada cambio).

## 3. Features propuestas (ordenadas por valor/esfuerzo)

1. **F1. Línea de "ahora" + ir a la hora actual** (esfuerzo bajo, valor diario máximo):
   línea roja vertical, auto-scroll al abrir si `date` == hoy, botón "Ahora".
2. **F2. Panel de equilibrio**: horas ocupadas/libres por persona, desglose por categoría
   (tags de actividad: trabajo, colegio, deporte, ocio, sueño, pantallas) y consulta
   "¿quién está libre a las HH:MM?". Es el propósito declarado del proyecto ("repartir y
   equilibrar") y hoy no se mide de ninguna forma.
3. **F3. Mover/copiar actividad entre personas**: arrastre vertical entre filas (hoy imposible)
   y "duplicar en otra persona" (misma extraescolar para dos hijos). Mayor hueco funcional.
4. **F4. Plantillas y recurrencia**: guardar un día como plantilla, aplicarla a varios días,
   "día laborable" sobre L-V, series tipo "todos los martes natación". Convierte el planner
   de un día en planificador real.
5. **F5. Vista semanal y navegación entre días** (flechas/teclado), selección automática del
   plan de hoy usando el campo `date` (hoy decorativo).
6. **F6. Export a calendario**: `.ics` (con `date`) para Google/Apple Calendar y CSV para Excel;
   compartir con Web Share API.
7. **F7. Undo/redo + papelera** (ver B8) como feature de producto, no solo parche.
8. **F8. Tema oscuro**: Flexoki tiene paleta oscura oficial y ya se usan variables CSS;
   añadir `[data-theme="dark"]` + `prefers-color-scheme`.
9. **F9. Informe semanal imprimible** y opción de incluir/excluir notas en el PDF.
10. **F10. Recordatorios**: notificación antes de la siguiente actividad (solo con pestaña
    abierta) o, mejor, delegar en el calendario del sistema vía `.ics`.
11. **F11. PWA de verdad** (B1+B2): iconos PNG, prompt de instalación, app shortcuts.
12. **F12. Plan vs realidad**: marcar actividades como completadas y comparar tiempo
    planificado con real (salto de producto grande, requiere decisión de diseño).
13. **F13. i18n es/en** (react-i18next), coherente con el README bilingüe.
14. **F14. Sincronización opcional entre dispositivos** (File System Access API sobre una
    carpeta compartida); manteniendo local-first por defecto.

## 4. Roadmap sugerido

- **v1.1 — solidez y móvil** (P0 + P1): B1+B2 (PWA/manifest), B3 (pointer events + touch-action),
  B4 (LICENSE), B5+B6 (validación y no perder datos), B8 (undo), B14 (vitest + lint en CI),
  B15 básica. *Sin features nuevas: dejar lo prometido funcionando.*
- **v1.2 — uso diario**: F1, F2, F3, F6, F8.
- **v2.0 — planificador**: F4, F5, F12, F13.

## 5. Cómo reproducir la auditoría

```bash
cd /DATA/Documents/Planificacion
npx tsc --noEmit                      # tipos: OK
grep -rn "onTouch\|pointerdown\|touchstart" src/   # -> vacío (B3)
grep -o 'register("[^"]*"' dist/assets/*.js        # -> register("/sw.js") (B1)

curl -s -o /dev/null -w '%{http_code}\n' https://clacasta.github.io/sw.js          # 404
curl -s -o /dev/null -w '%{http_code}\n' https://clacasta.github.io/Planner/sw.js  # 200
curl -s -o /dev/null -w '%{http_code}\n' https://clacasta.github.io/               # 404 (start_url)
curl -s -o /dev/null -w '%{http_code}\n' https://raw.githubusercontent.com/clacasta/Planner/main/LICENSE  # 404
```

En navegador (Pages): `navigator.serviceWorker.getRegistrations()` → 0; `caches.keys()` → [];
emulación táctil con `Input.dispatchTouchEvent` sobre `.row-track` → no crea actividad.

---

## Estado de implementación (17-sep-2026, tarde)

La v1.1 se ha implementado y verificado en local, en la rama `v1.1-solidez-y-movil`
(5 commits sobre `142c81a`). Falta solo el `push` (el host no tiene credenciales de GitHub).

Corregido: B1+B2 (PWA y manifest con rutas base-relative, iconos PNG generados), B3
(Pointer Events + `touch-action`, con toque-para-crear en móvil), B4 (`LICENSE` MIT),
B5 (validación estricta + resumen previo + copia antes de importar + import deshacible),
B6 (datos corruptos conservados intactos con aviso), B8 (deshacer/rehacer, 50 niveles),
B11 (`crypto.randomUUID`), B12 (`ErrorBoundary`), B14 (46 tests, ESLint, CI + gate en el deploy),
más avisos de fallo de guardado.

Verificado en navegador (build de producción servido con `vite preview`): SW registrado con
scope `/Planner/` y caché activa; arrastre táctil mueve y redimensiona bloques; toque en zona
vacía crea 1 h y abre el editor; `Ctrl+Z` deshace; import inválido se rechaza y válido se
previsualiza antes de aplicar; datos corruptos → banner + copia conservada.

Queda para v1.2: F3 (mover/copiar entre personas), F2 (panel de equilibrio), F1 (línea de ahora),
F6 (`.ics`/CSV), F8 (tema oscuro), renombrar/eliminar personas y F4/F5 (plantillas, vista semanal).

### F3 implementado (17-sep-2026, misma tarde)

F3 (mover/copiar entre personas) ya está hecho en la rama `v1.2-mover-entre-personas`, encima de
la v1.1 fusionada en `main`: arrastre vertical del bloque a otra línea con resaltado del destino
(el mismo gesto vale para ratón y dedo) y, desde el editor de la actividad, desplegable con
«Mover a» y «Duplicar en» (también en la propia línea, para duplicar). Lógica pura en
`src/domain/planOperations.ts` con 12 tests; verificado en navegador: arrastre de «Dormir» de
Carlos a Pilar con resaltado previo, «Duplicar en Leo» y «Mover a Pilar» desde el editor, y
deshacer con `Ctrl+Z` restaurando el estado. La suite sube a 63 tests.
