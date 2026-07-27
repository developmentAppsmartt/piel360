# Diagnóstico de latencia en análisis de YouCam

Contexto: Perfect Corp (proveedor de YouCam) promete hasta 10 segundos de respuesta.
El cliente reportó que los análisis se sentían más lentos que eso. Este documento
recoge las 4 pruebas cronometradas hechas para averiguar por qué (2 en producción
antes del fix, 2 en local + 1 en producción después del fix) y el hallazgo nuevo
que queda pendiente de resolver del lado de YouCam.

## Resumen

1. **YouCam sí responde rápido** (4-9 segundos en todas las pruebas) — el proveedor
   cumple lo que promete.
2. **El webhook de YouCam llega a tiempo, pero con un `task_id` que nunca coincide**
   con el que YouCam nos devolvió al crear la tarea. Confirmado en 4 de 4 pruebas
   con webhook capturado — incluso después de rotar el secreto del webhook.
3. Aplicamos un fix que **no depende del webhook para ser rápido**: el job de
   respaldo ahora hace su primer chequeo a los 8 segundos (antes 30s fijos). Esto
   ya está desplegado y verificado.
4. El problema de fondo del `task_id` que no coincide sigue sin resolverse — con
   la evidencia nueva de esta ronda, ahora hay razones para creer que es un
   comportamiento del lado de YouCam, no un bug de nuestro código. Se necesita
   escalarlo a soporte de Perfect Corp.

## El fix ya desplegado

`apps/api/src/youcam/youcam-analyses.service.ts`: el job de respaldo (BullMQ)
que revisa el estado de la tarea separó su delay inicial del delay de reintentos:

| | Antes | Ahora |
|---|---|---|
| Primer chequeo | 30s fijos | 8s |
| Reintentos (si sigue "processing") | backoff desde 30s | backoff desde 15s |

`apps/api/src/youcam/youcam-webhook.service.ts`: cuando el `task_id` del webhook
no coincide con ningún análisis, ahora se loguea el **payload completo** (antes
solo el `task_id`), para poder investigar el mismatch cuando vuelva a pasar.

## Pruebas realizadas

### Antes del fix (producción, 27 jul 2026 ~17:26-17:30 UTC)

| Prueba | Resultado | Tiempo real (creación → confirmación) | Webhook |
|---|---|---|---|
| Análisis #9 | Éxito | 30.1s (job de respaldo, delay fijo de 30s) | Llegó a los 9.3s, `task_id` no coincidía |
| Análisis #10 | Rostro muy pequeño | 30.3s (job de respaldo) | Llegó x2 a los 4.3s, `task_id` no coincidía |

### Después del fix (local, con la cuenta de prueba y las mismas fotos)

| Prueba | Resultado | Tiempo real |
|---|---|---|
| Análisis #74 | Éxito | 24.2s (1er chequeo a los 8s aún "processing", 2do a los ~23s ya listo) |
| Análisis #75 | Rostro muy pequeño (`error_src_face_too_small`) | 8.7s (detectado en el primer chequeo) |

En local no llegan webhooks reales (Perfect Corp solo llama a la URL pública de
Railway), así que estas 2 pruebas solo validan el camino del job de respaldo.

### Después del fix (producción, 27 jul 2026 ~18:18 UTC) — con webhook real

| Prueba | Resultado | Tiempo real | Webhook |
|---|---|---|---|
| Análisis #11 | Éxito | 23.4s (mismo patrón: 1er chequeo a los 8s "processing", 2do a los ~23s ya listo) | Llegó a los 8.25s, `task_id` seguía sin coincidir |

### Después de rotar `YOUCAM_WEBHOOK_SECRET` (producción, 27 jul 2026 ~20:49 UTC)

El cliente regeneró el secreto del webhook en el CRM de Perfect Corp (por si ese
fuera el problema) y lo actualizó tanto en local como en Railway. Se probó de
nuevo para descartarlo:

| Prueba | Resultado | Tiempo real | Webhook |
|---|---|---|---|
| Análisis #12 | Éxito | 23.3s (mismo patrón de siempre) | Llegó a los 9.1s, `task_id` seguía sin coincidir |

**El secreto nuevo no cambió nada** — esperable, ya que el secreto solo afecta
la verificación de firma (que ya funcionaba antes: si hubiera estado mal, el
webhook habría fallado con 403 en vez de procesarse). El `task_id` sigue sin
coincidir exactamente igual que en los 3 casos anteriores. Un dato nuevo de esta
prueba: el header `webhook-id` (ya corregido en el log) llegó como
`msg_jR-nqIdCpwUiyofm4K3bUamNzXCZFqo_CgiiJh1ZbqkowEg5V0rD_EsBki3Qs5Us:115591779768`
— está construido como `msg_<el mismo task_id del payload>:<timestamp>`, lo que
confirma que el `task_id` del webhook es un valor real y consistente del propio
sistema de Perfect Corp, no basura ni corrupción — simplemente es un
identificador distinto al que devuelven al crear la tarea.

