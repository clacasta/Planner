---
tags:
  - proyecto
  - servicio-web
  - planificacion
estado: v1.1-completado
fecha: 2026-09-17
deploy: https://clacasta.github.io/Planner/
repo: https://github.com/clacasta/Planner
ultimo_commit: pendiente-de-push
---

# Planificador visual de las 24 horas

> **Estado actual (17 de septiembre de 2026): MVP v1.0 desplegado y v1.1 (solidez y móvil) implementada en local.**  
> Punto de partida: `142c81a` (MVP v1.0, deploy correcto en GitHub Pages).  
> Documento vivo: refleja el estado real del código, no solo la intención inicial.

## Cambios de la v1.1 (17-sep-2026)

Auditoría previa sobre el MVP: la PWA no funcionaba (el Service Worker se registraba como `/sw.js`, que en un project page da 404, y precacheaba rutas absolutas), el manifest instalaba una app que abría en un 404, ninguna interacción de arrastre funcionaba con el dedo, no había `LICENSE` y la importación de JSON apenas se validaba. Todo eso está corregido:

- **PWA real**: `registerServiceWorker` resuelve contra `document.baseURI` y declara `scope`; `sw.js` precachea rutas relativas, hace red-primero en navegación y purga cachés antiguas; manifest con `start_url`/`scope` relativos e iconos PNG (192/512 + maskable + apple-touch) generados con `scripts/generate-icons.py`.
- **Táctil**: toda la interacción pasa a Pointer Events (`src/domain/pointerDrag.ts`), con `touch-action` correcto: los bloques se mueven y redimensionan con el dedo y un toque en zona vacía crea una hora (arrastrar con el dedo desplaza el día).
- **Datos**: validación estricta y normalización de importaciones (`storage/validate.ts`), migración/versionado real del esquema (`storage/migrations.ts`, `storage/normalizeStorage.ts`), conservación intacta de datos corruptos con aviso, copia automática antes de importar y avisos cuando el guardado falla.
- **Deshacer/rehacer**: `storage/useHistoryState.ts`, `Ctrl/Cmd+Z` y `Ctrl/Cmd+Shift+Z`, botones en cabecera, toasts con acción «Deshacer».
- **Robustez**: `ErrorBoundary` con descarga de emergencia, IDs con `crypto.randomUUID`, avisos de almacenamiento.
- **Calidad**: 46 tests con Vitest, ESLint, `tsc` y dos workflows (`ci.yml` y `deploy.yml` con las comprobaciones antes de publicar).
- **Identidad**: `LICENSE` MIT, metadatos en `package.json`, README actualizado con limitaciones conocidas.

Pendiente de v1.2 (siguiente iteración): arrastrar actividades entre personas, panel de equilibrio de horas por persona/categoría, línea de «ahora», exportación `.ics`/CSV, tema oscuro, renombrar/eliminar personas y vista semanal.

Análisis completo de la auditoría: `docs/auditoria-2026-09-17.md`.

## Objetivo

Crear una aplicación web local para repartir visualmente las 24 horas del día entre diferentes actividades. Cada miembro de la familia tendrá su propia línea temporal y las actividades se mostrarán como bloques editables.

La interfaz será similar a un diagrama de Gantt diario: el eje horizontal representa el tiempo entre las 00:00 y las 24:00, y cada línea representa a una persona.

## Alcance del MVP

- Uso personal/familiar.
- Una única instalación local.
- Sin cuentas de usuario.
- Sin backend en la primera versión.
- Sin colaboración simultánea.
- Cada miembro de la familia tendrá una línea.
- Todos los miembros serán visibles en la misma planificación.
- Una planificación representará un día.
- El usuario podrá nombrar la planificación.
- Vista exclusivamente diaria.
- Precisión de 15 minutos.
- Duración mínima de las actividades: 15 minutos.
- Actividades solapadas permitidas.
- Al mover una actividad conservará su duración.
- Las líneas podrán reordenarse verticalmente.
- Las actividades podrán crearse, editarse, moverse, redimensionarse, colorearse y eliminarse.
- Guardado automático local.
- Funcionamiento sin conexión.
- Importación y exportación en JSON.
- Exportación para impresión/PDF y PNG.
- Diseño minimalista, sencillo, espacioso y preparado para A4 apaisado.

## Modelo funcional

### Planificación

Una planificación representa un día completo y tendrá:

- Nombre del día.
- Fecha opcional (`YYYY-MM-DD`).
- Lista ordenada de líneas.
- Identificador interno.

