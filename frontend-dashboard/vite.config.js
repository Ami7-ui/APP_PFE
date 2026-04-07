import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Ensures that refreshing the browser on any route (e.g. /audit) 
    // serves index.html instead of a 404
    historyApiFallback: true,
  },
})
