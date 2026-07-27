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
   con el que YouCam nos devolvió al crear la tarea. Confirmado en 3 de 3 pruebas
   con webhook capturado.
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

## Qué falta

1. **Escalar a soporte de Perfect Corp/YouCam** con esta evidencia (los dos
   `task_id` del análisis #11 y el payload completo del webhook) y preguntar
   explícitamente: ¿el `taskId` del webhook corresponde a un identificador
   distinto al de `POST /task/skin-analysis`? ¿Hay algún campo adicional que
   podamos pedir en el payload para correlacionarlo?
2. Mientras tanto, el sistema **no depende del webhook** para funcionar — el job
   de respaldo (ya con el delay reducido) es la vía confiable y el usuario ya no
   espera los 30 segundos fijos de antes.
3. **Corrección menor pendiente**: el log de diagnóstico agregado en
   `youcam-webhook.service.ts` intenta capturar el header `svix-id` para
   correlacionar con los logs de Perfect Corp, pero el nombre real del header
   (según la librería `svix` que ya usamos) es `webhook-id` — hoy ese campo del
   log siempre sale `undefined`. Es un ajuste de una línea, pendiente de aplicar.
