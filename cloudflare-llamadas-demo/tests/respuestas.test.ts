import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

const BASE = "http://localhost";
const API_KEY = env.API_KEY as string;
const AUTH = { "X-API-Key": API_KEY };

function respuestasValidas(): Array<{ pregunta: number; texto: string; respuesta: string }> {
  return Array.from({ length: 9 }, (_, i) => ({
    pregunta: i + 1,
    texto: `Pregunta ${i + 1}`,
    respuesta: `Respuesta ${i + 1}`,
  }));
}

function post(body: unknown, headers: Record<string, string> = AUTH) {
  return SELF.fetch(`${BASE}/api/respuestas`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

type ErrorBody = { success: boolean; error: { code: string; message: string } };

describe("POST /api/respuestas", () => {
  beforeEach(async () => {
    await env.RESPUESTAS.delete("respuestas:1");
    await env.RESPUESTAS.delete("respuestas:2");
  });

  it("guarda 9 respuestas y devuelve 201 con el registro", async () => {
    const res = await post({ llamada_id: 2, respuestas: respuestasValidas() });
    expect(res.status).toBe(201);
    expect(res.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
    const body = await res.json<{
      success: boolean;
      data: { llamada_id: number; respuestas: unknown[]; recibido_en: string };
    }>();
    expect(body.success).toBe(true);
    expect(body.data.llamada_id).toBe(2);
    expect(body.data.respuestas).toHaveLength(9);
    expect(new Date(body.data.recibido_en).toISOString()).toBe(body.data.recibido_en);

    const guardado = await env.RESPUESTAS.get("respuestas:2", "json");
    expect(guardado).toEqual(body.data);
  });

  it("ordena las respuestas por número de pregunta", async () => {
    const desordenadas = respuestasValidas().reverse();
    const res = await post({ llamada_id: 1, respuestas: desordenadas });
    expect(res.status).toBe(201);
    const body = await res.json<{ data: { respuestas: Array<{ pregunta: number }> } }>();
    expect(body.data.respuestas.map((r) => r.pregunta)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("sobrescribe las respuestas anteriores de la misma llamada", async () => {
    await post({ llamada_id: 1, respuestas: respuestasValidas() });
    const nuevas = respuestasValidas().map((r) => ({ ...r, respuesta: "Cambiada" }));
    const res = await post({ llamada_id: 1, respuestas: nuevas });
    expect(res.status).toBe(201);

    const leido = await SELF.fetch(`${BASE}/api/respuestas/1`, { headers: AUTH });
    const body = await leido.json<{ respuestas: Array<{ respuesta: string }> }>();
    expect(body.respuestas.every((r) => r.respuesta === "Cambiada")).toBe(true);
  });

  it("acepta llamada_id como cadena de dígitos", async () => {
    const res = await post({ llamada_id: "2", respuestas: respuestasValidas() });
    expect(res.status).toBe(201);
  });

  it("devuelve 404 si la llamada no existe y no guarda nada", async () => {
    const res = await post({ llamada_id: 999, respuestas: respuestasValidas() });
    expect(res.status).toBe(404);
    expect((await res.json<ErrorBody>()).error.code).toBe("LLAMADA_NO_ENCONTRADA");
    expect(await env.RESPUESTAS.get("respuestas:999")).toBeNull();
  });

  it.each([
    ["faltan respuestas", respuestasValidas().slice(0, 8)],
    ["sobran respuestas", [...respuestasValidas(), { pregunta: 10, texto: "x", respuesta: "y" }]],
    ["pregunta repetida", respuestasValidas().map((r, i) => (i === 8 ? { ...r, pregunta: 1 } : r))],
    ["pregunta fuera de rango", respuestasValidas().map((r, i) => (i === 0 ? { ...r, pregunta: 0 } : r))],
    ["falta el texto", respuestasValidas().map((r, i) => (i === 3 ? { pregunta: r.pregunta, respuesta: r.respuesta } : r))],
    ["respuesta no es cadena", respuestasValidas().map((r, i) => (i === 5 ? { ...r, respuesta: 42 } : r))],
    ["elemento no es objeto", respuestasValidas().map((r, i) => (i === 2 ? "texto" : r))],
    ["no es una lista", { pregunta: 1 }],
    ["lista vacía", []],
  ])("devuelve 400 RESPUESTAS_INVALIDAS cuando %s", async (_caso, respuestas) => {
    const res = await post({ llamada_id: 1, respuestas });
    expect(res.status).toBe(400);
    const body = await res.json<ErrorBody>();
    expect(body.error.code).toBe("RESPUESTAS_INVALIDAS");
    expect(body.error.message).toBeTypeOf("string");
  });

  it("devuelve 400 RESPUESTAS_INVALIDAS si falta el campo respuestas", async () => {
    const res = await post({ llamada_id: 1 });
    expect(res.status).toBe(400);
    expect((await res.json<ErrorBody>()).error.code).toBe("RESPUESTAS_INVALIDAS");
  });

  it.each([[{ respuestas: [] }], [{ llamada_id: "abc", respuestas: [] }], [{ llamada_id: 0, respuestas: [] }]])(
    "devuelve 400 ID_INVALIDO para el cuerpo %j",
    async (body) => {
      const res = await post(body);
      expect(res.status).toBe(400);
      expect((await res.json<ErrorBody>()).error.code).toBe("ID_INVALIDO");
    },
  );

  it.each(["", "{no", "[1]", "null"])("devuelve 400 CUERPO_INVALIDO para el cuerpo crudo %j", async (raw) => {
    const res = await post(raw);
    expect(res.status).toBe(400);
    expect((await res.json<ErrorBody>()).error.code).toBe("CUERPO_INVALIDO");
  });

  it("devuelve 401 sin API Key y no guarda nada", async () => {
    const res = await post({ llamada_id: 1, respuestas: respuestasValidas() }, {});
    expect(res.status).toBe(401);
    expect(await env.RESPUESTAS.get("respuestas:1")).toBeNull();
  });

  it.each(["GET", "PUT", "PATCH", "DELETE"])("%s /api/respuestas devuelve 405", async (method) => {
    const res = await SELF.fetch(`${BASE}/api/respuestas`, { method, headers: AUTH });
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("POST, OPTIONS");
  });

  it("OPTIONS /api/respuestas devuelve 204 sin autenticación", async () => {
    const res = await SELF.fetch(`${BASE}/api/respuestas`, { method: "OPTIONS" });
    expect(res.status).toBe(204);
    expect(res.headers.get("Allow")).toBe("POST, OPTIONS");
  });
});

describe("GET /api/respuestas/{llamada_id}", () => {
  beforeEach(async () => {
    await env.RESPUESTAS.delete("respuestas:1");
    await env.RESPUESTAS.delete("respuestas:2");
  });

  it("devuelve lo guardado por el POST", async () => {
    const creado = await (await post({ llamada_id: 2, respuestas: respuestasValidas() })).json<{ data: unknown }>();
    const res = await SELF.fetch(`${BASE}/api/respuestas/2`, { headers: AUTH });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(creado.data);
  });

  it("devuelve 404 RESPUESTAS_NO_ENCONTRADAS si no hay respuestas guardadas", async () => {
    const res = await SELF.fetch(`${BASE}/api/respuestas/1`, { headers: AUTH });
    expect(res.status).toBe(404);
    expect((await res.json<ErrorBody>()).error.code).toBe("RESPUESTAS_NO_ENCONTRADAS");
  });

  it("no devuelve respuestas de otra llamada", async () => {
    await post({ llamada_id: 1, respuestas: respuestasValidas() });
    const res = await SELF.fetch(`${BASE}/api/respuestas/2`, { headers: AUTH });
    expect(res.status).toBe(404);
  });

  it.each(["abc", "0", "-1", "1.5"])("devuelve 400 para el identificador inválido %j", async (id) => {
    const res = await SELF.fetch(`${BASE}/api/respuestas/${id}`, { headers: AUTH });
    expect(res.status).toBe(400);
    expect((await res.json<ErrorBody>()).error.code).toBe("ID_INVALIDO");
  });

  it("devuelve 401 sin API Key", async () => {
    const res = await SELF.fetch(`${BASE}/api/respuestas/1`);
    expect(res.status).toBe(401);
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])("%s /api/respuestas/1 devuelve 405", async (method) => {
    const res = await SELF.fetch(`${BASE}/api/respuestas/1`, { method, headers: AUTH });
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("GET, OPTIONS");
  });
});
