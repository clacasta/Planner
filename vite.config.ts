import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Expone en localhost y 127.0.0.1
    port: 5173,
    strictPort: false, // Si 5173 está ocupado, busca automáticamente 5174, 5175, etc.
    open: false,
  },
});
