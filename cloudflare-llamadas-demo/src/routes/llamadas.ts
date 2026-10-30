import { obtenerLlamada } from "../data/llamadas";
import { badRequest, json, methodNotAllowed, notFound, options } from "../utils/responses";

/** Métodos admitidos en `/api/llamadas/{llamada_id}`. */
export const METODOS_PERMITIDOS = ["GET", "OPTIONS"] as const;

/** Métodos admitidos en `/api/llamadas` (búsqueda por cuerpo JSON). */
export const METODOS_PERMITIDOS_BUSQUEDA = ["POST", "OPTIONS"] as const;

/** Solo dígitos, sin signo, sin ceros a la izquierda. */
const ID_PATTERN = /^[1-9]\d{0,15}$/;

const MENSAJE_ID_INVALIDO = "El identificador de la llamada debe ser un entero positivo";

/**
 * Valida el identificador recibido en la URL.
 * Devuelve el entero positivo o `null` si no es válido.
 */
export function parsearId(raw: string): number | null {
  if (!ID_PATTERN.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * Valida el valor `llamada_id` recibido en un cuerpo JSON.
 * Acepta un entero positivo como número o como cadena de dígitos.
 */
export function parsearIdDeCuerpo(valor: unknown): number | null {
  if (typeof valor === "number") {
    return Number.isSafeInteger(valor) && valor > 0 ? valor : null;
  }
  if (typeof valor === "string") {
    return parsearId(valor);
  }
  return null;
}

/** Busca la llamada y construye la respuesta 200 o 404. */
function responderLlamada(id: number): Response {
  const llamada = obtenerLlamada(id);
  if (llamada === undefined) {
    return notFound("LLAMADA_NO_ENCONTRADA", "No se encontró la llamada solicitada");
  }
  return json(llamada);
}

/** Maneja `/api/llamadas/{llamada_id}`. */
export function manejarLlamada(request: Request, rawId: string): Response {
  switch (request.method) {
    case "GET":
      break;
    case "OPTIONS":
      return options(METODOS_PERMITIDOS);
    default:
      return methodNotAllowed(METODOS_PERMITIDOS);
  }

  const id = parsearId(rawId);
  if (id === null) {
    return badRequest(MENSAJE_ID_INVALIDO);
  }

  return responderLlamada(id);
}

/** Maneja `/api/llamadas` con `POST` y cuerpo `{ "llamada_id": <entero positivo> }`. */
export async function manejarBusquedaLlamada(request: Request): Promise<Response> {
  switch (request.method) {
    case "POST":
      break;
    case "OPTIONS":
      return options(METODOS_PERMITIDOS_BUSQUEDA);
    default:
      return methodNotAllowed(METODOS_PERMITIDOS_BUSQUEDA);
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return badRequest("El cuerpo de la petición debe ser un JSON válido", "CUERPO_INVALIDO");
  }

  if (typeof cuerpo !== "object" || cuerpo === null || Array.isArray(cuerpo)) {
    return badRequest("El cuerpo de la petición debe ser un objeto JSON", "CUERPO_INVALIDO");
  }

  if (!("llamada_id" in cuerpo)) {
    return badRequest("El cuerpo debe incluir el campo llamada_id", "ID_INVALIDO");
  }

  const id = parsearIdDeCuerpo((cuerpo as { llamada_id: unknown }).llamada_id);
  if (id === null) {
    return badRequest(MENSAJE_ID_INVALIDO);
  }

  return responderLlamada(id);
}
