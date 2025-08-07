import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  publicDir: 'public',
  base: './dist',
  build: {
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  // Add this section to ensure shaders are handled properly if you still want to load them externally
  assetsInclude: ['**/*.vert', '**/*.frag', '**/*.glsl']
})