import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const BASE = "http://localhost";
const API_KEY = env.API_KEY as string;
const AUTH = { "X-API-Key": API_KEY };

describe("GET /api/health", () => {
  it("devuelve 200 sin autenticación", async () => {
    const res = await SELF.fetch(`${BASE}/api/health`);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
    const body = await res.json<{ status: string }>();
    expect(body.status).toBe("ok");
  });

  it("no expone información confidencial", async () => {
    const res = await SELF.fetch(`${BASE}/api/health`);
    const text = await res.text();
    expect(text).not.toContain(API_KEY);
  });
});

describe("GET /api/llamadas/{id}", () => {
  it("devuelve 200 para la llamada 1", async () => {
    const res = await SELF.fetch(`${BASE}/api/llamadas/1`, { headers: AUTH });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
  });

  it("incluye todos los campos del contrato", async () => {
    const res = await SELF.fetch(`${BASE}/api/llamadas/1`, { headers: AUTH });
    const body = await res.json();
    expect(body).toEqual({
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
    });
  });

  it("devuelve 404 con el error esperado para una llamada inexistente", async () => {
    const res = await SELF.fetch(`${BASE}/api/llamadas/999`, { headers: AUTH });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      success: false,
      error: {
        code: "LLAMADA_NO_ENCONTRADA",
        message: "No se encontró la llamada solicitada",
      },
    });
  });

  it.each(["abc", "0", "-1", "1.5", "01", "1e3", "%20"])(
    "devuelve 400 para el identificador inválido %j",
    async (id) => {
      const res = await SELF.fetch(`${BASE}/api/llamadas/${id}`, { headers: AUTH });
      expect(res.status).toBe(400);
      const body = await res.json<{ success: boolean; error: { code: string; message: string } }>();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("ID_INVALIDO");
      expect(body.error.message).toBeTypeOf("string");
    },
  );

  it("las consultas no modifican el registro", async () => {
    const primera = await (await SELF.fetch(`${BASE}/api/llamadas/1`, { headers: AUTH })).json();
    const segunda = await (await SELF.fetch(`${BASE}/api/llamadas/1`, { headers: AUTH })).json();
    expect(segunda).toEqual(primera);
  });
});

describe("métodos y rutas", () => {
  it.each(["POST", "PUT", "PATCH", "DELETE"])("%s /api/llamadas/1 devuelve 405", async (method) => {
    const res = await SELF.fetch(`${BASE}/api/llamadas/1`, { method, headers: AUTH });
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("GET, OPTIONS");
  });

  it("OPTIONS /api/llamadas/1 devuelve 204 con Allow", async () => {
    const res = await SELF.fetch(`${BASE}/api/llamadas/1`, { method: "OPTIONS" });
    expect(res.status).toBe(204);
    expect(res.headers.get("Allow")).toBe("GET, OPTIONS");
  });

  it.each(["/", "/api", "/api/llamadas/1/extra", "/otra/ruta"])(
    "GET %s devuelve 404",
    async (path) => {
      const res = await SELF.fetch(`${BASE}${path}`, { headers: AUTH });
      expect(res.status).toBe(404);
      const body = await res.json<{ success: boolean; error: { code: string } }>();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("RUTA_NO_ENCONTRADA");
    },
  );
});
