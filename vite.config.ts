import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Inyecta en `sw.js` la lista de archivos del build y un identificador de
 * versión. Sin esto el Service Worker solo precacheaba `index.html`: en la
 * primera visita el JS y el CSS se descargaban antes de que el SW estuviera
 * activo, así que al abrir la app sin conexión salía la página en blanco.
 */
function swPrecache(): Plugin {
  let bundleFiles: string[] = [];

  return {
    name: 'sw-precache',
    apply: 'build',
    generateBundle(_options, bundle) {
      bundleFiles = Object.keys(bundle).filter((file) => file !== 'index.html' && !file.endsWith('.map'));
    },
    writeBundle(options) {
      const outDir = options.dir ?? 'dist';
      const swPath = join(outDir, 'sw.js');
      if (!existsSync(swPath)) return;

      const iconsDir = join(outDir, 'icons');
      const icons = existsSync(iconsDir)
        ? readdirSync(iconsDir).map((file) => `icons/${file}`)
        : [];

      const assets = [...bundleFiles, ...icons].sort().map((file) => `./${file}`);
      const source = readFileSync(swPath, 'utf-8');
      // La versión cambia si cambia cualquier archivo con hash o el propio SW.
      const buildId = createHash('sha256')
        .update(assets.join('\n'))
        .update(source)
        .digest('hex')
        .slice(0, 10);

      const injected = source
        .replace("/*__BUILD_ID__*/ 'dev'", JSON.stringify(buildId))
        .replace('/*__BUILD_ASSETS__*/ []', JSON.stringify(assets));

      if (injected === source) {
        this.error('sw-precache: no se encontraron los marcadores en sw.js');
      }
      writeFileSync(swPath, injected);
    },
  };
}

export default defineConfig({
  // Sirve bajo https://clacasta.github.io/Planner/
  base: '/Planner/',
  plugins: [react(), swPrecache()],
  server: {
    host: true, // Expone en localhost y 127.0.0.1
    port: 5173,
    strictPort: false, // Si 5173 está ocupado, busca automáticamente 5174, 5175, etc.
    open: false,
  },
});
