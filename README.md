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
- **PWA e instalación local**: Compatible con Progressive Web App para instalar en el sistema operativo y funcionar 100% sin conexión a internet.

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
│   ├── manifest.webmanifest   # Configuración PWA
│   ├── sw.js                  # Service Worker (offline cache)
│   └── vite.svg               # Icono de aplicación
├── src/
│   ├── components/            # Componentes React
│   │   ├── ActivityBlock.tsx       # Bloque interactivo con tiradores
│   │   ├── ActivityEditorModal.tsx # Modal de edición de actividad
│   │   ├── AppHeader.tsx           # Barra superior y acciones
│   │   ├── DayPlanner.tsx          # Contenedor principal de la planificación
│   │   ├── ExportMenuModal.tsx     # Diálogo de opciones de exportación
│   │   ├── PlanManagerModal.tsx    # Gestor de días y copias de seguridad
│   │   ├── TimelineHeader.tsx      # Regla horaria de 24 horas
│   │   └── TimelineRow.tsx         # Fila por persona y zona de arrastre
│   ├── domain/                # Capa lógica y matemática de dominio
│   │   ├── collisions.ts           # Cálculo de sub-carriles para solapamientos
│   │   ├── sampleData.ts           # Datos de ejemplo iniciales
│   │   ├── time.ts                 # Conversión de minutos, px y snap
│   │   └── types.ts                # Tipos e interfaces TypeScript
│   ├── export/                # Módulos de exportación
│   │   ├── exportPng.ts            # Generador de imagen PNG (Canvas 2x)
│   │   └── print.css               # Estilos de impresión A4 apaisado
│   ├── storage/               # Persistencia local
│   │   ├── importExport.ts         # Validación y lectura/escritura JSON
│   │   ├── localStorage.ts         # Adaptador para localStorage
│   │   └── schema.ts               # Esquema de datos versionado
│   ├── styles/                # Estilos CSS
│   │   ├── app.css                 # Estilos globales de interfaz
│   │   └── flexoki.css             # Variables de color Flexoki
│   ├── App.tsx                # Componente raíz
│   ├── main.tsx               # Entrada de la aplicación
│   └── registerServiceWorker.ts
├── index.html
├── package.json
├── plan.md                    # Documento de especificación del proyecto
├── tsconfig.json
└── vite.config.ts
```

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
- **PWA & Offline Ready**: Progressive Web App ready for native desktop installation and 100% offline usage.

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
```

---

## 🔒 Privacy & Local-First Philosophy

- **Zero trackers, zero external servers**: All your family schedules stay in your browser's local storage.
- **Full ownership**: Export all data anytime as portable JSON files.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
