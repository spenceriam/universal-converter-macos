import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize bundle size
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@radix-ui/react-select', '@radix-ui/react-tooltip', '@radix-ui/react-dialog'],
          'animation-vendor': ['framer-motion'],
          
          // Feature chunks
          'conversion-services': [
            './src/services/unitConversion.ts',
            './src/services/currencyService.ts',
            './src/services/timeZoneService.ts'
          ],
          'ui-components': [
            './src/components/ui/button.tsx',
            './src/components/ui/input.tsx',
            './src/components/ui/select.tsx',
            './src/components/ui/card.tsx'
          ]
        },
        // Optimize chunk file names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
          if (facadeModuleId) {
            const name = path.basename(facadeModuleId, path.extname(facadeModuleId))
            return `chunks/${name}-[hash].js`
          }
          return 'chunks/[name]-[hash].js'
        }
      }
    },
    // Enable source maps for debugging
    sourcemap: true,
    // Optimize for modern browsers
    target: 'es2020',
    // Minification settings
    minify: 'terser',
    // Asset optimization
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
    cssCodeSplit: true, // Split CSS into separate files
  },
  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'framer-motion',
      '@radix-ui/react-select',
      '@radix-ui/react-tooltip'
    ]
  }
})
