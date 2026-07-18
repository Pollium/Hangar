import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import typia from '@typia/unplugin/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    typia({ tsconfig: './tsconfig.app.json', cache: true }), // must run before other plugins so typia.createValidate<T>() calls get compiled
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss()
  ],
  server: {
    host: '0.0.0.0'
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
