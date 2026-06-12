/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// pas de @types/node dans ce projet : déclaration minimale pour lire BASE_PATH
declare const process: { env: Record<string, string | undefined> }

export default defineConfig({
  // Déploiement en sous-chemin (GitHub Pages) : BASE_PATH=/AmazingBoardGame/ npm run build
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
