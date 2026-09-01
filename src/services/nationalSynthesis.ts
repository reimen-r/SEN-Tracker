import { ExecutiveSummary, RecoveryAnalysis, RecoveryType, StateAnalysisResult } from '../types';
import { formatVET } from '../utils/time';

export interface NationalReportParts {
  executiveSummary: ExecutiveSummary;
  recoveryAnalysis: RecoveryAnalysis;
  alertRecommendation: string;
}

export function synthesizeNationalReport(
  stateResults: StateAnalysisResult[]
): NationalReportParts {
  const totalAnalyzed = stateResults.length;
  const affected = stateResults.filter((s) => s.severity !== 'NORMALIDAD');
  const generalBlackoutCount = affected.filter((s) => s.severity === 'APAGON_GENERAL').length;
  const criticalCount = affected.filter((s) => s.severity === 'CRITICO').length;
  const overallAffectedCount = affected.length;

  const avgDrop =
    affected.length > 0
      ? Math.round((affected.reduce((sum, s) => sum + s.dropPercentage, 0) / affected.length) * 10) / 10
      : 0;

  const earliestOnsetTs = affected.reduce<number | null>((earliest, s) => {
    if (s.anomalyStartTimestamp === undefined) return earliest;
    return earliest === null || s.anomalyStartTimestamp < earliest ? s.anomalyStartTimestamp : earliest;
  }, null);
  const estimatedOnsetVET = earliestOnsetTs ? formatVET(earliestOnsetTs) : 'No detectada / N/A';

  let generalStatus = 'Operación Normal del SEN a nivel nacional.';
  let primaryHypothesis =
    'El Sistema Eléctrico Nacional opera con parámetros y fluctuaciones dentro de la norma estadística.';

  if (generalBlackoutCount >= 10) {
    generalStatus = `COLAPSO GENERALIZADO DEL SEN: Emergencia Eléctrica Nacional que afecta a ${overallAffectedCount} de ${totalAnalyzed} entidades federales.`;
    primaryHypothesis =
      'Disparo catastrófico en el Troncal de 765kV (Guri - San Gerónimo - La Arenosa) o colapso por desbalance de frecuencia en la Casa de Máquinas de Central Hidroeléctrica Simón Bolívar (Guri).';
  } else if (criticalCount + generalBlackoutCount >= 4) {
    generalStatus = `EVENTO REGIONAL SEVERO: Interrupción crítica en ${overallAffectedCount} entidades federales del SEN.`;
    primaryHypothesis = 'Apertura de enlaces troncales de 400kV/230kV o caída en nodo de interconexión regional.';
  } else if (overallAffectedCount >= 1) {
    generalStatus = `INCIDENCIA SECTORIAL LOCALIZADA: Falla puntual en ${overallAffectedCount} estado(s).`;
    primaryHypothesis = 'Falla de subestación de distribución local o contingencia climatológica/mecánica sectorial.';
  }

  // Análisis de recuperación nacional.
  let overallRecoveryType: RecoveryType = 'SIN_RECUPERACION';
  let restoredCount = 0;
  let pendingCount = 0;

  for (const st of affected) {
    if (st.recoveryType === 'REBOTE_RAPIDO' || st.recoveryType === 'RECUPERACION_LENTA_ESCALONADA') {
      restoredCount++;
    } else {
      pendingCount++;
    }
  }

  let recoverySpeedSummary = 'Sin eventos de recuperación activos en el conjunto analizado.';
  let technicalInterpretation = 'Las métricas se mantienen en umbrales estables de conectividad.';

  if (overallAffectedCount > 0) {
    const rapidBounces = stateResults.filter((s) => s.recoveryType === 'REBOTE_RAPIDO').length;
    const slowRecoveries = stateResults.filter(
      (s) => s.recoveryType === 'RECUPERACION_LENTA_ESCALONADA'
    ).length;

    if (slowRecoveries > rapidBounces && slowRecoveries > 0) {
      overallRecoveryType = 'RECUPERACION_LENTA_ESCALONADA';
      recoverySpeedSummary = `Recuperación lenta y escalonada observada en ${restoredCount} entidades.`;
      technicalInterpretation =
        'El patrón de restitución paulatino y escalonado es característico del proceso de arranque en negro (black start), sincronización paulatina de unidades de generación en Guri/Caruachi y energización progresiva de las líneas de transmisión troncales de 765kV/400kV para evitar sobretensiones transitorias.';
    } else if (rapidBounces > 0) {
      overallRecoveryType = 'REBOTE_RAPIDO';
      recoverySpeedSummary = `Rebote rápido de conectividad en ${restoredCount} entidades.`;
      technicalInterpretation =
        'La restitución casi instantánea de las señales telemétricas indica una falla de distribución local o reconexión exitosa de protecciones en subestaciones secundarias, sin desprendimiento masivo de carga troncal.';
    } else {
      overallRecoveryType = 'SIN_RECUPERACION';
      recoverySpeedSummary = 'Servicio eléctrico no restablecido durante la ventana de tiempo analizada.';
      technicalInterpretation =
        'Las métricas de Active Probing y Darknet Telescope continúan deprimidas. La infraestructura de telecomunicaciones permanece operando bajo bancos de baterías o completamente apagada.';
    }
  }

  // Alerta y recomendaciones.
  let alertRecommendation = '';
  if (generalBlackoutCount >= 10) {
    alertRecommendation = `ALERTA ROJA - COLAPSO DEL SEN: Se confirma un colapso eléctrico masivo en ${generalBlackoutCount} estados con drops superiores al 80%. Se recomienda a la población activar protocolos de contingencia energética (racionamiento de baterías, protección de electrodomésticos y reserva de agua potable) y a los centros hospitalarios verificar la autonomía de sus plantas termoeléctricas de respaldo. Monitoreo continuo a través de repetidoras de radio y enlaces satelitales.`;
  } else if (criticalCount + generalBlackoutCount >= 4) {
    alertRecommendation = `ALERTA NARANJA - AFECTACIÓN REGIONAL DEL SEN: Evento crítico en curso que impacta ${overallAffectedCount} estados. Posible desbalance de voltaje en el sistema interconectado. Se sugiere desconectar equipos de alta demanda y mantenerse atento a los reportes de reconexión de subestaciones troncales.`;
  } else if (overallAffectedCount >= 1) {
    alertRecommendation = `ALERTA AMARILLA - CORTE SECTORIAL: Falla puntual en ${overallAffectedCount} entidad(es). Monitoreo comunitario activado para verificar si la anomalía se extiende a circuitos vecinos.`;
  } else {
    alertRecommendation = `ESTADO VERDE - CONDICIÓN NOMINAL: El SEN y la infraestructura de telecomunicaciones operan dentro de los rangos de normalidad esperados. No se detectan perturbaciones de red mayores en el territorio nacional.`;
  }

  const executiveSummary: ExecutiveSummary = {
    generalStatus,
    affectedStatesCount: overallAffectedCount,
    criticalStatesCount: criticalCount,
    generalBlackoutStatesCount: generalBlackoutCount,
    totalStatesAnalyzed: totalAnalyzed,
    estimatedOnsetVET,
    nationalConnectivityDropPct: avgDrop,
    primaryHypothesis,
  };

  const recoveryAnalysis: RecoveryAnalysis = {
    recoverySpeedSummary,
    recoveryType: overallRecoveryType,
    restoredStatesCount: restoredCount,
    pendingStatesCount: pendingCount,
    technicalInterpretation,
  };

  return { executiveSummary, recoveryAnalysis, alertRecommendation };
}