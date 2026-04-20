import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    // Faster HMR
    hmr: { overlay: false },
  },
  optimizeDeps: {
    // Pre-bundle these on first startup so they're instant on load
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'lucide-react',
    ],
  },
  build: {
    // Larger chunk warning limit (avoids spurious warnings)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Split vendor code into its own chunk — stays cached in browser
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          icons: ['lucide-react'],
        },
      },
    },
  },
})
