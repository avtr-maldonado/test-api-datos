import type { Llamada } from "../types/llamada";

/**
 * Registros simulados en memoria.
 *
 * IMPORTANTE: Toda la información es ficticia y existe solo para pruebas.
 * No contactar a los teléfonos incluidos ni asumir que las personas o
 * empresas representan referencias reales verificadas.
 *
 * Para agregar un registro nuevo, añade otro objeto `Llamada` a este arreglo
 * con un `llamada_id` entero positivo que no se repita.
 */
const LLAMADAS: readonly Llamada[] = [
  {
    llamada_id: 1,
    empresa_contratante: "Avattar IT Solutions",
    candidato: {
      nombre: "Miguel Maldonado",
      puesto_vacante: "Desarrollador Jr",
      reclutador: "Estrella Sagredo",
      telefono_rh: "+52 55 0000 1100",
    },
    consentimiento: {
      folio: "CONS-2026-0143",
      fecha_firma: "2026-10-28",
    },
    referencia: {
      nombre: "Gabriel Duque",
      puesto_declarado: "Jefe de Ingenieria",
      relacion_declarada: "Jefe directo",
      empresa: "Jabil Chihuahua",
      telefono: "+52 614 123 4567",
      extension: null,
      fuente_telefono: "Proporcionado por el candidato (no verificado)",
      horario_preferido: "No especificado",
    },
    datos_a_verificar: {
      empresa: "Jabil Chihuahua",
      puesto: "Técnico de Pruebas",
      periodo: "junio de 2021 a mayo de 2022",
      relacion: "Jefe directo",
    },
    verificar_identidad: true,
  },
  {
    llamada_id: 2,
    empresa_contratante: "Avattar IT Solutions",
    candidato: {
      nombre: "Jair Hernandez",
      puesto_vacante: "Analista de Datos",
      reclutador: "Estrella Sagredo",
      telefono_rh: "+52 55 0000 1100",
    },
    consentimiento: {
      folio: "CONS-2026-0157",
      fecha_firma: "2026-10-29",
    },
    referencia: {
      nombre: "Guillermo Siller",
      puesto_declarado: "Gerente de Consultoria",
      relacion_declarada: "Jefe directo",
      empresa: "Avattar Consulting",
      telefono: "+52 81 0000 2200",
      extension: "104",
      fuente_telefono: "Proporcionado por el candidato (no verificado)",
      horario_preferido: "Lunes a viernes de 10:00 a 14:00",
    },
    datos_a_verificar: {
      empresa: "Avattar Consulting",
      puesto: "Analista de Datos Jr",
      periodo: "marzo de 2023 a agosto de 2025",
      relacion: "Jefe directo",
    },
    verificar_identidad: true,
  },
];

/** Índice por identificador para búsquedas directas. */
const LLAMADAS_POR_ID: ReadonlyMap<number, Llamada> = new Map(
  LLAMADAS.map((llamada) => [llamada.llamada_id, llamada]),
);

/**
 * Devuelve una copia profunda del registro solicitado, o `undefined` si no existe.
 * Se devuelve una copia para garantizar que los datos en memoria nunca se modifiquen.
 */
export function obtenerLlamada(id: number): Llamada | undefined {
  const llamada = LLAMADAS_POR_ID.get(id);
  return llamada === undefined ? undefined : structuredClone(llamada);
}
