import { obtenerLlamada } from "../data/llamadas";
import type { Env } from "../types/llamada";
import {
  NUM_PREGUNTAS,
  type Respuesta,
  type RespuestasGuardadas,
} from "../types/respuestas";
import { badRequest, json, methodNotAllowed, notFound, options } from "../utils/responses";
import { parsearId, parsearIdDeCuerpo } from "./llamadas";

/** Métodos admitidos en `/api/respuestas`. */
export const METODOS_PERMITIDOS_RESPUESTAS = ["POST", "OPTIONS"] as const;

/** Métodos admitidos en `/api/respuestas/{llamada_id}`. */
export const METODOS_PERMITIDOS_RESPUESTA = ["GET", "OPTIONS"] as const;

/** Longitud máxima aceptada para cada texto, para evitar cuerpos desproporcionados. */
const MAX_TEXTO = 2000;

function claveKV(llamadaId: number): string {
  return `respuestas:${llamadaId}`;
}

/** Resultado de validar la lista de respuestas: la lista normalizada o un mensaje de error. */
type ValidacionRespuestas = { ok: true; respuestas: Respuesta[] } | { ok: false; mensaje: string };

function esTextoValido(valor: unknown): valor is string {
  return typeof valor === "string" && valor.length <= MAX_TEXTO;
}

/**
 * Valida que `valor` sea una lista de exactamente NUM_PREGUNTAS respuestas,
 * con números de pregunta 1..NUM_PREGUNTAS sin repetir.
 * Devuelve la lista ordenada por número de pregunta.
 */
export function validarRespuestas(valor: unknown): ValidacionRespuestas {
  if (!Array.isArray(valor)) {
    return { ok: false, mensaje: "El campo respuestas debe ser una lista" };
  }
  if (valor.length !== NUM_PREGUNTAS) {
    return {
      ok: false,
      mensaje: `Se esperan exactamente ${NUM_PREGUNTAS} respuestas y se recibieron ${valor.length}`,
    };
  }

  const vistas = new Set<number>();
  const normalizadas: Respuesta[] = [];

  for (const [indice, item] of valor.entries()) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return { ok: false, mensaje: `La respuesta en la posición ${indice} debe ser un objeto` };
    }
    const { pregunta, texto, respuesta } = item as Record<string, unknown>;

    if (!Number.isInteger(pregunta) || (pregunta as number) < 1 || (pregunta as number) > NUM_PREGUNTAS) {
      return {
        ok: false,
        mensaje: `La respuesta en la posición ${indice} debe tener un campo pregunta entre 1 y ${NUM_PREGUNTAS}`,
      };
    }
    if (vistas.has(pregunta as number)) {
      return { ok: false, mensaje: `La pregunta ${pregunta} aparece más de una vez` };
    }
    if (!esTextoValido(texto)) {
      return { ok: false, mensaje: `La pregunta ${pregunta} debe incluir el campo texto como cadena` };
    }
    if (!esTextoValido(respuesta)) {
      return { ok: false, mensaje: `La pregunta ${pregunta} debe incluir el campo respuesta como cadena` };
    }

    vistas.add(pregunta as number);
    normalizadas.push({ pregunta: pregunta as number, texto, respuesta });
  }

  normalizadas.sort((a, b) => a.pregunta - b.pregunta);
  return { ok: true, respuestas: normalizadas };
}

/** Maneja `POST /api/respuestas`: valida y guarda las respuestas de una llamada en KV. */
export async function manejarGuardarRespuestas(request: Request, env: Env): Promise<Response> {
  switch (request.method) {
    case "POST":
      break;
    case "OPTIONS":
      return options(METODOS_PERMITIDOS_RESPUESTAS);
    default:
      return methodNotAllowed(METODOS_PERMITIDOS_RESPUESTAS);
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

  const datos = cuerpo as Record<string, unknown>;

  if (!("llamada_id" in datos)) {
    return badRequest("El cuerpo debe incluir el campo llamada_id", "ID_INVALIDO");
  }
  const llamadaId = parsearIdDeCuerpo(datos.llamada_id);
  if (llamadaId === null) {
    return badRequest("El identificador de la llamada debe ser un entero positivo");
  }

  const validacion = validarRespuestas(datos.respuestas);
  if (!validacion.ok) {
    return badRequest(validacion.mensaje, "RESPUESTAS_INVALIDAS");
  }

  if (obtenerLlamada(llamadaId) === undefined) {
    return notFound("LLAMADA_NO_ENCONTRADA", "No se encontró la llamada solicitada");
  }

  const registro: RespuestasGuardadas = {
    llamada_id: llamadaId,
    respuestas: validacion.respuestas,
    recibido_en: new Date().toISOString(),
  };

  await env.RESPUESTAS.put(claveKV(llamadaId), JSON.stringify(registro));

  return json({ success: true, data: registro }, 201);
}

/** Maneja `GET /api/respuestas/{llamada_id}`: recupera las respuestas guardadas. */
export async function manejarObtenerRespuestas(
  request: Request,
  env: Env,
  rawId: string,
): Promise<Response> {
  switch (request.method) {
    case "GET":
      break;
    case "OPTIONS":
      return options(METODOS_PERMITIDOS_RESPUESTA);
    default:
      return methodNotAllowed(METODOS_PERMITIDOS_RESPUESTA);
  }

  const llamadaId = parsearId(rawId);
  if (llamadaId === null) {
    return badRequest("El identificador de la llamada debe ser un entero positivo");
  }

  const guardado = await env.RESPUESTAS.get<RespuestasGuardadas>(claveKV(llamadaId), "json");
  if (guardado === null) {
    return notFound("RESPUESTAS_NO_ENCONTRADAS", "No hay respuestas guardadas para esta llamada");
  }

  return json(guardado);
}
