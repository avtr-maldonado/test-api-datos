/**
 * Contrato de datos de una llamada de verificación de referencias laborales.
 * Todos los datos son ficticios y sirven únicamente para pruebas.
 */

export interface Candidato {
  nombre: string;
  puesto_vacante: string;
  reclutador: string;
  telefono_rh: string;
}

export interface Consentimiento {
  folio: string;
  /** Fecha en formato ISO (YYYY-MM-DD). */
  fecha_firma: string;
}

export interface Referencia {
  nombre: string;
  puesto_declarado: string;
  relacion_declarada: string;
  empresa: string;
  telefono: string;
  extension: string | null;
  fuente_telefono: string;
  horario_preferido: string;
}

export interface DatosAVerificar {
  empresa: string;
  puesto: string;
  periodo: string;
  relacion: string;
}

export interface Llamada {
  llamada_id: number;
  empresa_contratante: string;
  candidato: Candidato;
  consentimiento: Consentimiento;
  referencia: Referencia;
  datos_a_verificar: DatosAVerificar;
  verificar_identidad: boolean;
}

/** Variables de entorno y secretos disponibles en el Worker. */
export interface Env {
  /** Secreto configurado con `wrangler secret put API_KEY` o en `.dev.vars`. */
  API_KEY?: string;
}
