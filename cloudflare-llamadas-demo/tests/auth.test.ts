import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const URL_LLAMADA = "http://localhost/api/llamadas/1";
const API_KEY = env.API_KEY as string;

describe("autenticación con X-API-Key", () => {
  it("devuelve 401 cuando la API Key está ausente", async () => {
    const res = await SELF.fetch(URL_LLAMADA);
    expect(res.status).toBe(401);
    expect(res.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
    const body = await res.json<{ success: boolean; error: { code: string } }>();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("NO_AUTORIZADO");
  });

  it("devuelve 401 cuando la API Key está vacía", async () => {
    const res = await SELF.fetch(URL_LLAMADA, { headers: { "X-API-Key": "" } });
    expect(res.status).toBe(401);
  });

  it("devuelve 401 cuando la API Key es incorrecta", async () => {
    const res = await SELF.fetch(URL_LLAMADA, { headers: { "X-API-Key": "clave-incorrecta" } });
    expect(res.status).toBe(401);
  });

  it("devuelve 401 cuando la API Key solo coincide parcialmente", async () => {
    const res = await SELF.fetch(URL_LLAMADA, { headers: { "X-API-Key": `${API_KEY}x` } });
    expect(res.status).toBe(401);
  });

  it("no revela la API Key en la respuesta de error", async () => {
    const res = await SELF.fetch(URL_LLAMADA, { headers: { "X-API-Key": "clave-incorrecta" } });
    expect(await res.text()).not.toContain(API_KEY);
  });

  it("permite la consulta con una API Key válida", async () => {
    const res = await SELF.fetch(URL_LLAMADA, { headers: { "X-API-Key": API_KEY } });
    expect(res.status).toBe(200);
    const body = await res.json<{ llamada_id: number }>();
    expect(body.llamada_id).toBe(1);
  });

  it("acepta el header sin distinguir mayúsculas", async () => {
    const res = await SELF.fetch(URL_LLAMADA, { headers: { "x-api-key": API_KEY } });
    expect(res.status).toBe(200);
  });

  it("exige autenticación incluso para una llamada inexistente", async () => {
    const res = await SELF.fetch("http://localhost/api/llamadas/999");
    expect(res.status).toBe(401);
  });
});