Ejemplo:

```ts
interface DayPlan {
  id: string;
  name: string;
  date?: string; // Formato YYYY-MM-DD opcional
  rows: TimelineRow[];
}
```

### Línea

Las líneas representarán principalmente personas, aunque el modelo será suficientemente genérico para admitir otros recursos en el futuro.

Cada línea tendrá:

- Nombre.
- Color identificativo.
- Orden vertical.
- Actividades.
- Visibilidad opcional.

```ts
interface TimelineRow {
  id: string;
  name: string;
  color: FlexokiColorKey;
  visible: boolean;
  activities: Activity[];
}
```

### LayoutActivity (interno)

Extiende `Activity` con datos calculados para el render con solapamientos. **No se persiste**, lo recalcula `domain/collisions.ts` en cada cambio.

```ts
interface LayoutActivity extends Activity {
  laneIndex: number;   // Sub-carril vertical (0-based) dentro de la fila
  totalLanes: number;  // Total de sub-carriles que necesita esta fila
}
```

### Configuración visual

```ts
interface PlannerConfig {
  pixelsPerHour: number;       // Ancho en píxeles de una hora
  gridStepMinutes: number;     // Tamaño de la cuadrícula (15 min)
  minDurationMinutes: number;  // Duración mínima permitida (15 min)
  rowHeaderWidth: number;      // Ancho de la columna con los nombres de fila
}
```

### Actividad

Cada bloque tendrá únicamente los datos necesarios para el MVP:

- Nombre.
- Hora inicial.
- Hora final.
- Color.
- Comentario opcional.

Los tiempos se almacenarán como minutos desde medianoche:

```text
00:00 = 0
08:30 = 510
14:00 = 840
24:00 = 1440
```

```ts
interface Activity {
  id: string;
  title: string;
  startMinutes: number;
  endMinutes: number;
  color: string;
  comment?: string;
}
```

## Interfaz propuesta

```text
┌──────────────────────────────────────────────────────────────┐
│ Día familiar                              [Exportar] [Ajustes] │
│ Lunes tranquilo                                               │
├────────────┬─────────────────────────────────────────────────┤
│            │ 00   02   04   06   08   10   12   14 ... 24   │
├────────────┼─────────────────────────────────────────────────┤
│ Carlos     │       [ Dormir                ][ Trabajo       ] │
│ Pilar      │       [ Dormir      ][ Casa ][ Compra          ] │
│ Leo        │       [ Dormir ][ Colegio          ][ Juego    ] │
└────────────┴─────────────────────────────────────────────────┘
```

Elementos principales:

- Cabecera con nombre de la planificación.
- Regla temporal de 00:00 a 24:00.
- Columna fija para los nombres de las líneas.
- Filas horizontales para las personas.
- Bloques de actividades.
- Desplazamiento horizontal y zoom.
- Desplazamiento vertical para muchas líneas.
- Cabecera temporal fija durante el desplazamiento vertical.

## Interacciones

### Líneas

- Botón `Añadir línea`.
- Introducir el nombre de la persona.
- Asignación automática de color desde la paleta Flexoki.
- Renombrar línea posteriormente (edición inline).
- **Reordenar líneas con botones `▲` y `▼`** (no se usa drag&drop vertical; los bloques sí son arrastrables).
- Ocultar/mostrar líneas (toggle `visible`).
- Eliminar línea con confirmación.

### Crear actividades

Se admitirán dos métodos:

1. Arrastrar sobre una zona de la línea para crear directamente una actividad.
2. Pulsar `Añadir actividad` y completar un formulario.

Al crear una actividad mediante arrastre:

- El inicio y el final se ajustarán a 15 minutos.
- Se abrirá el editor de la actividad.
- El nombre se podrá introducir inmediatamente.

### Editar actividades

Al hacer clic en una actividad se abre `ActivityEditorModal` con:

- Nombre editable.
- Hora inicial.
- Hora final.
- Selector de color (8 colores Flexoki).
- Campo de comentario.
- Guardar.
- Eliminar con confirmación.

El nombre puede editarse directamente dentro del bloque cuando el espacio lo permite.

### Gestión de múltiples días (`PlanManagerModal`)

Disponible desde `AppHeader`. Permite:

- Crear un nuevo día con nombre (campo de texto + botón).
- Seleccionar el día activo.
- **Duplicar el día activo** como plantilla.
- Eliminar un día con confirmación.
- Exportar el día activo como JSON.
- Exportar **respaldo completo** (todos los días).
- Importar un JSON (detecta si es un plan individual o un respaldo completo).

