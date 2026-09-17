# 🕒 Family Day Planner

> **Planificador visual familiar de las 24 horas del día**, estilo diagrama de Gantt diario, diseñado para repartir y organizar visualmente las actividades de cada miembro de la familia.
> 
> *A visual, 24-hour daily Gantt-style family planner to organize and balance activities across family members.*

[![Live Demo](https://img.shields.io/badge/Live_Demo-205EA6?style=for-the-badge&logo=github&logoColor=white)](https://clacasta.github.io/Planner/)
[![Licencia: MIT](https://img.shields.io/badge/licencia-MIT-blue.svg)](LICENSE)
![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.2-646cff.svg?logo=vite)
![Paleta](https://img.shields.io/badge/Paleta-Flexoki-AD8301.svg)
![PWA](https://img.shields.io/badge/PWA-Offline_Ready-24837B.svg)

---

🟢 **[Abrir Family Day Planner →](https://clacasta.github.io/Planner/)** — desplegado con GitHub Pages, 100% local-first (tus datos se quedan en tu navegador).

---

**Idiomas / Languages:** [Español](#-español) • [English](#-english)

---

# 🇪🇸 Español

## ✨ Características principales

- **Vista continua de 24 horas (00:00 - 24:00)**: Escala temporal completa con marcas horarias y cuadrícula de 15 minutos.
- **Líneas familiares personalizables**: Cada miembro de la familia cuenta con su propia línea temporal, color identificativo, botones de reordenación vertical (`▲` y `▼`) y conmutador de visibilidad.
- **Manipulación interactiva fluida**:
  - **Crear por arrastre**: Haz clic y arrastra sobre cualquier zona libre de una fila para crear una actividad con ajuste automático a 15 min y apertura inmediata del editor.
  - **Mover actividades**: Arrastra horizontalmente cualquier bloque conservando su duración exacta dentro de los límites del día.
  - **Redimensionar bilateralmente**: Ajusta la hora inicial o final tirando de los extremos izquierdo y derecho (duración mínima 15 min).
  - **Ajuste a cuadrícula (`snap-to-grid`)**: Todos los horarios se ajustan a incrementos de 15 minutos.
- **Gestión inteligente de solapamientos**: Si coinciden varias actividades en una misma persona, la fila se expande verticalmente y los bloques se apilan en sub-carriles sin ocultarse entre sí.
- **Editor completo de actividades**:
  - Título y notas / comentarios opcionales.
  - Ajuste de horas de inicio y fin (`HH:MM`).
  - Selector con los 8 colores de la paleta **Flexoki**.
  - Botón de eliminación con confirmación.
- **Persistencia local 100% en el cliente (`Local-First`)**:
  - Auto-guardado instantáneo en `localStorage` bajo clave versionada.
  - **Gestor multidía**: Crea nuevos días, cambia de día activo, duplica días como plantillas o elimina días no deseados.
  - **Copias de seguridad JSON**: Exporta e importa archivos `.json` para copias de seguridad o sincronización manual entre dispositivos.
- **Exportación multipropósito**:
  - **Impresión / PDF en A4 apaisado**: Diseño adaptado al ancho del papel con tabla de notas y comentarios al pie.
  - **Descarga de imagen PNG**: Generador de imagen en alta resolución (Retina 2x) mediante Canvas.
- **PWA e instalación local (offline de verdad)**: Service Worker registrado con el `base` real del despliegue, caché propia con estrategia red-primero en navegación y manifest con iconos PNG (192/512 + maskable + apple-touch).
- **Interacción táctil completa**: crear, mover y redimensionar funcionan con el dedo, no solo con el ratón. En pantallas táctiles los tiradores se ensanchan y se hacen visibles.
- **Deshacer / rehacer**: historial de hasta 50 cambios con `Ctrl/Cmd+Z` y `Ctrl/Cmd+Shift+Z`, botones en la cabecera y aviso con acción «Deshacer» al eliminar.
- **Importación segura**: validación estricta y normalización del JSON, resumen previo (qué contiene y qué se ha corregido o descartado), copia automática del estado actual antes de aplicar y la importación se puede deshacer.
- **Tus datos, a salvo**: si el almacenamiento guardado está dañado se conserva una copia intacta y se avisa; si no se puede guardar (cuota agotada, navegación privada) aparece un aviso; y si algo falla al dibujar, hay pantalla de error con descarga de emergencia en lugar de página en blanco.
- **Calidad automatizada**: 46 tests con Vitest sobre la lógica de dominio y almacenamiento, ESLint y `tsc` en CI; el despliegue a GitHub Pages se bloquea si algo falla.

---

## 🎨 Paleta de colores Flexoki

La aplicación utiliza la paleta de colores [Flexoki](https://github.com/kepano/flexoki) de Stéphane Martin (@kepano):

| Color | Tono | Uso habitual sugerido |
| :--- | :--- | :--- |
| **Azul** (`#205EA6`) | Principal / Trabajo | Trabajo, oficina, tareas prioritarias |
| **Morado** (`#5E409D`) | Personal / Salud | Consultas médicas, autocuidado |
| **Verde** (`#66800B`) | Descanso / Naturaleza | Dormir, paseos, descanso |
| **Amarillo** (`#AD8301`) | Educación / Familia | Colegio, deberes, comidas en familia |
| **Naranja** (`#BC5215`) | Hogar / Recados | Compras, tareas domésticas, recados |
| **Cian** (`#24837B`) | Deporte / Extraescolar | Gimnasio, natación, actividades |
| **Rojo** (`#AF3029`) | Ocio / Urgente | Juegos, eventos, recordatorios |
| **Magenta** (`#A02F6F`) | Social / Especial | Citas, reuniones, salidas |

---

## 📁 Estructura del proyecto

```text
family-day-planner/
├── public/
│   ├── icons/                 # Iconos PNG (192, 512, maskable, apple-touch)
│   ├── manifest.webmanifest   # Configuración PWA
│   └── sw.js                  # Service Worker (caché offline)
├── src/
│   ├── components/            # Componentes React
│   │   ├── ActivityBlock.tsx       # Bloque interactivo con tiradores
│   │   ├── ActivityEditorModal.tsx # Modal de edición de actividad
│   │   ├── AppHeader.tsx           # Barra superior y acciones
│   │   ├── DayPlanner.tsx          # Contenedor principal de la planificación
│   │   ├── ErrorBoundary.tsx       # Pantalla de error con descarga de datos
│   │   ├── ExportMenuModal.tsx     # Diálogo de opciones de exportación
│   │   ├── PlanManagerModal.tsx    # Gestor de días y copias de seguridad
│   │   ├── TimelineHeader.tsx      # Regla horaria de 24 horas
│   │   └── TimelineRow.tsx         # Fila por persona y zona de arrastre
│   ├── domain/                # Capa lógica y matemática de dominio
│   │   ├── __tests__/              # Tests de dominio (Vitest)
│   │   ├── collisions.ts           # Cálculo de sub-carriles para solapamientos
│   │   ├── id.ts                   # Identificadores únicos (randomUUID)
│   │   ├── pointerDrag.ts          # Gestos unificados ratón/dedo/lápiz
│   │   ├── sampleData.ts           # Datos de ejemplo iniciales
│   │   ├── time.ts                 # Conversión de minutos, px y snap
│   │   └── types.ts                # Tipos e interfaces TypeScript
│   ├── export/                # Módulos de exportación
│   │   ├── exportPng.ts            # Generador de imagen PNG (Canvas 2x)
│   │   └── print.css               # Estilos de impresión A4 apaisado
│   ├── storage/               # Persistencia local
│   │   ├── __tests__/              # Tests de almacenamiento y validación
│   │   ├── importExport.ts         # Exportación y lectura de JSON
│   │   ├── localStorage.ts         # Adaptador de localStorage y copias
│   │   ├── migrations.ts           # Migración/versionado del esquema
│   │   ├── normalizeStorage.ts     # Normalización de datos guardados
│   │   ├── schema.ts               # Esquema de datos versionado
│   │   ├── useHistoryState.ts      # Historial deshacer/rehacer
│   │   └── validate.ts             # Validación estricta de importaciones
│   ├── styles/                # Estilos CSS
│   │   ├── app.css                 # Estilos globales de interfaz
│   │   └── flexoki.css             # Variables de color Flexoki
│   ├── App.tsx                # Componente raíz
│   ├── main.tsx               # Entrada de la aplicación
│   └── registerServiceWorker.ts
├── .github/workflows/         # deploy.yml (Pages) y ci.yml (verificación)
├── eslint.config.js
├── index.html
├── LICENSE
├── package.json
├── plan.md                    # Documento de especificación del proyecto
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## 📱 Interacción: ratón, táctil y teclado

- **Crear**: con ratón, arrastra sobre una línea vacía (se ve la duración en vivo); en pantalla táctil, un **toque** crea una actividad de 1 hora y abre el editor (arrastrar con el dedo desplaza el día, que es lo que se espera en móvil).
- **Mover**: arrastra el bloque en horizontal; conserva su duración.
- **Redimensionar**: arrastra los extremos izquierdo o derecho (mínimo 15 minutos).
- **Atajos**: `Ctrl/Cmd+Z` deshacer · `Ctrl/Cmd+Shift+Z` rehacer · `Esc` cerrar diálogos.

---

## 🧪 Desarrollo, pruebas y CI

```bash
npm run dev         # servidor de desarrollo
npm run build       # tsc + build de producción
npm run preview     # sirve el build (respeta el base /Planner/)
npm run typecheck   # comprobación de tipos
npm run lint        # ESLint
npm run test        # tests (Vitest)
npm run test:watch  # tests en modo vigilancia
```

El workflow `ci.yml` ejecuta tipado, lint, tests y build en cada push y pull request. `deploy.yml` repite esas comprobaciones antes de publicar en GitHub Pages, así que un fallo no llega nunca a producción.

---

## 🚀 Instalación y ejecución local

### Prerrequisitos
- **Node.js** (v18+) y **npm**

```bash
# 1. Clonar el repositorio
git clone https://github.com/clacasta/Planner.git
cd Planner

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo
npm run dev

# 4. Compilar para producción
npm run build
```

---

## ⚠️ Limitaciones conocidas (y siguientes pasos)

- Las actividades **no se pueden arrastrar de una persona a otra**: hay que borrar y volver a crear. Es lo primero de la lista para la v1.2.
- No hay **plantillas ni recurrencia** («todos los martes natación», aplicar un día laborable a lunes-viernes): cada día se duplica a mano.
- Las personas se pueden **añadir, reordenar y ocultar**, pero todavía **no renombrar, recolorear ni eliminar** desde la interfaz.
- La vista es **exclusivamente diaria**: no hay vista semanal ni salto rápido entre días.
- El guardado es por pestaña: si abres la app en **dos pestañas a la vez**, la última en guardar gana.
- Sin recordatorios ni notificaciones.

---

## 🔒 Privacidad y funcionamiento Offline

Esta aplicación es **100% estática y de ejecución local**.
- No requiere cuentas de usuario ni registro.
- No envía datos a servidores externos.
- Todos los datos se almacenan exclusivamente en el almacenamiento local de tu navegador.

---

# 🇬🇧 English

## ✨ Key Features

- **Continuous 24-Hour View (00:00 - 24:00)**: Full daily timeline with hourly indicators and 15-minute grid lines.
- **Customizable Family Rows**: Each family member gets a dedicated timeline row, color accent, vertical reordering buttons (`▲` and `▼`), and visibility toggle.
- **Smooth Interactive Controls**:
  - **Drag-to-Create**: Click and drag on any empty timeline slot to generate a new block with instant 15-minute snap and editor popup.
  - **Move Activities**: Drag activity blocks horizontally while preserving their exact duration within 00:00–24:00 bounds.
  - **Bilateral Resizing**: Adjust start or end times by dragging the left or right edges (minimum 15 min duration).
  - **15-Minute Grid Snap**: Precision snapping for all time adjustments.
- **Smart Collision & Overlap Stacking**: When multiple activities overlap in time for a single person, the row dynamically expands into sub-lanes so no activity is hidden behind another.
- **Full Activity Editor**:
  - Title and optional notes/comments.
  - Exact start and end time inputs (`HH:MM`).
  - 8-color **Flexoki** palette selector.
  - Deletion button with confirmation.
- **100% Local-First Persistence**:
  - Automatic, reactive saving to browser `localStorage` with versioned schema.
  - **Multi-Day Manager**: Create new days, switch active days, duplicate days as templates, or delete old ones.
  - **JSON Backup & Restore**: Export and import `.json` files to backup or transfer data between computers.
- **Multi-Format Export**:
  - **Print / PDF (A4 Landscape)**: Formatted for A4 paper with a dedicated footer table for notes and comments.
  - **High-Definition PNG Download**: Direct Canvas-rendered 2x Retina PNG export.
- **PWA & Offline, for real**: Service worker registered against the actual deployment base with its own cache (network-first navigation), plus a manifest with PNG icons (192/512 + maskable + apple-touch).
- **Full touch support**: creating, moving and resizing work with a finger, not just a mouse; resize handles are wider and always visible on touch screens.
- **Undo / Redo**: 50-step history with `Ctrl/Cmd+Z` and `Ctrl/Cmd+Shift+Z`, header buttons and an "Undo" action on every deletion.
- **Safe imports**: strict JSON validation and normalization, a summary of what the file contains (including corrections and dropped items) before anything is applied, an automatic backup of the current state, and undoable imports.
- **Your data stays yours**: corrupted storage is preserved intact with a clear warning, failed saves (quota, private mode) are surfaced, and a render error shows a recovery screen with an emergency data download instead of a blank page.
- **Automated quality**: 46 Vitest tests over the domain and storage layers, plus ESLint and `tsc` in CI; the Pages deployment is gated on all of them passing.

---

## 🎨 Flexoki Color Palette

Styled with kepano's [Flexoki](https://github.com/kepano/flexoki) color scheme for high contrast and visual clarity on screens and printed paper:

| Color | Hex | Common Usage |
| :--- | :--- | :--- |
| **Blue** (`#205EA6`) | Primary / Work | Work, office, focus tasks |
| **Purple** (`#5E409D`) | Personal / Health | Medical appointments, self-care |
| **Green** (`#66800B`) | Rest / Nature | Sleep, walks, downtime |
| **Yellow** (`#AD8301`) | School / Family | School, homework, family meals |
| **Orange** (`#BC5215`) | Home / Errands | Groceries, chores, phone calls |
| **Cyan** (`#24837B`) | Sports / Activities | Gym, swimming, extracurriculars |
| **Red** (`#AF3029`) | Leisure / Urgent | Games, deadlines, reminders |
| **Magenta** (`#A02F6F`) | Social / Special | Dinners, gatherings, outings |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18+) and **npm**

```bash
# 1. Clone repository
git clone https://github.com/clacasta/Planner.git
cd Planner

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev

# 4. Build for production
npm run build

# Extra: quality checks
npm run typecheck && npm run lint && npm run test
```

---

## ⚠️ Known Limitations

- Activities **cannot be dragged between people** yet (delete and recreate for now).
- No **templates or recurrence** (e.g. "swimming every Tuesday").
- People can be added, reordered and hidden, but **not renamed, recolored or removed** from the UI yet.
- Daily view only: no week view.
- Per-tab storage: opening the app in **two tabs** means the last save wins.

---

## 🔒 Privacy & Local-First Philosophy

- **Zero trackers, zero external servers**: All your family schedules stay in your browser's local storage.
- **Full ownership**: Export all data anytime as portable JSON files.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
