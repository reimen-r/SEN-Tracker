# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Analistas y operadores de red que vigilan el Sistema Eléctrico Nacional (SEN) de Venezuela. Trabujan en sala de control, sobre una pantalla fija, en turnos: la escena de uso exige escaneabilidad rápida y densidad de información, no una experiencia de marketing. Su trabajo no es "mirar un tablero": es decidir si un evento que merece escalamiento, sostener esa decisión con evidencia, y en ocasiones emitir un parte que salga del círculo técnico.

Audiencia secundaria: la comunidad destinataria del aviso. No consume la aplicación — consume el texto que el analista produce y difunde por Telegram y WhatsApp.

## Product Purpose

Inferir apagones del SEN a partir de telemetría de internet. La aplicación correlaciona tres fuentes públicas de IODA (Georgia Tech) — Active Probing (`ping-slash24`), Darknet Telescope (`merit-nt`, `ucsd-nt`) y BGP — y las convierte en un juicio por estado sobre la red eléctrica.

Éxito significa que el analista puede responder, en segundos, tres preguntas: qué está pasando ahora, desde qué hora, y con qué confianza. Y que puede llevar ese juicio afuera como un reporte firme en lugar de una especulación.

## Positioning

El mecanismo: la aplicación no mide electricidad. Mide reachability de internet e infiere la pérdida de energía por la simultaneidad abrupta del drop. Eso la distingue de un tablero de telemedición eléctrica y de un monitor genérico de uptime — ninguna de las dos cosas tiene un Active Probing que se apague cuando se va la luz.

Su Advantage defendible es la disciplina de falsos positivos: filtro circadiano (01:00–06:00 VET no se confunde con una falla), filtro de ISP aislado (exige estabilidad en BGP y probing), y umbrales explícitos y publicados. Un detector de outages que no falla por ruido es más difícil de copiar que uno que alarma bien.

## Operating Context

- **Sala de control, turnos largos.** De ahí el tema oscuro, la densidad alta y el mínimo de movimiento.
- **Vigilancia activa.** El modo de sondeo automático consulta IODA cada 1, 5 o 15 minutos y notifica sólo cuando un estado **cruza** un umbral de severidad — no en cada poll.
- **Difusión.** El mismo renderer produce el markdown estructurado y el mensaje corto para Telegram/WhatsApp. El formato de comunidad no es una función secundaria: es el producto saliendo del círculo técnico.
- **Impresión / PDF.** El reporte se imprime en fondo claro para tinta. Es un flujo real, no un accidente.
- **Exportes.** CSV por estado, JSON completo, markdown descargable.
- **Sesión persistente.** El escenario y la vista se restauran desde `localStorage`; el analista vuelve a donde estaba.

## Capabilities and Constraints

**Capacidades confirmadas**

- 24 entidades federales de Venezuela más el agregado nacional, con mapa SVG y drilldown por estado.
- Clasificación de severidad en cuatro niveles: `NORMALIDAD` (<25%), `MODERADO` (25–50%), `CRITICO` (51–80%), `APAGON_GENERAL` (>80%).
- Cuatro tipos de recuperación: `REBOTE_RAPIDO`, `RECUPERACION_LENTA_ESCALONADA`, `EN_CURSO`, `SIN_RECUPERACION`.
- Estimación de onset en VET, con índice de caída y ventana de recuperación.
- Telemetría en vivo vía proxy propio (`POST /api/ioda/query`) con whitelist de entityCode, timeout de 15s, caché TTL de 5 min y deduplicación en vuelo.
- Presets de incidentes sintéticos para demostrar los escenarios sin red.
- Análisis asistido por IA (Gemini, server-side) sobre el reporte.
- Analista IA degradado con mensaje de fallback cuando no hay `GEMINI_API_KEY`.

**Restricciones técnicas duraderas**