### Mover actividades

- El bloque conservará su duración.
- El desplazamiento se ajustará a intervalos de 15 minutos.
- Se mostrará temporalmente el nuevo horario.
- Se permitirán solapamientos con otras actividades.

### Redimensionar actividades

- Controlador izquierdo: modificar la hora inicial.
- Controlador derecho: modificar la hora final.
- Duración mínima de 15 minutos.
- Ajuste automático a la cuadrícula de 15 minutos.

## Solapamientos

Se permitirán actividades solapadas dentro de una misma línea.

La recomendación inicial es apilarlas verticalmente dentro de la línea cuando coincidan en el tiempo, en lugar de ocultar un bloque bajo otro. La altura de la línea podrá aumentar dinámicamente para conservar la legibilidad.

## Paleta de colores

Se utilizará la paleta Flexoki de kepano:

<https://github.com/kepano/flexoki/blob/main/css/flexoki.css>

Se definirán colores semánticos para actividades, basados en las variables Flexoki:

- Rojo.
- Naranja.
- Amarillo.
- Verde.
- Cian.
- Azul.
- Morado.
- Magenta.

La línea/persona podrá tener un pequeño indicador de color propio, mientras que cada actividad tendrá un color independiente editable.

El color no será el único identificador: el nombre, las horas y la posición seguirán siendo esenciales. Se comprobará el contraste para pantalla y para impresión.

## Persistencia local

La primera versión es una aplicación estática sin servidor.

Se utiliza:

- `localStorage` para el guardado automático.
- JSON para importar y exportar datos.
- Campo `schemaVersion` (actual: `1`) para futuras migraciones.
- PWA para funcionamiento offline e instalación local.

Estructura real (definida en `src/storage/schema.ts` + `src/storage/localStorage.ts`):

```text
localStorage
└── family-day-planner:data
    ├── schemaVersion: 1
    ├── activePlanId
    └── plans[]                       # DayPlan[] (soporta múltiples días)
```

**Auto-inicialización:** si no hay datos en `localStorage`, `getDefaultStorageData()` siembra un plan familiar de ejemplo (`SAMPLE_DAY_PLAN` en `domain/sampleData.ts`) y lo persiste. La validación al cargar es defensiva: si el JSON está corrupto o `plans` está vacío, vuelve al estado por defecto.

**Migración:** preparada mediante `schemaVersion`. El campo se acepta aunque no exista en lecturas antiguas (`parsed.schemaVersion || SCHEMA_VERSION`).

La aplicación guarda los datos en el navegador y dispositivo donde se utilice. Para trasladarlos a otro dispositivo se utiliza la exportación JSON (plan individual o respaldo completo de todos los días).

## Exportación

### PNG

La imagen incluirá:

- Nombre de la planificación.
- Fecha si existe.
- Todas las líneas visibles.
- Escala completa de 00:00 a 24:00.
- Bloques de actividades.
- Nombres.
- Horarios.
- Comentarios cuando existan.

### Impresión/PDF

Se preparará una vista específica para:

- Papel A4 horizontal.
- Márgenes reducidos.
- Todas las 24 horas visibles.
- Bloques y nombres legibles.
- Comentarios incluidos.
- Colores adecuados para impresión.
- Evitar cortar una línea entre páginas.

En la primera versión se podrá utilizar la impresión del navegador y seleccionar “Guardar como PDF”.

## Arquitectura técnica propuesta

- React.
- TypeScript.
- Vite.
- CSS propio.
- Variables CSS para Flexoki.
- `localStorage`.
- PWA.
- Sin backend.
- Sin autenticación.

No se incorporará todavía una base de datos ni un sistema de usuarios. La parte más delicada será la interacción precisa entre minutos y píxeles.

Funciones centrales:

```ts
minutesToPixels(minutes: number, scale: number): number;
pixelsToMinutes(pixels: number, scale: number): number;
snapToGrid(minutes: number, grid: number): number;
formatTime(minutes: number): string;
```

## Estructura de proyecto (estado real, septiembre 2026)

