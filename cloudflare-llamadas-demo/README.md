# cloudflare-llamadas-demo

API REST de pruebas desplegada en Cloudflare Workers que **simula** el sistema de origen de una plataforma de verificación de referencias laborales. Un sistema externo consulta esta API por HTTP GET con el identificador de una llamada y recibe los datos asociados en JSON.

> Esta versión es únicamente un simulador. No realiza llamadas telefónicas ni usa modelos de IA. Los datos de las llamadas viven en memoria; las respuestas recopiladas se guardan en Workers KV. Todos los datos son **ficticios**: no contactar a los teléfonos incluidos ni asumir que las personas o empresas sean referencias reales.

## Requisitos

- Node.js 20 o superior (probado con Node 22)
- npm
- Una cuenta de Cloudflare (solo para desplegar)

## Instalación

```bash
cd cloudflare-llamadas-demo
npm install
```

## Configurar la API Key local

El endpoint principal exige el header `X-API-Key`. En desarrollo local la clave se lee del archivo `.dev.vars`, que **no se versiona**.

```bash
cp .dev.vars.example .dev.vars
```

Edita `.dev.vars` y define tu clave:

```
API_KEY=mi-clave-local
```

## Ejecutar localmente

```bash
npm run dev
```

Wrangler levanta la API en `http://localhost:8787`.

## Ejecutar las pruebas

Las pruebas corren en el runtime de Workers de forma local (Vitest + `@cloudflare/vitest-plugin`), sin desplegar nada y sin necesitar `.dev.vars` (usan una clave de pruebas definida en `vitest.config.ts`).

```bash
npm test
```

Verificación de tipos:

```bash
npm run typecheck
```

## Endpoints

| Método | Ruta                          | Autenticación | Descripción                           |
| ------ | ----------------------------- | ------------- | ------------------------------------- |
| GET    | `/api/health`                 | No            | Estado de la API                      |
| GET    | `/api/llamadas/{llamada_id}`  | `X-API-Key`   | Datos de la llamada (entero positivo) |
| POST   | `/api/llamadas`               | `X-API-Key`   | Mismos datos, con el ID en el cuerpo  |
| POST   | `/api/respuestas`             | `X-API-Key`   | Guarda las 9 respuestas de una llamada |
| GET    | `/api/respuestas/{llamada_id}` | `X-API-Key`  | Recupera las respuestas guardadas     |

Todas las respuestas llevan `Content-Type: application/json; charset=utf-8`.

### POST /api/llamadas

Alternativa al GET para sistemas que prefieren enviar el identificador en el cuerpo. El cuerpo debe ser un objeto JSON con el campo `llamada_id` (entero positivo, como número o como cadena de dígitos):

```json
{ "llamada_id": 2 }
```

Responde exactamente lo mismo que `GET /api/llamadas/2`. Los errores 401, 404 y 405 son los mismos; además devuelve 400 `CUERPO_INVALIDO` si el cuerpo no es un objeto JSON válido y 400 `ID_INVALIDO` si falta `llamada_id` o no es un entero positivo.

Registros de prueba disponibles: `llamada_id` 1 (candidato Miguel Maldonado, referencia Gabriel Duque en Jabil Chihuahua) y `llamada_id` 2 (candidato Jair Hernandez, referencia Guillermo Siller en Avattar Consulting).

### POST /api/respuestas

Guarda las respuestas obtenidas en una llamada. Se almacenan en Workers KV bajo la clave `respuestas:{llamada_id}`; un segundo POST para la misma llamada sobrescribe el anterior.

La estructura es **plana**, con un campo por pregunta, porque el agente que consume la API no puede enviar listas:

```json
{
  "llamada_id": 2,
  "pregunta_1": "¿Confirma que trabajó con usted?",
  "respuesta_1": "Sí",
  "pregunta_2": "¿En qué periodo?",
  "respuesta_2": "Marzo 2023 a agosto 2025",
  "pregunta_3": "...",
  "respuesta_3": "...",
  "pregunta_4": "...",
  "respuesta_4": "...",
  "pregunta_5": "...",
  "respuesta_5": "...",
  "pregunta_6": "...",
  "respuesta_6": "...",
  "pregunta_7": "...",
  "respuesta_7": "...",
  "pregunta_8": "...",
  "respuesta_8": "...",
  "pregunta_9": "...",
  "respuesta_9": "..."
}
```

Reglas de validación:

- `llamada_id` debe ser un entero positivo y la llamada debe existir (si no, 404 `LLAMADA_NO_ENCONTRADA`).
- `respuesta_1` a `respuesta_9` son **obligatorias**. Se acepta texto, número o booleano y se guarda como texto (máximo 2000 caracteres). Si falta alguna, 400 `RESPUESTAS_INVALIDAS` con la lista de campos faltantes.
- `pregunta_1` a `pregunta_9` son **opcionales** (el texto de la pregunta). Si no se envían, se guardan como `null`.
- Los campos desconocidos se ignoran.
- El número de preguntas se define en la constante `NUM_PREGUNTAS` de [src/types/respuestas.ts](src/types/respuestas.ts).

