import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

const BASE = "http://localhost";
const API_KEY = env.API_KEY as string;
const AUTH = { "X-API-Key": API_KEY };

/** Cuerpo válido con respuesta_1..respuesta_9 y pregunta_1..pregunta_9. */
function cuerpoValido(llamadaId: number | string = 2): Record<string, unknown> {
  const body: Record<string, unknown> = { llamada_id: llamadaId };
  for (let n = 1; n <= 9; n++) {
    body[`pregunta_${n}`] = `Pregunta ${n}`;
    body[`respuesta_${n}`] = `Respuesta ${n}`;
  }
  return body;
}

/** Cuerpo válido solo con las respuestas, sin textos de pregunta. */
function soloRespuestas(llamadaId = 1): Record<string, unknown> {
  const body: Record<string, unknown> = { llamada_id: llamadaId };
  for (let n = 1; n <= 9; n++) body[`respuesta_${n}`] = `R${n}`;
  return body;
}

function post(body: unknown, headers: Record<string, string> = AUTH) {
  return SELF.fetch(`${BASE}/api/respuestas`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

type ErrorBody = { success: boolean; error: { code: string; message: string } };
type Guardado = Record<string, unknown> & { llamada_id: number; recibido_en: string };

async function limpiarKV() {
  await env.RESPUESTAS.delete("respuestas:1");
  await env.RESPUESTAS.delete("respuestas:2");
}

describe("POST /api/respuestas", () => {
  beforeEach(limpiarKV);

  it("guarda las 9 respuestas y devuelve 201 con el registro plano", async () => {
    const res = await post(cuerpoValido(2));
    expect(res.status).toBe(201);
    expect(res.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
    const body = await res.json<{ success: boolean; data: Guardado }>();
    expect(body.success).toBe(true);
    expect(body.data.llamada_id).toBe(2);
    for (let n = 1; n <= 9; n++) {
      expect(body.data[`respuesta_${n}`]).toBe(`Respuesta ${n}`);
      expect(body.data[`pregunta_${n}`]).toBe(`Pregunta ${n}`);
    }
    expect(new Date(body.data.recibido_en).toISOString()).toBe(body.data.recibido_en);

    const guardado = await env.RESPUESTAS.get("respuestas:2", "json");
    expect(guardado).toEqual(body.data);
  });

  it("acepta solo las respuestas y deja las preguntas en null", async () => {
    const res = await post(soloRespuestas(1));
    expect(res.status).toBe(201);
    const body = await res.json<{ data: Guardado }>();
    for (let n = 1; n <= 9; n++) {
      expect(body.data[`respuesta_${n}`]).toBe(`R${n}`);
      expect(body.data[`pregunta_${n}`]).toBeNull();
    }
  });

  it("convierte números y booleanos a texto", async () => {
    const body = { ...soloRespuestas(1), respuesta_3: 42, respuesta_4: true, respuesta_5: "" };
    const res = await post(body);
    expect(res.status).toBe(201);
    const data = (await res.json<{ data: Guardado }>()).data;
    expect(data.respuesta_3).toBe("42");
    expect(data.respuesta_4).toBe("true");
    expect(data.respuesta_5).toBe("");
  });

  it("ignora campos desconocidos", async () => {
    const res = await post({ ...soloRespuestas(1), extra: "x", respuesta_10: "no" });
    expect(res.status).toBe(201);
    const data = (await res.json<{ data: Guardado }>()).data;
    expect(data).not.toHaveProperty("extra");
    expect(data).not.toHaveProperty("respuesta_10");
  });

  it("sobrescribe las respuestas anteriores de la misma llamada", async () => {
    await post(cuerpoValido(1));
    const nuevas = cuerpoValido(1);
    for (let n = 1; n <= 9; n++) nuevas[`respuesta_${n}`] = "Cambiada";
    const res = await post(nuevas);
    expect(res.status).toBe(201);

    const leido = await SELF.fetch(`${BASE}/api/respuestas/1`, { headers: AUTH });
    const data = await leido.json<Guardado>();
    for (let n = 1; n <= 9; n++) expect(data[`respuesta_${n}`]).toBe("Cambiada");
  });

  it("acepta llamada_id como cadena de dígitos", async () => {
    const res = await post(cuerpoValido("2"));
    expect(res.status).toBe(201);
  });

  it("devuelve 404 si la llamada no existe y no guarda nada", async () => {
    const res = await post(cuerpoValido(999));
    expect(res.status).toBe(404);
    expect((await res.json<ErrorBody>()).error.code).toBe("LLAMADA_NO_ENCONTRADA");
    expect(await env.RESPUESTAS.get("respuestas:999")).toBeNull();
  });

  it("devuelve 400 e indica qué respuestas faltan", async () => {
    const body = soloRespuestas(1);
    delete body.respuesta_4;
    delete body.respuesta_9;
    const res = await post(body);
    expect(res.status).toBe(400);
    const err = await res.json<ErrorBody>();
    expect(err.error.code).toBe("RESPUESTAS_INVALIDAS");
    expect(err.error.message).toContain("respuesta_4");
    expect(err.error.message).toContain("respuesta_9");
  });

  it.each([
    ["respuesta null", { respuesta_2: null }],
    ["respuesta objeto", { respuesta_2: { a: 1 } }],
    ["respuesta lista", { respuesta_2: ["a"] }],
    ["respuesta demasiado larga", { respuesta_2: "x".repeat(2001) }],
    ["pregunta objeto", { pregunta_7: { a: 1 } }],
    ["pregunta demasiado larga", { pregunta_7: "x".repeat(2001) }],
  ])("devuelve 400 RESPUESTAS_INVALIDAS con %s", async (_caso, cambios) => {
    const res = await post({ ...soloRespuestas(1), ...cambios });
    expect(res.status).toBe(400);
    const err = await res.json<ErrorBody>();
    expect(err.error.code).toBe("RESPUESTAS_INVALIDAS");
    expect(err.error.message).toBeTypeOf("string");
  });

  it("devuelve 400 RESPUESTAS_INVALIDAS si no viene ninguna respuesta", async () => {
    const res = await post({ llamada_id: 1 });
    expect(res.status).toBe(400);
    expect((await res.json<ErrorBody>()).error.code).toBe("RESPUESTAS_INVALIDAS");
  });

  it.each([[{ respuesta_1: "a" }], [{ llamada_id: "abc" }], [{ llamada_id: 0 }]])(
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
    const res = await post(cuerpoValido(1), {});
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
  beforeEach(limpiarKV);

  it("devuelve lo guardado por el POST", async () => {
    const creado = await (await post(cuerpoValido(2))).json<{ data: unknown }>();
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
    await post(cuerpoValido(1));
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
