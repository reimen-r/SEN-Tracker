# ADR-0001: El preset "Santa Teresa" restituye la señal a la base

- **Estado:** Aceptado
- **Fecha:** 2026-09-01
- **Contexto:** [candidato 2 de la revisión de arquitectura](https://github.com/reimen-r/SEN-Tracker)

## Contexto

Al unificar los dos generadores de telemetría sintética en la fábrica
`src/data/syntheticTelemetry.ts`, se transcribió el escenario
`preset-capital-substation` ("Evento Sectorial Subestación Santa Teresa") a un
perfil declarativo. Durante la transcripción se detectó que el generador
anterior (`generateIncidentTelemetry` en `venezuelaGrid.ts`) tenía un defecto:
la rama de "rebote rápido" multiplicaba el valor ya caído en lugar del valor
base, de modo que la señal quedaba deprimida permanentemente en el nivel del
drop (~38% para Miranda, ~28% para Distrito Capital) en lugar de restituirse.

El preset afirmaba en su metadato "rebote rápido en 45 minutos" y "retorno
rápido a las 11:30 VET", pero el clasificador reportaba `SIN_RECUPERACION` para
ambos estados porque la señal nunca volvía a la base.

## Decisión

El perfil `CAPITAL_LOCAL_PROFILE` usa una recuperación `FAST` que devuelve la
señal a la línea base en ~2 puntos (15-30 minutos), coherente con la descripción
del preset. La restitución ahora sí ocurre y el clasificador deja de reportar
`SIN_RECUPERACION`.

Se rechazó reproducir el defecto original "fielmente": el objetivo de la fábrica
es modelar escenarios, no preservar bugs del generador. Las revisiones futuras
no deben reintroducir la rama de recuperación que multiplica el valor caído.

## Consecuencias

- **Positivas:** el preset demuestra el comportamiento que describe; el contrato
  del escenario quedó fijado por test (`venezuelaGrid.test.ts`), incluyendo la
  aserción de que el último punto del compuesto supera 90.
- **Negativas:** nulas funcionales; el cambio no altera la interfaz pública de
  `analyzeIodaDatasets` ni el formato del reporte.
- **Observación de clasificación:** el clasificador etiqueta la restitución como
  `RECUPERACION_LENTA_ESCALONADA` (y no `REBOTE_RAPIDO`) porque su fórmula de
  tasa usa la distancia desde el mínimo hasta el **final** de la ventana; es un
  rasgo del propio `stateClassifier.ts`, no del generador, y no se tocó.