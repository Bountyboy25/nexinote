import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
    // Prefer .tsx/.ts over the legacy .js copies in src/
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
  },
})
