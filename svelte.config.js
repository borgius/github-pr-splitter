import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { IGNORED_WARNINGS } from "./src/constants.js";

export default {
    // Consult https://svelte.dev/docs#compile-time-svelte-preprocess
    // for more information about preprocessors
    compilerOptions: {
        enableSourcemap: true,
    },
    preprocess: vitePreprocess({
        sourceMap: true,
    }),
    onwarn(warning, handler) {
        if (!IGNORED_WARNINGS.includes(warning.code))
            handler(warning)
    },
};
