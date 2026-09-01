---
name: security-audit-top10
description: "Audita, escribe o corrige código aplicando 10 controles de seguridad: secretos y API keys, purga de Git, claves públicas de base de datos, RLS, cifrado, autenticación, autorización RBAC/ABAC e IDOR, mass assignment, cookies seguras y hash de contraseñas. Usar al revisar código, endpoints, autenticación, bases de datos, configuración, variables de entorno o vulnerabilidades de seguridad."
argument-hint: "Indica el archivo, endpoint, diff o flujo que quieres auditar"
user-invocable: true
disable-model-invocation: false
---

# Auditoría De Seguridad Top 10

## Objetivo

Evaluar código y configuración con enfoque de desarrollo seguro, detectar riesgos explotables y proponer cambios concretos. La auditoría debe adaptarse al stack existente: no inventes una base de datos, un proveedor de autenticación o un mecanismo de cookies que el proyecto no use.

## Cuándo Usar

- Revisar código, un diff, una rama, un endpoint o una funcionalidad de autenticación.
- Escribir o corregir código que maneje secretos, usuarios, sesiones, datos sensibles o persistencia.
- Evaluar configuraciones de `.env`, `.gitignore`, Git, Supabase/PostgreSQL, APIs o middleware.
- Investigar posibles fugas de credenciales, IDOR, bypass de autenticación, mass assignment o almacenamiento inseguro de contraseñas.

## Procedimiento

1. Identifica el ancla concreta: archivo, símbolo, endpoint, diff, test fallido o flujo reportado.
2. Lee las instrucciones del repositorio y determina el stack, límites de confianza, actores y datos sensibles.
3. Sigue el flujo de entrada hasta autenticación, autorización, validación, persistencia, respuesta y logging.
4. Comprueba cada control de la lista siguiente. Marca cada uno como `OK`, `RIESGO`, `NO APLICA` o `NO VERIFICABLE` y conserva la evidencia.
5. Prioriza hallazgos por impacto y explotabilidad. Incluye archivo y línea cuando sea posible, condición de explotación, impacto y corrección mínima.
6. Si el usuario pidió corregir, realiza el cambio más pequeño que resuelva la causa raíz. No expongas ni copies secretos reales en la respuesta.
7. Ejecuta la validación disponible: tests focalizados, typecheck, lint, build o una comprobación de configuración. Añade o actualiza tests cuando el riesgo lo justifique.
8. Revisa el diff final para confirmar que no se introdujeron secretos, bypasses, cambios de API innecesarios o regresiones.

## Controles Obligatorios

### 1. Secretos Y API Keys

- Nunca pongas API keys, tokens, contraseñas, certificados privados o credenciales en código fuente, bundles del cliente, logs, fixtures públicos o mensajes de error.
- Usa variables de entorno en el proceso que realmente necesita el secreto (`process.env`, `os.environ` o equivalente).
- Verifica que solo las variables explícitamente públicas lleguen al frontend. Una variable de entorno no es secreta si el bundler la incrusta en el cliente.
- Comprueba validación de variables requeridas sin imprimir su valor.

### 2. Purga De Secretos En Git

- Verifica `.gitignore` para `.env`, `.env.*` con excepciones solo para ejemplos, `*.pem`, `*.key`, `secrets.json` y artefactos equivalentes.
- Comprueba si un secreto está rastreado o aparece en diffs, historial, bundles o logs.
- Si una clave fue comprometida, recomienda revocarla y rotarla primero; después recomienda `git-filter-repo` o BFG Repo-Cleaner para eliminar el historial. Quitar el archivo del último commit no basta.
- Nunca incluyas el valor encontrado en el informe.

### 3. Claves Públicas De Base De Datos

- En clientes solo pueden aparecer claves públicas/anónimas diseñadas para ese uso.
- Nunca expongas `service_role`, `admin key`, credenciales de conexión ni tokens con privilegios elevados.
- Verifica que las operaciones sensibles pasen por un servidor autenticado y autorizado.
- No confundas una anon key con autorización: los permisos deben estar respaldados por políticas de seguridad.

### 4. Row Level Security (RLS)

- Para PostgreSQL/Supabase, verifica que las tablas con datos de usuario tengan RLS activado.
- Revisa por separado `SELECT`, `INSERT`, `UPDATE` y `DELETE`; una política de lectura no protege las escrituras.
- Las políticas deben vincular el recurso al usuario autenticado, normalmente mediante `auth.uid() = user_id` o una relación de propietario equivalente.
- Comprueba también que `user_id` no pueda ser sustituido durante `INSERT` o `UPDATE`, y que los roles de servicio estén confinados al backend.
- Si el stack no usa PostgreSQL/Supabase, marca el control como no aplicable y evalúa su equivalente de autorización por recurso.

