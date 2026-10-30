const JSON_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

/** Respuesta JSON con el estado indicado. */
export function json(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

/** Respuesta de error con el formato estándar de la API. */
export function error(
  status: number,
  code: string,
  message: string,
  extraHeaders: Record<string, string> = {},
): Response {
  return json({ success: false, error: { code, message } }, status, extraHeaders);
}

export function badRequest(message: string): Response {
  return error(400, "ID_INVALIDO", message);
}

export function unauthorized(): Response {
  return error(401, "NO_AUTORIZADO", "API Key ausente o inválida", {
    "WWW-Authenticate": 'ApiKey realm="api", header="X-API-Key"',
  });
}

export function notFound(
  code = "RUTA_NO_ENCONTRADA",
  message = "Ruta no encontrada",
): Response {
  return error(404, code, message);
}

export function methodNotAllowed(allowed: readonly string[]): Response {
  return error(405, "METODO_NO_PERMITIDO", "Método no permitido", {
    Allow: allowed.join(", "),
  });
}

/** Respuesta a OPTIONS (sin cuerpo) indicando los métodos admitidos. */
export function options(allowed: readonly string[]): Response {
  return new Response(null, {
    status: 204,
    headers: { Allow: allowed.join(", ") },
  });
}
