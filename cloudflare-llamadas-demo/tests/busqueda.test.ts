import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const URL_BUSQUEDA = "http://localhost/api/llamadas";
const API_KEY = env.API_KEY as string;

function post(body: unknown, headers: Record<string, string> = { "X-API-Key": API_KEY }) {
  return SELF.fetch(URL_BUSQUEDA, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/llamadas", () => {
  it("devuelve 200 con los mismos datos que GET /api/llamadas/1", async () => {
    const res = await post({ llamada_id: 1 });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
    const porGet = await (
      await SELF.fetch(`${URL_BUSQUEDA}/1`, { headers: { "X-API-Key": API_KEY } })
    ).json();
    expect(await res.json()).toEqual(porGet);
  });

  it("devuelve la llamada 2 con los datos esperados", async () => {
    const res = await post({ llamada_id: 2 });
    expect(res.status).toBe(200);
    const body = await res.json<{
      llamada_id: number;
      candidato: { nombre: string };
      referencia: { nombre: string; empresa: string; relacion_declarada: string };
      datos_a_verificar: { empresa: string };
    }>();
    expect(body.llamada_id).toBe(2);
    expect(body.candidato.nombre).toBe("Jair Hernandez");
    expect(body.referencia.nombre).toBe("Guillermo Siller");
    expect(body.referencia.empresa).toBe("Avattar Consulting");
    expect(body.referencia.relacion_declarada).toBe("Jefe directo");
    expect(body.datos_a_verificar.empresa).toBe("Avattar Consulting");
  });

  it("acepta llamada_id como cadena de dígitos", async () => {
    const res = await post({ llamada_id: "2" });
    expect(res.status).toBe(200);
    expect((await res.json<{ llamada_id: number }>()).llamada_id).toBe(2);
  });

  it("devuelve 404 para una llamada inexistente", async () => {
    const res = await post({ llamada_id: 999 });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      success: false,
      error: {
        code: "LLAMADA_NO_ENCONTRADA",
        message: "No se encontró la llamada solicitada",
      },
    });
  });

  it.each([
    [{ llamada_id: "abc" }],
    [{ llamada_id: 0 }],
    [{ llamada_id: -1 }],
    [{ llamada_id: 1.5 }],
    [{ llamada_id: null }],
    [{ llamada_id: true }],
    [{ llamada_id: { id: 1 } }],
    [{}],
    [{ id: 1 }],
  ])("devuelve 400 ID_INVALIDO para el cuerpo %j", async (body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    const json = await res.json<{ success: boolean; error: { code: string } }>();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("ID_INVALIDO");
  });

  it.each(["", "no es json", "[1]", "null", '"1"'])(
    "devuelve 400 CUERPO_INVALIDO para el cuerpo crudo %j",
    async (raw) => {
      const res = await post(raw);
      expect(res.status).toBe(400);
      const json = await res.json<{ success: boolean; error: { code: string } }>();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("CUERPO_INVALIDO");
    },
  );

  it("devuelve 401 sin API Key", async () => {
    const res = await post({ llamada_id: 1 }, {});
    expect(res.status).toBe(401);
  });

  it("devuelve 401 con API Key incorrecta", async () => {
    const res = await post({ llamada_id: 1 }, { "X-API-Key": "clave-incorrecta" });
    expect(res.status).toBe(401);
  });

  it.each(["GET", "PUT", "PATCH", "DELETE"])("%s /api/llamadas devuelve 405", async (method) => {
    const res = await SELF.fetch(URL_BUSQUEDA, { method, headers: { "X-API-Key": API_KEY } });
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("POST, OPTIONS");
  });

  it("OPTIONS /api/llamadas devuelve 204 con Allow", async () => {
    const res = await SELF.fetch(URL_BUSQUEDA, { method: "OPTIONS" });
    expect(res.status).toBe(204);
    expect(res.headers.get("Allow")).toBe("POST, OPTIONS");
  });

  it("POST /api/llamadas/1 sigue devolviendo 405", async () => {
    const res = await post({ llamada_id: 1 });
    expect(res.status).toBe(200);
    const conId = await SELF.fetch(`${URL_BUSQUEDA}/1`, {
      method: "POST",
      headers: { "X-API-Key": API_KEY },
    });
    expect(conId.status).toBe(405);
  });
});
