import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // La lógica de dominio y almacenamiento es pura: se prueba en Node, sin DOM.
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    reporters: ['default'],
  },
});