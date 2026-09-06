---
tags:
  - proyecto
  - servicio-web
  - planificacion
estado: definido
fecha: 2026-09-06
---

# Planificador visual de las 24 horas

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
  color: string;
  visible: boolean;
  activities: Activity[];
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
- Asignación automática de color.
- Renombrar línea posteriormente.
- Reordenar líneas arrastrándolas verticalmente.
- Ocultar/mostrar líneas.
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

Al hacer clic en una actividad se abrirá un panel o modal con:

- Nombre editable.
- Hora inicial.
- Hora final.
- Selector de color.
- Campo de comentario.
- Guardar.
- Eliminar con confirmación.

El nombre podrá editarse directamente dentro del bloque cuando el espacio lo permita.

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

La primera versión será una aplicación estática sin servidor.

Se utilizará:

- `localStorage` para el guardado automático.
- JSON para importar y exportar datos.
- Campo `schemaVersion` para futuras migraciones.
- PWA para funcionamiento offline e instalación local.

Estructura orientativa:

```text
localStorage
└── day-planner:data
    ├── schemaVersion
    ├── activePlanId
    └── plans[]
```

La aplicación guardará los datos en el navegador y dispositivo donde se utilice. Para trasladarlos a otro dispositivo se utilizará la exportación JSON.

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

## Estructura de proyecto prevista

```text
src/
├── app/
│   ├── App.tsx
│   └── app.css
├── components/
│   ├── DayPlanner.tsx
│   ├── TimelineHeader.tsx
│   ├── TimelineRow.tsx
│   ├── ActivityBlock.tsx
│   ├── ActivityEditor.tsx
│   ├── RowEditor.tsx
│   └── ExportMenu.tsx
├── domain/
│   ├── types.ts
│   ├── time.ts
│   ├── collisions.ts
│   └── validation.ts
├── storage/
│   ├── localStorage.ts
│   └── importExport.ts
├── export/
│   ├── png.ts
│   └── print.css
└── styles/
    └── flexoki.css
```

## Fases de implementación

### Fase 0 — Definición y decisiones pendientes

- Confirmar las decisiones abiertas de este documento.
- Definir si la fecha será opcional.
- Decidir si se guardarán varias planificaciones locales.
- Decidir el comportamiento visual exacto de los solapamientos.
- Preparar boceto inicial.

### Fase 1 — Prototipo visual

- Crear proyecto React + TypeScript + Vite.
- Incorporar variables Flexoki.
- Crear regla de 24 horas.
- Crear filas de ejemplo.
- Crear bloques de ejemplo.
- Implementar diseño responsive.
- Validar el ancho y la legibilidad en escritorio.

### Fase 2 — Interacción temporal

- Crear actividades mediante arrastre.
- Mover bloques.
- Redimensionar bloques desde ambos extremos.
- Ajustar a intervalos de 15 minutos.
- Implementar zoom.
- Mostrar solapamientos apilados.
- Validar límites 00:00–24:00.

### Fase 3 — Edición y gestión

- Añadir, renombrar, reordenar y eliminar líneas.
- Editar nombre, horas, color y comentario.
- Eliminar actividades con confirmación.
- Añadir edición directa del nombre cuando sea posible.
- Implementar visibilidad de líneas.

### Fase 4 — Persistencia local

- Definir esquema versionado.
- Guardar automáticamente en `localStorage`.
- Recuperar la planificación al recargar.
- Guardar varias planificaciones locales si se confirma esta decisión.
- Implementar importación/exportación JSON.

### Fase 5 — Exportación

- Crear estilos de impresión A4 apaisado.
- Añadir exportación a PDF mediante impresión.
- Añadir exportación PNG.
- Incluir bloques, horarios y comentarios.
- Probar con varias líneas y solapamientos.

### Fase 6 — Offline y calidad

- Convertir la aplicación en PWA.
- Verificar funcionamiento sin conexión.
- Añadir soporte de teclado donde sea razonable.
- Comprobar contraste y accesibilidad.
- Probar ratón, pantalla táctil y distintos tamaños.
- Crear documentación de ejecución local y copia de seguridad.

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

Fuera del MVP:

- Compartir mediante enlace.
- Cuentas de usuario.
- Sincronización entre dispositivos.
- Edición simultánea.
- Actividades recurrentes.
- Plantillas de días.
- Duplicado de planificaciones.
- Vista semanal.
- Integración con Google Calendar y Outlook.
- Notificaciones.
- Historial de cambios.
- Actividades reutilizables.
- Agrupación de líneas.
- Seguimiento de tiempo real frente a tiempo planificado.

## Criterios de aceptación del MVP

La primera versión se considerará válida cuando permita:

- Abrir la aplicación sin conexión.
- Crear una planificación nombrada.
- Añadir varias líneas familiares.
- Reordenar las líneas.
- Crear una actividad con ratón mediante arrastre.
- Crear una actividad mediante formulario.
- Mover una actividad conservando su duración.
- Redimensionar una actividad desde ambos extremos.
- Ajustar todas las horas a intervalos de 15 minutos.
- Impedir duraciones inferiores a 15 minutos.
- Permitir solapamientos sin perder información.
- Cambiar nombre, color y comentario.
- Eliminar actividades y líneas con confirmación.
- Guardar automáticamente y recuperar los datos al recargar.
- Exportar e importar JSON.
- Imprimir el día en A4 horizontal/PDF.
- Exportar una imagen PNG con bloques, horarios y comentarios.

## Siguiente paso recomendado

Construir primero el prototipo visual con tres líneas y varias actividades de ejemplo. Antes de invertir tiempo en persistencia o exportación hay que validar que la línea de 24 horas sea cómoda, legible y suficientemente espaciosa para el uso familiar.