## El hallazgo nuevo: el `task_id` del webhook parece ser otro ID por diseño de YouCam, no un bug nuestro

Con el logging del payload completo ya activo, esta es la captura exacta del
análisis #11:

```json
{
  "created_at": 1785176347,
  "data": {
    "taskId": "wZg3pnCYjTGAk3cqVNWNkZWcYTY5FnZy0QjyGmiid-l8WJ4SXXln8rLZ7xGWKYq8",
    "taskStatus": "success"
  }
}
```

Comparado con lo que YouCam nos devolvió al crear la tarea del mismo análisis:

```
task_id (creación): WNVjLDOltgSOUcOcaUJXDc0CIQroLbo5e6M544GT1T4lYJ4c5BbfNRc4xDFp6ajN4W2A1L0GRcIPu7jggqqCe_7CF5ByWWQ967GlJ_A2I98
task_id (webhook):  wZg3pnCYjTGAk3cqVNWNkZWcYTY5FnZy0QjyGmiid-l8WJ4SXXln8rLZ7xGWKYq8
```

Son completamente distintos — no es un problema de formato, mayúsculas o
truncamiento. Tres datos apuntan a que **este webhook sí es el de nuestra propia
tarea**, solo que con otro identificador:

- Llegó **8.25 segundos** después de haber creado la tarea (`created_at` del
  payload vs. nuestro `createdAt`) — coherente con la velocidad de YouCam medida
  en las 4 pruebas.
- Fue el **único** webhook recibido en toda la ventana de la prueba.
- Su `taskStatus: "success"` coincide con el resultado real que confirmó después
  el job de respaldo.

