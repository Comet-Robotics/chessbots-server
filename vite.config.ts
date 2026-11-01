import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import devServer from '@hono/vite-dev-server'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [ 
        react(),     
        devServer({
            entry: 'src/server/main.ts', // The file path of your application.
            exclude: [/^(?!\/api\/).*/],
        }),
    ]
});
