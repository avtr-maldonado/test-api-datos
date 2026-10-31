import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      // Las pruebas SIEMPRE usan bindings locales simulados, aunque wrangler.jsonc
      // marque el KV con "remote": true. Así nunca escriben en el namespace real.
      remoteBindings: false,
      miniflare: {
        // Secreto usado SOLO en las pruebas. Nunca uses este valor en despliegues reales.
        bindings: { API_KEY: "clave-de-pruebas" },
      },
    }),
  ],
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