- Gráficos son SVG hecho a mano (`TelemetryChart.tsx`, `VenezuelaMap.tsx`). Recharts se eliminó por tamaño y no debe volver.
- Tailwind v4 con `@import "tailwindcss"` y plugin `@tailwindcss/vite`. **No existe** `tailwind.config.js`.
- Express 5 / path-to-regexp v8: el fallback SPA es `app.use(...)`, nunca `app.get('*')`.
- Toda la aritmética VET (UTC-4) vive exclusivamente en `src/utils/time.ts`. Ya hubo tres copias de ese bug; no hay una cuarta.
- Impresión controlada por `@media print` en `index.css`.
- TypeScript fijado en `~5.9` (typescript-eslint requiere `<6.1.0`).

**Hechos de producto deliberadamente abiertos**

- El pie de página muestra `ESTACIÓN_ID: CCS-TR-09`. No está verificado si identifica una estación real, una estación de demostración o un marcador de posición. **No debe presentarse como hecho confirmado** hasta que alguien lo confirme.
- Los presets de incidentes son datos sintéticos y deben seguir etiquetados como tales.

## Brand Commitments

- Nombre: **SEN Venezuela IODA Outage Monitor**. Visible en `index.html` y en el header (`SEN MONITOR // IODA INFRASTRUCTURE`).
- Idioma: **español**, sin excepciones. Toda la copy, nombres de campo, estados y mensajes de error están en español.
- Registro: operacional e institucional, con etiquetas en mayúsculas y monoespaciada. Confianza por precisión, nunca por alarma.
- La honestidad por encima del lucimiento: el método es visible y explicable para cualquiera que mire. La sección de metodología es parte del producto, no documentación oculta.

## Evidence on Hand

- **Datos reales:** telemetría viva de IODA (Georgia Tech) a través del proxy propio. Fuente verificable.
- **Datos sintéticos:** los presets de incidentes en `src/data/venezuelaGrid.ts`, generados por `syntheticTelemetry.ts`. Marcados como escenarios; no deben presentarse como observaciones reales.
- **Ausencias que el trabajo futuro no debe fabricar:** sin testimonios, sin clientes, sin benchmarks, sin precios, sin estadísticas de cobertura verificables más allá de lo que el propio análisis produce. No hay casos de estudio ni prensa.
- La atribución a IODA / Georgia Tech es real y debe permanecer visible.

## Product Principles

1. **La evidencia antes que la conclusión.** Cada juicio viene con su umbral y su ventana temporal a la vista. Un analista tiene que poder explicar por qué la pantalla dice lo que dice.
2. **Los falsos positivos son el fracaso principal.** Un detector que alarma cuando no debe pierde la confianza del operador más rápido que uno que falla en detectar. La calma es una virtud, no una carencia.
3. **El nivel de alerta es el producto.** La respuesta por severidad define todo lo demás — color, posición, sonido, notificación. La clasificación es el output; la interfaz es su presentación.
4. **Densidad con jerarquía.** Un operador de sala de control necesita mucha información en poco espacio, pero la que decide tiene que ganar siempre. Explicar es de más; encontrar no.
5. **La salida importa tanto como la entrada.** Si el analista no puede llevar el juicio afuera en un formato que la comunidad entienda, el análisis no sirvió.

## Accessibility & Inclusion

Objetivo: **WCAG 2.2 AA**. Contraste mínimo 4.5:1 en texto de cuerpo y 3:1 en texto grande. Navegación por teclado completa con foco visible en cada control operable, incluido el interior de los modales. El foco nunca debe quedar oculto detrás del header `sticky` (`scroll-padding-top`).

Este objetivo lo impone el trabajo de refinado de diseño 2026-10, no una declaración previa del cliente: la auditoría encontró cero `focus-visible`, cero `aria-label`, filas de tabla no alcanzables por teclado y controles del header por debajo del mínimo táctil. Es un compromiso de este documento, no un hecho histórico del producto.