<div align="center">

# SEN MONITOR // IODA INFRASTRUCTURE

**Monitoreo del Servicio Eléctrico Nacional (SEN) de Venezuela a partir de la telemetría de IODA (Georgia Tech / CAIDA)**

Detecta, clasifica y reporta apagones eléctricos en las 24 entidades federales venezolanas cruzando
*Active Probing*, *Darknet Telescope* y prefijos *BGP*. Interfaz en español, análisis automático por
umbrales y respaldo de IA con Gemini.

</div>

---

## Qué hace

- **Mapa nacional** de las 24 entidades federales con severidad por estado (Normalidad / Moderado / Crítico / Apagón General).
- **Telemetría en vivo** de IODA (últimas 24 h) vía proxy propio que evita CORS y cachea 5 min.
- **Motor de inferencia**: línea base, inicio de anomalía, dinámica de recuperación y filtros de falsos positivos (variación nocturna circadiana y fallas aisladas de un solo ISP).
- **Reporte estructurado** con resumen ejecutivo, clasificación por estado, análisis de restitución y alerta comunitaria — exportable a **Markdown, JSON, CSV** e **imprimir/PDF**.
- **Analista IA (Gemini)**: consultas técnicas sobre la topología del SEN con el contexto del reporte.
- **Modo Vigilancia**: polling automático cada 1/5/15 min con alertas de *escalada de severidad* (banner + notificación del sistema).
- **Generador de escenarios sintéticos** para probar las reglas de inferencia.

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 19, Vite 8, TypeScript ~5.9, Tailwind CSS v4 |
| Backend | Express 5 (proxy IODA + API Gemini), TypeScript |
| IA | Google Gemini (`@google/genai`) — análisis server-side |
| Charts | SVG a mano (sin librería de charts) |

## Arquitectura

```
server/
  app.ts            → Express: body limits por ruta, logging, health, SPA fallback
  iodaProxy.ts      → POST /api/ioda/query: whitelist de entidades, cache TTL + dedupe
  gemini.ts         → POST /api/analyze-gemini: prompt del SEN, rate-limit 10 req/min/IP
  rateLimit.ts / cache.ts / config.ts
src/
  data/entityRegistry.ts     → 24 entidades federales + topología eléctrica (compartido con el servidor)
  data/syntheticTelemetry.ts → única fábrica de telemetría sintética (generateScenario)
  data/venezuelaGrid.ts      → presets de incidentes SEN como perfiles estáticos
  services/analyzer.ts       → facade: analyzeIodaDatasets(datasets) → OutageReport
  services/stateClassifier.ts   → inferencia por estado (umbrales y filtros)
  services/nationalSynthesis.ts → resumen ejecutivo, recuperación, alerta
  services/proseRenderer.ts     → markdown + texto de difusión (Telegram/WhatsApp)
  services/vigilance.ts         → escalador de vigilancia (ranking + seeding + fetch por lotes)
  services/iodaApi.ts           → parser del formato v2 de IODA + normalización 0–100
```

## Requisitos

- **Node.js** ≥ 20 (para el proxy server-side con `fetch` y `AbortSignal.timeout`).

## Puesta en marcha

```bash
npm install
```

Crea un archivo `.env` en la raíz (la app funciona sin `GEMINI_API_KEY`; el modal IA muestra un aviso de respaldo):

```env
# Opcional: clave para el analista IA
GEMINI_API_KEY=tu_clave_de_gemini
# Opcional: URL pública de la app (para logs/referencias)
APP_URL=http://localhost:3000
# Desactivar solo en dev local directo (sin proxy/LB)
TRUST_PROXY=false
```

Arranque en desarrollo (tsx + Vite HMR):

```bash
npm run dev
# → http://0.0.0.0:3000
```

## Scripts

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo (tsx `server.ts` + Vite HMR) en `0.0.0.0:3000` |
| `npm run lint` | Gate: `tsc --noEmit && eslint .` (debe quedar verde) |
| `npm run lint:tsc` / `npm run lint:eslint` | Typecheck y ESLint por separado |
| `npm run test` | Vitest (una vez); tests colocalizados `*.test.ts` |
| `npm run build` | `vite build` + esbuild `server.ts` → `dist/server.cjs` |
| `npm run start` | Servidor de producción (**requiere `NODE_ENV=production`**) |
| `npm run clean` | Elimina `dist/` |

## Metodología de inferencia

- **Fuentes IODA**: `ping-slash24` (Active Probing), `merit-nt` / `ucsd-nt` (Darknet Telescope), `bgp` (visibilidad de prefijos). Se normalizan a un índice 0–100.
- **Severidad** por caída del índice compuesto respecto a la línea base (percentil 75):
  - `NORMALIDAD` < 25 %
  - `MODERADO` 25–50 %
  - `CRITICO` 51–80 %
  - `APAGON_GENERAL` > 80 %
- **Falsos positivos filtrados**: variaciones de madrugada (01:00–06:00 VET con drop < 40 %) y caídas aisladas de un solo ISP sin correlación Darknet/BGP.

## Limitaciones y aviso

- Es una **herramienta de monitoreo experimental e informativa**, no un sistema de gestión de emergencias.
- Los datos provienen de la telemetría de **IODA (Internet Outage Detection and Analysis, Georgia Tech / CAIDA)**; la correlación con el SEN es inferencial.
- Los presets son escenarios modelados; los umbrales pueden requerir calibración con datos reales.

## Licencia

Uso libre para monitoreo comunitario e investigación. Los datos y marcas de Georgia Tech / IODA y CORPOELEC pertenecen a sus respectivos dueños.