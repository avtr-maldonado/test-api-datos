import { obtenerLlamada } from "../data/llamadas";
import { badRequest, json, methodNotAllowed, notFound, options } from "../utils/responses";

export const METODOS_PERMITIDOS = ["GET", "OPTIONS"] as const;

/** Solo dígitos, sin signo, sin ceros a la izquierda. */
const ID_PATTERN = /^[1-9]\d{0,15}$/;

/**
 * Valida el identificador recibido en la URL.
 * Devuelve el entero positivo o `null` si no es válido.
 */
export function parsearId(raw: string): number | null {
  if (!ID_PATTERN.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
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
    return badRequest("El identificador de la llamada debe ser un entero positivo");
  }

  const llamada = obtenerLlamada(id);
  if (llamada === undefined) {
    return notFound("LLAMADA_NO_ENCONTRADA", "No se encontró la llamada solicitada");
  }

  return json(llamada);
}