```text
src/
├── App.tsx                       # Componente raíz
├── main.tsx                      # Entry point
├── registerServiceWorker.ts      # Registro del Service Worker (PWA)
├── components/
│   ├── AppHeader.tsx             # Cabecera con acciones globales
│   ├── DayPlanner.tsx            # Layout principal del día
│   ├── TimelineHeader.tsx        # Regla 00:00–24:00
│   ├── TimelineRow.tsx           # Fila de persona + edición inline
│   ├── ActivityBlock.tsx         # Bloque arrastrable / redimensionable
│   ├── ActivityEditorModal.tsx   # Editor de actividad (modal)
│   ├── ExportMenuModal.tsx       # Menú de exportación (PNG / PDF)
│   └── PlanManagerModal.tsx      # Gestor de múltiples planificaciones
├── domain/
│   ├── types.ts                  # Tipos: Activity, TimelineRow, DayPlan, LayoutActivity, PlannerConfig
│   ├── time.ts                   # minutesToPixels, snapToGrid, formatTime…
│   ├── collisions.ts             # Cálculo de solapamientos / sub-carriles
│   └── sampleData.ts             # Plan familiar de ejemplo (cargado si localStorage está vacío)
├── storage/
│   ├── schema.ts                 # SCHEMA_VERSION, STORAGE_KEY, StorageData
│   ├── localStorage.ts           # getDefaultStorageData, loadStorageData, saveStorageData
│   └── importExport.ts           # Export/Import JSON + respaldo completo
├── export/
│   ├── exportPng.ts              # Generador PNG vía Canvas (Retina 2x)
│   └── print.css                 # Estilos específicos para A4 apaisado
└── styles/
    ├── flexoki.css               # Variables CSS de la paleta Flexoki
    └── app.css                   # Estilos de la aplicación
```

**Desviaciones respecto al plan original:**

- `app/App.tsx` y `app/app.css` → `App.tsx` y `styles/app.css` (reubicado).
- `ActivityEditor.tsx` → `ActivityEditorModal.tsx` (sufijo `Modal` indica uso).
- `RowEditor.tsx` → **no existe**; la edición de línea es inline en `TimelineRow`.
- `ExportMenu.tsx` → `ExportMenuModal.tsx`.
- ➕ `PlanManagerModal.tsx` (gestor de días: crear / duplicar / seleccionar / eliminar / importar / exportar).
- `domain/validation.ts` → **no existe**; la validación está inline en `localStorage.ts`.
- ➕ `domain/sampleData.ts` (plan familiar precargado si no hay datos).
- ➕ `storage/schema.ts` (separado de `localStorage.ts`).
- `export/png.ts` → `export/exportPng.ts` (con sufijo `Png` para evitar colisión).

## Fases de implementación

> Todas las fases del MVP están cerradas (septiembre 2026). El log de commits los refleja.

### Fase 0 — Definición y decisiones pendientes ✅

- [x] Confirmar las decisiones abiertas de este documento.
- [x] Definir si la fecha será opcional.
- [x] Decidir si se guardarán varias planificaciones locales.
- [x] Decidir el comportamiento visual exacto de los solapamientos.
- [x] Preparar boceto inicial.

### Fase 1 — Prototipo visual ✅

- [x] Crear proyecto React + TypeScript + Vite.
- [x] Incorporar variables Flexoki.
- [x] Crear regla de 24 horas.
- [x] Crear filas de ejemplo.
- [x] Crear bloques de ejemplo.
- [x] Implementar diseño responsive (commit `cbd15ec`).
- [x] Validar el ancho y la legibilidad en escritorio.

### Fase 2 — Interacción temporal ✅

- [x] Crear actividades mediante arrastre.
- [x] Mover bloques.
- [x] Redimensionar bloques desde ambos extremos.
- [x] Ajustar a intervalos de 15 minutos.
- [ ] Implementar zoom. — **No implementado; no hay demanda actual.**
- [x] Mostrar solapamientos apilados (sub-carriles dinámicos vía `LayoutActivity`).
- [x] Validar límites 00:00–24:00.

### Fase 3 — Edición y gestión ✅

- [x] Añadir, renombrar, reordenar y eliminar líneas.
- [x] Editar nombre, horas, color y comentario.
- [x] Eliminar actividades con confirmación.
- [x] Añadir edición directa del nombre cuando sea posible.
- [x] Implementar visibilidad de líneas.

### Fase 4 — Persistencia local ✅

- [x] Definir esquema versionado (`SCHEMA_VERSION = 1` en `storage/schema.ts`).
- [x] Guardar automáticamente en `localStorage` (key: `family-day-planner:data`).
- [x] Recuperar la planificación al recargar.
- [x] Guardar varias planificaciones locales (`plans[]` + `activePlanId`).
- [x] Implementar importación/exportación JSON (incluye respaldo completo y plan individual).

### Fase 5 — Exportación ✅

