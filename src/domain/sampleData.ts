import { DayPlan } from './types';

export const SAMPLE_DAY_PLAN: DayPlan = {
  id: 'plan-sample-01',
  name: 'Día familiar de ejemplo',
  date: '2026-09-07',
  rows: [
    {
      id: 'row-carlos',
      name: 'Carlos',
      color: 'blue',
      visible: true,
      activities: [
        {
          id: 'act-c-1',
          title: 'Dormir',
          startMinutes: 0,
          endMinutes: 420, // 07:00
          color: 'blue',
        },
        {
          id: 'act-c-2',
          title: 'Trabajo / Oficina',
          startMinutes: 480, // 08:00
          endMinutes: 1020, // 17:00
          color: 'cyan',
          comment: 'Revisión trimestral a las 11:00',
        },
        {
          id: 'act-c-3',
          title: 'Llamada proveedor (solapada)',
          startMinutes: 600, // 10:00
          endMinutes: 720, // 12:00
          color: 'orange',
          comment: 'Urgente confirmar entrega',
        },
        {
          id: 'act-c-4',
          title: 'Gimnasio',
          startMinutes: 1080, // 18:00
          endMinutes: 1170, // 19:30
          color: 'green',
        },
        {
          id: 'act-c-5',
          title: 'Cena en familia',
          startMinutes: 1260, // 21:00
          endMinutes: 1350, // 22:30
          color: 'yellow',
        },
      ],
    },
    {
      id: 'row-pilar',
      name: 'Pilar',
      color: 'purple',
      visible: true,
      activities: [
        {
          id: 'act-p-1',
          title: 'Dormir',
          startMinutes: 0,
          endMinutes: 450, // 07:30
          color: 'purple',
        },
        {
          id: 'act-p-2',
          title: 'Llevar niños al colegio',
          startMinutes: 510, // 08:30
          endMinutes: 540, // 09:00
          color: 'yellow',
        },
        {
          id: 'act-p-3',
          title: 'Clínica / Consulta',
          startMinutes: 570, // 09:30
          endMinutes: 870, // 14:30
          color: 'magenta',
        },
        {
          id: 'act-p-4',
          title: 'Compras y recados',
          startMinutes: 1020, // 17:00
          endMinutes: 1140, // 19:00
          color: 'orange',
        },
        {
          id: 'act-p-5',
          title: 'Cena en familia',
          startMinutes: 1260, // 21:00
          endMinutes: 1350, // 22:30
          color: 'yellow',
        },
      ],
    },
    {
      id: 'row-leo',
      name: 'Leo',
      color: 'green',
      visible: true,
      activities: [
        {
          id: 'act-l-1',
          title: 'Dormir',
          startMinutes: 0,
          endMinutes: 450, // 07:30
          color: 'green',
        },
        {
          id: 'act-l-2',
          title: 'Colegio',
          startMinutes: 540, // 09:00
          endMinutes: 1020, // 17:00
          color: 'yellow',
          comment: 'Llevar ropa de deporte',
        },
        {
          id: 'act-l-3',
          title: 'Natación extraescolar',
          startMinutes: 1050, // 17:30
          endMinutes: 1140, // 19:00
          color: 'cyan',
        },
        {
          id: 'act-l-4',
          title: 'Deberes y juego',
          startMinutes: 1170, // 19:30
          endMinutes: 1260, // 21:00
          color: 'red',
        },
        {
          id: 'act-l-5',
          title: 'Cena y descanso',
          startMinutes: 1260, // 21:00
          endMinutes: 1380, // 23:00
          color: 'green',
        },
      ],
    },
  ],
};