### 5. Encriptación

- Exige TLS para datos en tránsito y configuración que rechace conexiones inseguras en producción.
- Para datos sensibles en reposo, usa cifrado autenticado moderno como AES-256-GCM o una solución administrada equivalente, con gestión y rotación de claves separada de los datos.
- No uses cifrado casero, ECB, claves hardcodeadas ni modos sin autenticación.
- Distingue cifrado reversible de hash: las contraseñas no se cifran, se hashean.

### 6. Autenticación Obligatoria

- Toda ruta, función privada, Server Action o consulta protegida debe validar una sesión, token o JWT antes de procesar datos o mutaciones.
- Verifica firma, issuer, audience, expiración y algoritmo del token según el proveedor. Nunca aceptes un JWT sin validación criptográfica.
- Aplica autenticación en el servidor, no solo ocultando controles en el cliente.
- Revisa rutas alternativas, endpoints internos, métodos HTTP distintos y respuestas de error que puedan revelar información.

### 7. Autorización, RBAC/ABAC E IDOR

- Después de autenticar, comprueba el rol, atributo o permiso necesario para la acción.
- Para cada ID recibido del cliente, verifica en el servidor que el recurso pertenece al usuario o que el usuario tiene permiso explícito para accederlo.
- No confíes en IDs, roles, flags o `user_id` enviados por el cliente.
- Prueba acceso cruzado entre dos usuarios y diferencia correctamente `401` de `403` sin filtrar datos.

### 8. Mass Assignment

- Nunca pases directamente `req.body`, payloads de formularios o un objeto cliente a una actualización de base de datos.
- Define una lista allowlist, DTO o esquema de validación para cada operación.
- Separa campos controlados por el servidor, como `user_id`, `role`, `is_admin`, `verified`, propietario y timestamps.
- Revisa tanto creación como actualización, incluyendo campos anidados y spread operators.

### 9. Cookies De Sesión Seguras

- Las cookies de sesión deben usar `HttpOnly`, `Secure` en producción y `SameSite=Lax` o `Strict` según el flujo.
- Define `Path`, `Domain`, expiración y renovación con el menor alcance necesario.
- Si `SameSite=None` es imprescindible, exige `Secure` y protección CSRF adicional.
- No guardes tokens sensibles en `localStorage` cuando una cookie HttpOnly sea viable; revisa también invalidación al cerrar sesión y rotación.

### 10. Hash De Contraseñas

- Nunca almacenes ni registres contraseñas en texto plano.
- Usa Argon2id, bcrypt o scrypt con parámetros actuales y sal incorporada por la biblioteca.
- Nunca uses MD5, SHA-1, SHA-256 directo ni un hash sin sal para contraseñas.
- Compara hashes con una función segura y limita intentos de autenticación; no reveles si falló el usuario o la contraseña.

## Formato De Informe

Presenta primero los hallazgos, ordenados por severidad:

```text
[CRÍTICO|ALTO|MEDIO|BAJO] Título
Ubicación: archivo y línea o símbolo
Evidencia: comportamiento observable sin revelar secretos
Explotación: precondiciones y pasos de alto nivel
Impacto: datos o acciones comprometidos
Corrección: cambio concreto y mínimo
Validación: test o comprobación ejecutada
```

Después incluye una matriz breve con los 10 controles y su estado. Separa claramente:

- `Confirmado`: hay evidencia en el código o configuración.
- `Probable`: el flujo sugiere el riesgo, pero falta una dependencia o configuración.
- `No verificable`: se necesita un secreto, entorno, historial Git o despliegue no disponible.
- `No aplica`: el control no corresponde al stack o al flujo revisado.

Si no encuentras problemas, dilo explícitamente y enumera los huecos de prueba o dependencias que quedaron fuera de alcance. No afirmes que un sistema es seguro solo porque no apareció una coincidencia textual.

## Límites Y Buenas Prácticas

- No solicites ni reproduzcas contraseñas, API keys, tokens privados u otros secretos.
- No ejecutes acciones destructivas sobre Git, despliegues o bases de datos sin autorización explícita.
- No corrijas vulnerabilidades ajenas al alcance salvo que bloqueen la validación.
- Mantén compatibilidad con las APIs existentes y explica cualquier cambio de contrato.
- Para recomendaciones de librerías, usa las dependencias ya presentes cuando sean adecuadas; instala una nueva solo si resuelve una necesidad real y deja constancia de la validación.
