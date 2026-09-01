# CONTEXT.md — Glosario del dominio SEN-IODA

Términos de dominio que dan nombre a los módulos del sistema. Si un futuro
cambio renombra un módulo, actualiza este glosario en el mismo commit.

## Dominio eléctrico venezolano (SEN)

- **SEN** — Servicio Eléctrico Nacional de Venezuela (CORPOELEC / CENACE).
- **Entidad federal** — uno de los 24 estados venezolanos (ISO 3166-2:VE), cada
  uno con su topología eléctrica (subestaciones críticas y líneas troncales).
  Vive en `src/data/entityRegistry.ts`.
- **Telemetría IODA** — series de conectividad de Georgia Tech: `activeProbing`
  (ping /24s), `darknetTelescope` (merit-nt / ucsd-nt), `bgpPrefixes`. Se
  normalizan a un índice 0–100.
- **Drop / Caída de conectividad** — descenso del índice compuesto respecto a la
  línea base (percentil 75). Determina la severidad.
- **Severidad** — `NORMALIDAD` (<25%), `MODERADO` (25-50%), `CRITICO` (51-80%),
  `APAGON_GENERAL` (>80%).
- **Restitución / Recuperación** — `REBOTE_RAPIDO`, `RECUPERACION_LENTA_ESCALONADA`,
  `EN_CURSO`, `SIN_RECUPERACION`.
- **Falsos positivos filtrados** — variación circadiana nocturna (madrugada con
  drop <40%) y anomalía aislada de un solo ISP.

## Módulos del motor de análisis (profundizados)

- **Clasificador de estados** (`stateClassifier.ts`) — infiere el estado de cada
  entidad a partir de su dataset. Todos los umbrales y reglas viven aquí, detrás
  de la interfaz `classifyState(dataset) → StateAnalysisResult`.
- **Síntesis nacional** (`nationalSynthesis.ts`) — agrega los resultados por
  estado en el resumen ejecutivo, análisis de recuperación y alerta.
- **Renderizador de prosa** (`proseRenderer.ts`) — produce markdown y texto de
  difusión (Telegram/WhatsApp) desde una sola interfaz. Toda la prosa del
  reporte sale de aquí.

## Capa de datos sintéticos

- **Fábrica de escenarios** (`syntheticTelemetry.ts`) — único generador de
  telemetría. Interfaz `generateScenario(profile) → IodaStateDataset[]`. Un
  perfil declara la línea de tiempo, la perturbación por ventanas y la curva de
  recuperación; los presets y el generador del modal son adaptadores delgados.
- **Presets** (`venezuelaGrid.ts`) — escenarios históricos SEN como perfiles
  estáticos consumidos por `INCIDENT_PRESETS`.

## Vigilancia en vivo

- **Escalador de vigilancia** (`vigilance.ts`) — funciones puras: el ranking de
  severidad, `seedSeverityMap(report)` (evita la falsa alarma en el primer poll)
  y `detectEscalations(prev, report)`. También expone `fetchNationalTelemetry`
  con fetch por lotes inyectable. `App.tsx` queda como shell delgado que solo
  orquesta el polling y las notificaciones.