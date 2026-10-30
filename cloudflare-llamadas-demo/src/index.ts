import { esPeticionAutorizada } from "./middleware/auth";
import { manejarBusquedaLlamada, manejarLlamada, METODOS_PERMITIDOS } from "./routes/llamadas";
import { manejarGuardarRespuestas, manejarObtenerRespuestas } from "./routes/respuestas";
import type { Env } from "./types/llamada";
import { json, methodNotAllowed, notFound, options, unauthorized } from "./utils/responses";

const RUTA_HEALTH = /^\/api\/health\/?$/;
const RUTA_LLAMADAS = /^\/api\/llamadas\/?$/;
const RUTA_LLAMADA = /^\/api\/llamadas\/([^/]+)\/?$/;
const RUTA_RESPUESTAS = /^\/api\/respuestas\/?$/;
const RUTA_RESPUESTA = /^\/api\/respuestas\/([^/]+)\/?$/;

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

/** OPTIONS (descubrimiento de métodos) no requiere autenticación; el resto sí. */
function requiereAutenticacion(request: Request): boolean {
  return request.method !== "OPTIONS";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (RUTA_HEALTH.test(pathname)) {
      return manejarHealth(request);
    }

    // Todas las rutas protegidas comparten la misma verificación de API Key.
    const rutaProtegida =
      RUTA_LLAMADAS.test(pathname) ||
      RUTA_LLAMADA.test(pathname) ||
      RUTA_RESPUESTAS.test(pathname) ||
      RUTA_RESPUESTA.test(pathname);

    if (!rutaProtegida) {
      return notFound();
    }
    if (requiereAutenticacion(request) && !esPeticionAutorizada(request, env)) {
      return unauthorized();
    }

    if (RUTA_LLAMADAS.test(pathname)) {
      return manejarBusquedaLlamada(request);
    }

    const llamada = RUTA_LLAMADA.exec(pathname);
    if (llamada !== null) {
      return manejarLlamada(request, decodeURIComponent(llamada[1]));
    }

    if (RUTA_RESPUESTAS.test(pathname)) {
      return manejarGuardarRespuestas(request, env);
    }

    const respuesta = RUTA_RESPUESTA.exec(pathname);
    if (respuesta !== null) {
      return manejarObtenerRespuestas(request, env, decodeURIComponent(respuesta[1]));
    }

    return notFound();
  },
} satisfies ExportedHandler<Env>;
