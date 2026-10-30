/**
 * Contrato de las respuestas recopiladas en una llamada de verificación.
 */

/** Número de preguntas que debe contener cada registro de respuestas. */
export const NUM_PREGUNTAS = 9;

export interface Respuesta {
  /** Número de pregunta, de 1 a NUM_PREGUNTAS. */
  pregunta: number;
  /** Texto de la pregunta formulada. */
  texto: string;
  /** Respuesta obtenida de la referencia. */
  respuesta: string;
}

/** Cuerpo esperado en `POST /api/respuestas`. */
export interface RespuestasEntrada {
  llamada_id: number;
  respuestas: Respuesta[];
}

/** Registro tal como se guarda y se devuelve. */
export interface RespuestasGuardadas extends RespuestasEntrada {
  /** Fecha y hora de recepción en formato ISO 8601 (UTC). */
  recibido_en: string;
}
