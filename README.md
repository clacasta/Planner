# 🕒 Family Day Planner

> **Planificador visual familiar de las 24 horas del día**, estilo diagrama de Gantt diario, diseñado para repartir y organizar visualmente las actividades de cada miembro de la familia.

![Licencia](https://img.shields.io/badge/licencia-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.2-646cff.svg?logo=vite)
![Paleta](https://img.shields.io/badge/Paleta-Flexoki-AD8301.svg)
![PWA](https://img.shields.io/badge/PWA-Offline_Ready-24837B.svg)

---

## ✨ Características principales

- **Vista continua de 24 horas (00:00 - 24:00)**: Escala temporal completa con marcas por hora y subdivisiones de 15 minutos.
- **Líneas familiares personalizables**: Cada persona tiene su propia fila con color identificativo y control de visibilidad.
- **Manipulación interactiva fluida**:
  - **Crear por arrastre**: Haz clic y arrastra sobre cualquier zona libre de una fila para crear una actividad de inmediato.
  - **Mover actividades**: Desplaza cualquier bloque a lo largo del día manteniendo su duración exacta.
  - **Redimensionar bilateralmente**: Ajusta la hora inicial o final desde los extremos izquierdo y derecho.
  - **Ajuste automático a 15 min (`snap-to-grid`)**: Todos los horarios se alinean con precisión a intervalos de 15 minutos (duración mínima 15 min).
- **Gestión inteligente de solapamientos**: Cuando varias actividades coinciden en horario dentro de una misma persona, la fila se expande dinámicamente y las actividades se apilan en sub-carriles sin ocultarse entre sí.
- **Editor completo de actividades**:
  - Título y notas / comentarios opcionales.
  - Selector de horarios (`HH:MM`).
  - Selector con los 8 colores de la paleta **Flexoki**.
  - Botón de eliminación con confirmación.
- **Persistencia local 100% en el cliente (`Local-First`)**:
  - Auto-guardado instantáneo en `localStorage` con esquema versionado.
  - **Gestor multidía**: Crea nuevos días, cambia entre días guardados, duplica días como plantillas o elimina días antiguos.
  - **Copias de seguridad JSON**: Exporta e importa tus planificaciones en archivos `.json` en cualquier momento.
- **Exportación multipropósito**:
  - **Impresión / PDF en A4 apaisado**: Vista adaptada al ancho del papel con tabla de notas y comentarios al pie.
  - **Descarga de imagen PNG**: Generación directa de imagen en alta resolución (Retina 2x).
- **PWA e instalación local**: Compatible con Progressive Web App para instalar como aplicación nativa de escritorio y funcionar 100% sin conexión a internet.

---

## 🎨 Paleta de colores Flexoki

La aplicación utiliza la paleta de colores [Flexoki](https://github.com/kepano/flexoki) de Stéphane Martin (@kepano), optimizada para máxima legibilidad y confort visual tanto en pantalla como en papel impreso:

| Color | Tono | Uso habitual |
| :--- | :--- | :--- |
| **Azul** (`#205EA6`) | Principal / Trabajo | Trabajo, oficina, tareas prioritarias |
| **Morado** (`#5E409D`) | Personal / Salud | Consultas médicas, autocuidado |
| **Verde** (`#66800B`) | Descanso / Naturaleza | Dormir, paseos, descanso |
| **Amarillo** (`#AD8301`) | Educación / Familia | Colegio, deberes, comidas en familia |
| **Naranja** (`#BC5215`) | Hogar / Recados | Compras, tareas domésticas, llamadas |
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
- **Node.js** (versión 18 o superior recomendada)
- **npm**

### 1. Clonar el repositorio
```bash
git clone https://github.com/TU_USUARIO/family-day-planner.git
cd family-day-planner
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Iniciar el servidor de desarrollo
```bash
npm run dev
```
Abre en tu navegador la dirección indicada (por defecto [http://localhost:5173](http://localhost:5173)).

### 4. Compilar para producción
```bash
npm run build
```

---

## 🔒 Privacidad y funcionamiento Offline

Esta aplicación es **100% estática y de ejecución local**. 
- No requiere cuentas de usuario ni registro.
- No envía ningún dato a servidores externos.
- Todos los datos se almacenan exclusivamente en el almacenamiento local de tu propio navegador.
- Puedes exportar e importar copias de seguridad en formato `.json` cuando quieras transferir tus datos a otro ordenador o dispositivo.

---

## 📄 Licencia

Distribuido bajo la Licencia **MIT**. Consulta el archivo `LICENSE` para más información.