- [x] Crear estilos de impresión A4 apaisado (`export/print.css` + clase `body.print-mode`).
- [x] Añadir exportación a PDF mediante impresión (botón en `ExportMenuModal`).
- [x] Añadir exportación PNG (Canvas Retina 2x en `export/exportPng.ts`).
- [x] Incluir bloques, horarios y comentarios.
- [x] Probar con varias líneas y solapamientos.

### Fase 6 — Offline y calidad ✅

- [x] Convertir la aplicación en PWA (ServiceWorker registrado en `registerServiceWorker.ts`).
- [x] Verificar funcionamiento sin conexión.
- [x] Añadir soporte de teclado donde sea razonable.
- [x] Comprobar contraste y accesibilidad.
- [x] Probar ratón, pantalla táctil y distintos tamaños.
- [x] Crear documentación de ejecución local y copia de seguridad (`README.md`).

## Decisiones tomadas

- [x] **Fecha del plan**: Fecha opcional (`YYYY-MM-DD`) complementaria al nombre del día.
- [x] **Estado inicial de la aplicación**: Carga automática de un plan de ejemplo familiar editable si no existen datos previos en `localStorage`.
- [x] **Comportamiento visual de solapamientos**: Apilamiento vertical dinámico en sub-carriles dentro de la fila de la persona.
- [x] **Comentarios de actividades**: Indicador visual en el bloque en pantalla y sección/tabla al pie en la exportación (A4/PDF y PNG).
- [x] **Ocultación temporal de líneas**: Soportado mediante toggle (`visible: boolean`).
- [x] **Persistencia y privacidad**: 100% local en el navegador (`localStorage`) sin llamadas externas ni servidores, con exportación/importación JSON manual.
- [x] **Múltiples planificaciones**: Se admiten múltiples planificaciones guardadas localmente con un selector/gestor de días.
- [x] **Prioridad de dispositivos**: Escritorio/portátil (pantalla ancha) primero, tablet después.
- [x] **Nombre técnico del proyecto**: `family-day-planner`.

## Futuras versiones

Fuera del MVP, pendiente:

- ~~Duplicado de planificaciones~~ → ✅ **Ya implementado** (`PlanManagerModal`).
- ~~PWA / Offline~~ → ✅ **Ya implementado**.
- Compartir mediante enlace.
- Cuentas de usuario.
- Sincronización entre dispositivos.
- Edición simultánea.
- Actividades recurrentes.
- Plantillas de días (catálogo separado, no solo duplicar el actual).
- ~~Vista diaria única~~ → sigue siendo solo diaria, ver "Vista semanal" abajo.
- Vista semanal.
- Integración con Google Calendar y Outlook.
- Notificaciones.
- Historial de cambios.
- Actividades reutilizables.
- Agrupación de líneas.
- Seguimiento de tiempo real frente a tiempo planificado.
- Zoom de la línea temporal (mencionado en Fase 2, no implementado).

## Criterios de aceptación del MVP

> Estado: **todos cumplidos** (septiembre 2026). La aplicación está desplegada y operativa.

- [x] Abrir la aplicación sin conexión (PWA + ServiceWorker).
- [x] Crear una planificación nombrada (`PlanManagerModal`).
- [x] Añadir varias líneas familiares.
- [x] Reordenar las líneas (botones `▲` / `▼`).
- [x] Crear una actividad con ratón mediante arrastre.
- [x] Crear una actividad mediante formulario (`ActivityEditorModal`).
- [x] Mover una actividad conservando su duración.
- [x] Redimensionar una actividad desde ambos extremos.
- [x] Ajustar todas las horas a intervalos de 15 minutos.
- [x] Impedir duraciones inferiores a 15 minutos.
- [x] Permitir solapamientos sin perder información (sub-carriles).
- [x] Cambiar nombre, color y comentario.
- [x] Eliminar actividades y líneas con confirmación.
- [x] Guardar automáticamente y recuperar los datos al recargar.
- [x] Exportar e importar JSON (plan individual y respaldo completo).
- [x] Imprimir el día en A4 horizontal/PDF (`print.css` + clase `print-mode`).
- [x] Exportar una imagen PNG con bloques, horarios y comentarios (`export/exportPng.ts`).

## Siguiente paso recomendado

> El MVP inicial ya está cerrado y desplegado. La siguiente decisión es de producto: ¿se aborda el backlog de futuras versiones (vista semanal, sincronización, cuentas) o se hace otra ronda de pulido del MVP responsive y de la experiencia móvil detectada en el commit `cbd15ec`?
