import { obtenerLlamada } from "../data/llamadas";
import type { Env } from "../types/llamada";
import {
  campoPregunta,
  campoRespuesta,
  NUM_PREGUNTAS,
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

/** Campos validados y normalizados, listos para guardar. */
type CamposRespuestas = Record<`respuesta_${number}`, string> &
  Record<`pregunta_${number}`, string | null>;

type ValidacionRespuestas = { ok: true; campos: CamposRespuestas } | { ok: false; mensaje: string };

/**
 * Convierte un valor escalar (cadena, número o booleano) a cadena.
 * Devuelve `null` si el tipo no es admitido o el texto es demasiado largo.
 */
function aTexto(valor: unknown): string | null {
  let texto: string;
  if (typeof valor === "string") texto = valor;
  else if (typeof valor === "number" && Number.isFinite(valor)) texto = String(valor);
  else if (typeof valor === "boolean") texto = String(valor);
  else return null;
  return texto.length <= MAX_TEXTO ? texto : null;
}

/**
 * Valida que `datos` contenga `respuesta_1` ... `respuesta_N` (obligatorias)
 * y, opcionalmente, `pregunta_1` ... `pregunta_N`.
 * Los campos desconocidos se ignoran.
 */
export function validarRespuestas(datos: Record<string, unknown>): ValidacionRespuestas {
  const campos = {} as CamposRespuestas;
  const faltantes: string[] = [];

  for (let n = 1; n <= NUM_PREGUNTAS; n++) {
    const nombreRespuesta = campoRespuesta(n);
    const nombrePregunta = campoPregunta(n);

    if (!(nombreRespuesta in datos) || datos[nombreRespuesta] === null) {
      faltantes.push(nombreRespuesta);
      continue;
    }
    const respuesta = aTexto(datos[nombreRespuesta]);
    if (respuesta === null) {
      return {
        ok: false,
        mensaje: `El campo ${nombreRespuesta} debe ser un texto de hasta ${MAX_TEXTO} caracteres`,
      };
    }
    campos[nombreRespuesta] = respuesta;

    const preguntaCruda = datos[nombrePregunta];
    if (preguntaCruda === undefined || preguntaCruda === null) {
      campos[nombrePregunta] = null;
    } else {
      const pregunta = aTexto(preguntaCruda);
      if (pregunta === null) {
        return {
          ok: false,
          mensaje: `El campo ${nombrePregunta} debe ser un texto de hasta ${MAX_TEXTO} caracteres`,
        };
      }
      campos[nombrePregunta] = pregunta;
    }
  }

  if (faltantes.length > 0) {
    return {
      ok: false,
      mensaje: `Faltan los campos obligatorios: ${faltantes.join(", ")}`,
    };
  }

  return { ok: true, campos };
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

  const validacion = validarRespuestas(datos);
  if (!validacion.ok) {
    return badRequest(validacion.mensaje, "RESPUESTAS_INVALIDAS");
  }

  if (obtenerLlamada(llamadaId) === undefined) {
    return notFound("LLAMADA_NO_ENCONTRADA", "No se encontró la llamada solicitada");
  }

  const registro: RespuestasGuardadas = {
    llamada_id: llamadaId,
    ...validacion.campos,
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
