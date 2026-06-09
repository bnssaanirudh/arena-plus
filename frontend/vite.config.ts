import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Split heavy third-party libs into their own cacheable chunks so the
        // main app bundle stays small (was a single 905 kB chunk).
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-')) return 'charts';
            if (id.includes('leaflet')) return 'map';
            if (id.includes('framer-motion')) return 'motion';
          }
        },
      },
    },
  },
})
