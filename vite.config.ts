import { crx } from "@crxjs/vite-plugin";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import obfuscatorPlugin from "vite-plugin-javascript-obfuscator";
import { defineConfig, loadEnv } from "vite";
import manifest from "./src/manifest.config";

// https://vitejs.dev/config/
export default ({ mode }) => {
    process.env = {...process.env, ...loadEnv(mode, process.cwd())};
    // console.log(mode, process.env)


    return defineConfig({
        plugins: [
            svelte(),
            crx({ manifest }),
            mode === "production" && obfuscatorPlugin({
                options: {
                    debugProtection: true,
                },
            }),
        ],
        // HACK: https://github.com/crxjs/chrome-extension-tools/issues/696
        // https://github.com/crxjs/chrome-extension-tools/issues/746
        server: {
            port: 5173,
            strictPort: true,
            hmr: {
                clientPort: 5173,
            },
        },
    });
}

