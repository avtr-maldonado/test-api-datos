import type { Env } from "../types/llamada";

const HEADER_API_KEY = "X-API-Key";

/** Comparación en tiempo constante para no filtrar información por tiempo de respuesta. */
function sonIguales(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  if (bufA.byteLength !== bufB.byteLength) return false;
  return crypto.subtle.timingSafeEqual(bufA, bufB);
}

/**
 * Verifica que la petición incluya una API Key válida en el header `X-API-Key`.
 * Nunca registra ni devuelve el valor de la clave.
 */
export function esPeticionAutorizada(request: Request, env: Env): boolean {
  const esperada = env.API_KEY;
  if (typeof esperada !== "string" || esperada.length === 0) {
    // Sin secreto configurado, nadie está autorizado (falla cerrado).
    return false;
  }
  const recibida = request.headers.get(HEADER_API_KEY);
  if (recibida === null || recibida.length === 0) return false;
  return sonIguales(recibida, esperada);
}
