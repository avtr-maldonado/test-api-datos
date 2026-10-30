import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
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