Responde 201 con el registro guardado, con la misma estructura plana y la fecha de recepción:

```json
{
  "success": true,
  "data": {
    "llamada_id": 2,
    "respuesta_1": "Sí",
    "pregunta_1": "¿Confirma que trabajó con usted?",
    "respuesta_2": "Marzo 2023 a agosto 2025",
    "pregunta_2": "¿En qué periodo?",
    "...": "...",
    "recibido_en": "2026-10-30T23:40:12.345Z"
  }
}
```

### GET /api/respuestas/{llamada_id}

Devuelve el objeto `data` guardado por el POST, o 404 `RESPUESTAS_NO_ENCONTRADAS` si aún no hay respuestas para esa llamada.

### Ejemplos con curl

```bash
# Salud (público)
curl http://localhost:8787/api/health

# Llamada existente
curl -H "X-API-Key: mi-clave-local" http://localhost:8787/api/llamadas/1

# Llamada inexistente -> 404
curl -H "X-API-Key: mi-clave-local" http://localhost:8787/api/llamadas/999

# Identificador inválido -> 400
curl -H "X-API-Key: mi-clave-local" http://localhost:8787/api/llamadas/abc

# Búsqueda por POST con el ID en el cuerpo
curl -X POST -H "X-API-Key: mi-clave-local" -H "Content-Type: application/json" \
  -d '{"llamada_id": 2}' http://localhost:8787/api/llamadas

# Guardar respuestas (el cuerpo completo está en la sección POST /api/respuestas)
curl -X POST -H "X-API-Key: mi-clave-local" -H "Content-Type: application/json" \
  -d @respuestas.json http://localhost:8787/api/respuestas

# Recuperar respuestas guardadas
curl -H "X-API-Key: mi-clave-local" http://localhost:8787/api/respuestas/2

# Sin API Key o con clave incorrecta -> 401
curl http://localhost:8787/api/llamadas/1

# Método no permitido -> 405
curl -X POST -H "X-API-Key: mi-clave-local" http://localhost:8787/api/llamadas/1
```

### Respuesta 200 (`GET /api/llamadas/1`)

```json
{
  "llamada_id": 1,
  "empresa_contratante": "Avattar IT Solutions",
  "candidato": {
    "nombre": "Miguel Maldonado",
    "puesto_vacante": "Desarrollador Jr",
    "reclutador": "Estrella Sagredo",
    "telefono_rh": "+52 55 0000 1100"
  },
  "consentimiento": {
    "folio": "CONS-2026-0143",
    "fecha_firma": "2026-10-28"
  },
  "referencia": {
    "nombre": "Gabriel Duque",
    "puesto_declarado": "Jefe de Ingenieria",
    "relacion_declarada": "Jefe directo",
    "empresa": "Jabil Chihuahua",
    "telefono": "+52 614 123 4567",
    "extension": null,
    "fuente_telefono": "Proporcionado por el candidato (no verificado)",
    "horario_preferido": "No especificado"
  },
  "datos_a_verificar": {
    "empresa": "Jabil Chihuahua",
    "puesto": "Técnico de Pruebas",
    "periodo": "junio de 2021 a mayo de 2022",
    "relacion": "Jefe directo"
  },
  "verificar_identidad": true
}
```

### Errores

Todos los errores comparten el mismo formato:

```json
{
  "success": false,
  "error": {
    "code": "LLAMADA_NO_ENCONTRADA",
    "message": "No se encontró la llamada solicitada"
  }
}
```

| HTTP | `code`                  | Cuándo                                              |
| ---- | ----------------------- | --------------------------------------------------- |
| 400  | `ID_INVALIDO`           | El identificador no es un entero positivo (o falta `llamada_id` en el POST) |
| 400  | `CUERPO_INVALIDO`       | El cuerpo del POST no es un objeto JSON válido      |
| 400  | `RESPUESTAS_INVALIDAS`  | Faltan respuestas o algún campo no es texto válido  |
| 404  | `RESPUESTAS_NO_ENCONTRADAS` | No hay respuestas guardadas para esa llamada    |
| 401  | `NO_AUTORIZADO`         | Falta el header `X-API-Key` o la clave es incorrecta |
| 404  | `LLAMADA_NO_ENCONTRADA` | El identificador es válido pero no existe           |
| 404  | `RUTA_NO_ENCONTRADA`    | La ruta no está implementada                        |
| 405  | `METODO_NO_PERMITIDO`   | Método no admitido en esa ruta (ver header `Allow`) |