El payload no trae ningún otro campo (`dst_id`, `request_id`, etc.) que sirva
para correlacionarlo de forma confiable con el `task_id` de creación — solo
`taskId` y `taskStatus`. Esto ya había pasado en las 2 pruebas de antes del fix
(análisis #9 y #10) y se repite ahora con el logging completo activo, así que no
parece un caso aislado.

**Conclusión:** todo apunta a que YouCam usa un identificador distinto para el
webhook que para la respuesta de creación de la tarea (quizás un ID interno vs.
uno externo), y no hay forma de emparejarlos de manera confiable desde nuestro
lado con la información que el proveedor envía hoy.

## Evidencia cruda: logs de Railway y respuestas reales de YouCam

Para mostrarle al cliente exactamente por qué el sistema sigue dependiendo del
job de respaldo y no del webhook, esta es la transcripción literal de los logs
de Railway capturados en el momento de cada prueba (las de los análisis #9 y
#10 ya rotaron fuera de la ventana de retención de Railway al momento de
escribir esta sección, se transcriben tal cual se capturaron durante la
prueba; las de #11 y #12 siguen disponibles y se volvieron a confirmar
re-consultando `railway logs`).

**Análisis #9** (antes del fix del logging completo — solo se veía el `task_id`):
```
[Nest] 58  - 07/27/2026, 5:27:02 PM    WARN [YoucamWebhookService] Webhook YouCam: no se encontró Analysis para taskId=73Mrf0VakspiaJZx8pG9S4udHAz8WJznsdEpqVH1iJVwfbP-eONKiUrze9V1JRSw
```

**Análisis #10** (mismo webhook llegó duplicado):
```
[Nest] 58  - 07/27/2026, 5:29:35 PM    WARN [YoucamWebhookService] Webhook YouCam: no se encontró Analysis para taskId=Mng8Cc21siufLm6uT2nt8NZNpeh5qMTsSRjmExCpgO7ELiQXa0XdWMIFL0sm1Tsf
[Nest] 58  - 07/27/2026, 5:29:35 PM    WARN [YoucamWebhookService] Webhook YouCam: no se encontró Analysis para taskId=Mng8Cc21siufLm6uT2nt8NZNpeh5qMTsSRjmExCpgO7ELiQXa0XdWMIFL0sm1Tsf
```

**Análisis #11** (ya con el payload completo en el log):
```
[Nest] 58  - 07/27/2026, 6:19:07 PM    WARN [YoucamWebhookService] Webhook YouCam: no se encontró Analysis para taskId=wZg3pnCYjTGAk3cqVNWNkZWcYTY5FnZy0QjyGmiid-l8WJ4SXXln8rLZ7xGWKYq8. Payload completo: {"created_at":1785176347,"data":{"taskId":"wZg3pnCYjTGAk3cqVNWNkZWcYTY5FnZy0QjyGmiid-l8WJ4SXXln8rLZ7xGWKYq8","taskStatus":"success"}}. svix-id=undefined
```

**Análisis #12** (ya con el header `webhook-id` corregido, después de rotar el secreto):
```
[Nest] 58  - 07/27/2026, 8:49:49 PM    WARN [YoucamWebhookService] Webhook YouCam: no se encontró Analysis para taskId=jR-nqIdCpwUiyofm4K3bUamNzXCZFqo_CgiiJh1ZbqkowEg5V0rD_EsBki3Qs5Us. Payload completo: {"created_at":1785185389,"data":{"taskId":"jR-nqIdCpwUiyofm4K3bUamNzXCZFqo_CgiiJh1ZbqkowEg5V0rD_EsBki3Qs5Us","taskStatus":"success"}}. webhook-id=msg_jR-nqIdCpwUiyofm4K3bUamNzXCZFqo_CgiiJh1ZbqkowEg5V0rD_EsBki3Qs5Us:115591779768
```

En los 4 casos, el sistema hace exactamente lo mismo: recibe el webhook,
responde `200 OK` (para no generar un retry storm de YouCam), pero no puede
usarlo porque el `task_id` que trae nunca corresponde a ninguno de nuestros
análisis. Por eso el resultado real siempre termina llegando por el job de
respaldo (la vía que sí funciona), nunca por el webhook.

### La respuesta real de YouCam al consultar una tarea

Además de los logs del webhook, esta es la respuesta cruda que devuelve YouCam
al consultar directamente el estado de una tarea (`GET
/s2s/v2.1/task/skin-analysis/{task_id}`), capturada para los análisis que
fallaron por baja calidad de imagen:

```json
{"task_status":"error","error":"Input image resolution is too small."}
```
*(análisis #6 y #7, investigados vía `railway run` contra la API real de YouCam
con las credenciales de producción — el hallazgo original que motivó el primer
fix de esta serie).*

```json
{"error":true,"message":"The face area in the uploaded image is too small"}
```
*(análisis #10 en producción, ya procesado y guardado por nuestro sistema).*

```json
{"error":true,"message":"error_src_face_too_small"}
```
*(análisis #75 y #76, mismas pruebas pero corridas en local — en este caso
YouCam no incluyó `error_message`, así que se ve el código crudo del error en
vez de la descripción legible).*

## Qué falta

1. **Escalar a soporte de Perfect Corp/YouCam** con esta evidencia (los dos
   `task_id` del análisis #11 y el payload completo del webhook) y preguntar
   explícitamente: ¿el `taskId` del webhook corresponde a un identificador
   distinto al de `POST /task/skin-analysis`? ¿Hay algún campo adicional que
   podamos pedir en el payload para correlacionarlo?
2. Mientras tanto, el sistema **no depende del webhook** para funcionar — el job
   de respaldo (ya con el delay reducido) es la vía confiable y el usuario ya no
   espera los 30 segundos fijos de antes.

## Revisión de la documentación oficial de Perfect Corp (`docs/webhook_documentation.MD`, `docs/start_guid.MD`, `docs/V2.1.MD`)

El cliente encontró y agregó la documentación oficial de Perfect Corp sobre
webhooks y sobre el endpoint `/s2s/v2.1/task/skin-analysis`. Se revisó buscando
una explicación directa al mismatch del `task_id` — no la hay. De hecho,
`V2.1.MD` refuerza que el `task_id` del webhook debería servir para consultar el
resultado ("use the received task_id to query the task result"), lo que confirma
que el mismatch que observamos es una anomalía real, no un comportamiento
documentado o esperado por el propio proveedor.

Sí se aplicaron dos correcciones a partir de esta documentación:

1. **Header correcto: `webhook-id`, no `svix-id`.** El log de diagnóstico
   agregado antes intentaba leer `headers['svix-id']` para tener una clave de
   correlación con soporte de Perfect Corp, pero ese header no existe — por eso
   salió `undefined` en la prueba de producción del análisis #11. La doc oficial
   confirma que el nombre real es `webhook-id` (formato `msg_<id>:<timestamp>`,
   el ID de entrega del mensaje — no tiene relación con el `task_id` de YouCam,
   solo sirve como referencia si hace falta escalar con soporte). Ya corregido
   en el código.
2. **Preferir `data.error_message` sobre `data.error`.** `V2.1.MD` documenta que
   `data.error` es solo el código del error (ej. `"error_no_face"`,
   `"error_pose"`, `"error_face_parsing"`, `"error_nsfw_content_detected"`,
   `"error_inference"`, entre otros) y `data.error_message` trae la descripción
   detallada — son campos separados. `checkStatus` ahora prefiere
   `error_message` cuando YouCam lo manda, para mostrar mensajes de fallo más
   claros en el frontend.

También se observó (sin cambio de código, solo como referencia): el ejemplo de
`docs/webhook_documentation.MD` usa `task_id`/`task_status` (snake_case), pero el
payload real capturado en el análisis #11 trae `taskId`/`taskStatus`
(camelCase) — nuestro tipo ya asume camelCase por casualidad, así que no hay bug
de parseo hoy, pero es una pista más para llevar a soporte de Perfect Corp si se
escala el caso. `V2.1.MD` también advierte no exceder la "ventana de polling
permitida" (no especifica cuánto dura) porque un chequeo tardío puede devolver
`InvalidTaskId` aunque el análisis haya terminado, y aun así cobrarse la
unidad — queda anotado como algo a vigilar si en el futuro se alargan los
reintentos del job de respaldo.
