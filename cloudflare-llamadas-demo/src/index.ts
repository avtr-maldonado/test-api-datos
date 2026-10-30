import { esPeticionAutorizada } from "./middleware/auth";
import { manejarLlamada, METODOS_PERMITIDOS } from "./routes/llamadas";
import type { Env } from "./types/llamada";
import { json, methodNotAllowed, notFound, options, unauthorized } from "./utils/responses";

const RUTA_HEALTH = /^\/api\/health\/?$/;
const RUTA_LLAMADA = /^\/api\/llamadas\/([^/]+)\/?$/;

function manejarHealth(request: Request): Response {
  switch (request.method) {
    case "GET":
      return json({ status: "ok", service: "cloudflare-llamadas-demo" });
    case "OPTIONS":
      return options(METODOS_PERMITIDOS);
    default:
      return methodNotAllowed(METODOS_PERMITIDOS);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (RUTA_HEALTH.test(pathname)) {
      return manejarHealth(request);
    }

    const match = RUTA_LLAMADA.exec(pathname);
    if (match !== null) {
      // OPTIONS (descubrimiento de métodos) no requiere autenticación; el resto sí.
      if (request.method !== "OPTIONS" && !esPeticionAutorizada(request, env)) {
        return unauthorized();
      }
      return manejarLlamada(request, decodeURIComponent(match[1]));
    }

    return notFound();
  },
} satisfies ExportedHandler<Env>;
