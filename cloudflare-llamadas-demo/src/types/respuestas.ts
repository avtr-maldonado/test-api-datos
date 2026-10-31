/**
 * Contrato de las respuestas recopiladas en una llamada de verificación.
 *
 * La estructura es plana (un campo por pregunta) porque el agente que consume
 * esta API no puede enviar listas en el cuerpo de la petición.
 */

/** Número de preguntas que debe contener cada registro de respuestas. */
export const NUM_PREGUNTAS = 9;

/** Nombre del campo con la respuesta a la pregunta `n` (obligatorio). */
export function campoRespuesta(n: number): `respuesta_${number}` {
  return `respuesta_${n}`;
}

/** Nombre del campo con el texto de la pregunta `n` (opcional). */
export function campoPregunta(n: number): `pregunta_${number}` {
  return `pregunta_${n}`;
}

/**
 * Registro tal como se guarda y se devuelve.
 *
 * Contiene `respuesta_1` ... `respuesta_9` (cadenas) y
 * `pregunta_1` ... `pregunta_9` (cadena o `null` si no se envió).
 */
export interface RespuestasGuardadas {
  llamada_id: number;
  /** Fecha y hora de recepción en formato ISO 8601 (UTC). */
  recibido_en: string;
  [campo: `respuesta_${number}`]: string;
  [campo: `pregunta_${number}`]: string | null;
}
