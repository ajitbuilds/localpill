import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
                share: 'share.html'
            },
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/messaging'],
                    map: ['leaflet', 'react-leaflet']
                }
            }
        },
        chunkSizeWarningLimit: 600
    }
})