`OPTIONS` responde 204 con el header `Allow` correspondiente (`GET, OPTIONS` en las rutas con `{id}`, `POST, OPTIONS` en `/api/llamadas` y `/api/respuestas`) y no requiere autenticación.

## Almacenamiento de respuestas (Workers KV)

Las respuestas se guardan en un namespace de Workers KV enlazado al Worker como `RESPUESTAS`.

- `npm test` usa **siempre** un KV simulado en disco (`remoteBindings: false` en `vitest.config.ts`), así que las pruebas nunca tocan el namespace real.
- `npm run dev` usa el KV simulado, salvo que el binding tenga `"remote": true` en `wrangler.jsonc`; en ese caso el servidor local lee y escribe en el namespace real de Cloudflare. Útil para ver desde Postman lo mismo que ve el Worker desplegado, pero ten en cuenta que los datos son reales.

Para desplegar hace falta crear el namespace una sola vez:

```bash
npx wrangler kv namespace create RESPUESTAS
```

Wrangler devuelve un `id`. Cópialo en `wrangler.jsonc` sustituyendo el valor `REEMPLAZA_CON_EL_ID_DE_TU_NAMESPACE`:

```jsonc
"kv_namespaces": [
  { "binding": "RESPUESTAS", "id": "<id devuelto por wrangler>" }
]
```

Después despliega con normalidad. Para ver lo guardado, entra en el panel de Cloudflare a **Storage & Databases**, **KV**, y abre el namespace; o desde la terminal:

```bash
npx wrangler kv key get --binding RESPUESTAS "respuestas:2" --remote
```

## Desplegar en Cloudflare Workers

1. Iniciar sesión con Wrangler (abre el navegador):

   ```bash
   npx wrangler login
   ```

2. Configurar el secreto `API_KEY` en Cloudflare (se pedirá el valor de forma interactiva; nunca lo escribas en el código ni en `wrangler.jsonc`):

   ```bash
   npx wrangler secret put API_KEY
   ```

3. Desplegar:

   ```bash
   npm run deploy
   ```

   Wrangler mostrará la URL pública del Worker, por ejemplo `https://cloudflare-llamadas-demo.<tu-subdominio>.workers.dev`.

4. Probar desde Postman, curl o el sistema externo:

   ```bash
   curl -H "X-API-Key: <tu-clave>" https://cloudflare-llamadas-demo.<tu-subdominio>.workers.dev/api/llamadas/1
   ```

Si el secreto no está configurado, el endpoint responde 401 a todas las peticiones (falla cerrado).

## Agregar más llamadas de prueba

Los registros viven en memoria en [src/data/llamadas.ts](src/data/llamadas.ts). Para agregar uno nuevo, añade otro objeto al arreglo `LLAMADAS` con un `llamada_id` entero positivo que no se repita. El tipo `Llamada` en [src/types/llamada.ts](src/types/llamada.ts) garantiza que el registro cumpla el contrato. Cada consulta devuelve una copia del registro, por lo que los datos nunca se modifican.

## Estructura del proyecto

```
src/
  index.ts              Punto de entrada: enrutamiento y manejo de métodos
  routes/llamadas.ts    Validación del ID y lógica de GET /api/llamadas/{id} y POST /api/llamadas
  routes/respuestas.ts  Validación y guardado/lectura de respuestas en KV
  types/respuestas.ts   Contrato de las respuestas y NUM_PREGUNTAS
  data/llamadas.ts      Registros ficticios en memoria
  middleware/auth.ts    Verificación de X-API-Key (comparación en tiempo constante)
  utils/responses.ts    Respuestas JSON y errores con formato uniforme
  types/llamada.ts      Contrato de datos y tipado del entorno
tests/
  llamadas.test.ts      GET por ID, validación, métodos y rutas
  busqueda.test.ts      POST con llamada_id en el cuerpo y registro 2
  respuestas.test.ts    Guardado y lectura de respuestas en KV
  auth.test.ts          Autenticación
vitest.config.ts        Configuración de Vitest para el runtime de Workers
wrangler.jsonc          Configuración del Worker
.dev.vars.example       Plantilla de variables locales
```

## Seguridad

- La API Key es una protección **básica para pruebas**. Si el sistema pasa a producción, debe diseñarse una autenticación apropiada entre servicios (por ejemplo, mTLS o tokens firmados con rotación).
- La clave nunca se registra en logs ni se incluye en respuestas.
- No se configura CORS: la API está pensada para consumo servidor a servidor. CORS no es un mecanismo de autenticación.
- Los mensajes de error no exponen detalles internos.
- Las respuestas llevan `Cache-Control: no-store` para evitar que intermediarios almacenen datos personales.
