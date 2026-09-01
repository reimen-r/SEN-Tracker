import {
  IodaStateDataset,
  OutageReport,
  OutageSeverity,
  RecoveryType,
  StateAnalysisResult,
  TimeSeriesPoint,
} from '../types';
import { VENEZUELA_ENTITIES } from '../data/venezuelaGrid';
import { formatVET, getVETHourDecimal } from '../utils/time';

export { formatVET }; // Re-export para compatibilidad con imports/tests existentes

export function analyzeIodaDatasets(datasets: IodaStateDataset[]): OutageReport {
  const stateResults: StateAnalysisResult[] = [];
  let earliestOnsetTs: number | null = null;
  let overallAffectedCount = 0;
  let criticalCount = 0;
  let generalBlackoutCount = 0;
  let totalDropSum = 0;

  for (const ds of datasets) {
    const entity = VENEZUELA_ENTITIES.find((e) => e.id === ds.entityId || e.name.toLowerCase() === ds.entityName.toLowerCase()) || {
      id: ds.entityId,
      name: ds.entityName,
      code: ds.entityId.replace('VE-', '').slice(0, 3).toUpperCase(),
      region: 'Central',
      capital: ds.entityName,
      populationEstimate: 1000000,
      criticalSubstations: ['Subestación Principal'],
      keyTransmissionLines: ['Troncal SEN'],
      coordinates: { x: 50, y: 50, lat: 10, lng: -66 },
    };

    // Construct synchronized time series
    const apList = ds.signals.activeProbing || [];
    const darknetList = ds.signals.darknetTelescope || [];
    const bgpList = ds.signals.bgpPrefixes || [];

    const timeSeries: TimeSeriesPoint[] = [];
    const count = apList.length;

    for (let i = 0; i < count; i++) {
      const ts = apList[i][0];
      const ap = apList[i][1];
      const darknet = darknetList[i] ? darknetList[i][1] : ap;
      const bgp = bgpList[i] ? bgpList[i][1] : 100;

      // Composite connectivity score giving weight to Active Probing & Darknet Telescope
      const composite = ap * 0.55 + darknet * 0.35 + bgp * 0.1;

      timeSeries.push({
        timestamp: ts,
        vetTime: formatVET(ts),
        activeProbing: ap,
        darknetTelescope: darknet,
        bgpPrefixes: bgp,
        compositeScore: Math.round(composite * 10) / 10,
      });
    }

    // Baseline calculation (pre-drop average or top 80th percentile)
    const sortedScores = [...timeSeries.map((p) => p.compositeScore)].sort((a, b) => a - b);
    const baseline = sortedScores.length > 0 ? sortedScores[Math.floor(sortedScores.length * 0.75)] : 100;
    const minScorePoint = timeSeries.reduce(
      (min, p) => (p.compositeScore < min.compositeScore ? p : min),
      timeSeries[0] || { timestamp: 0, compositeScore: 100 }
    );

    const minScore = minScorePoint ? minScorePoint.compositeScore : 100;
    const dropPercentage = Math.max(0, Math.round(((baseline - minScore) / (baseline || 1)) * 1000) / 10);

    // Identify anomaly onset point (first point dropping >15% below baseline)
    let anomalyStartTs: number | undefined = undefined;
    let anomalyStartVET: string | undefined = undefined;
    let recoveryTs: number | undefined = undefined;
    let recoveryVET: string | undefined = undefined;

    let minIndex = 0;
    for (let i = 0; i < timeSeries.length; i++) {
      if (timeSeries[i].compositeScore === minScore) {
        minIndex = i;
        break;
      }
    }

    for (let i = 0; i < timeSeries.length; i++) {
      const dropFromBase = ((baseline - timeSeries[i].compositeScore) / baseline) * 100;
      if (dropFromBase >= 20 && !anomalyStartTs) {
        anomalyStartTs = timeSeries[i].timestamp;
        anomalyStartVET = timeSeries[i].vetTime;
        break;
      }
    }

    // Check for recovery after minimum
    let isRecovered = false;
    let recoveryRatePerHour = 0;
    if (minIndex < timeSeries.length - 1) {
      const lastPoint = timeSeries[timeSeries.length - 1];
      const recoveryDelta = lastPoint.compositeScore - minScore;
      const recoveryPct = (recoveryDelta / (baseline - minScore || 1)) * 100;

      if (recoveryPct >= 50) {
        isRecovered = true;
        // Find exact point crossing 60% recovery
        for (let i = minIndex; i < timeSeries.length; i++) {
          if (timeSeries[i].compositeScore >= minScore + (baseline - minScore) * 0.6) {
            recoveryTs = timeSeries[i].timestamp;
            recoveryVET = timeSeries[i].vetTime;
            break;
          }
        }
        const hoursFromMin = (lastPoint.timestamp - minScorePoint.timestamp) / 3600;
        recoveryRatePerHour = hoursFromMin > 0 ? recoveryPct / hoursFromMin : 100;
      }
    }

    // Recovery classification
    let recoveryType: RecoveryType = 'SIN_RECUPERACION';
    if (isRecovered) {
      if (recoveryRatePerHour >= 45) {
        // Fast snapback (distribution level or auto-reclose)
        recoveryType = 'REBOTE_RAPIDO';
      } else {
        // Slow stepped recovery (transmission energization / turbine spinup)
        recoveryType = 'RECUPERACION_LENTA_ESCALONADA';
      }
    } else if (dropPercentage >= 25 && minIndex < timeSeries.length - 3) {
      const lastScore = timeSeries[timeSeries.length - 1].compositeScore;
      if (lastScore > minScore + 5) {
        recoveryType = 'EN_CURSO';
      }
    }

    // --- APPLY RESTRICTIONS ---
    // Restriction 1: Nighttime / Madrugada variation check (01:00 to 06:00 VET)
    let isNighttimeFalsePositive = false;
    if (anomalyStartTs) {
      const hourVET = getVETHourDecimal(anomalyStartTs);
      if (hourVET >= 1.0 && hourVET <= 6.0) {
        // "No confundas variaciones de la madrugada con fallas eléctricas reales, a menos que el drop sea superior al 40% instantáneo."
        if (dropPercentage < 40) {
          isNighttimeFalsePositive = true;
        }
      }
    }

    // Restriction 2: Single ISP isolated anomaly
    // If Active Probing dropped moderately but Darknet Telescope and BGP remain flat (difference > 25%)
    let isSingleIspIsolated = false;
    if (dropPercentage < 35 && minIndex >= 0 && minIndex < timeSeries.length) {
      const apDrop = ((100 - timeSeries[minIndex].activeProbing) / 100) * 100;
      const darknetDrop = ((100 - timeSeries[minIndex].darknetTelescope) / 100) * 100;
      const bgpDrop = ((100 - timeSeries[minIndex].bgpPrefixes) / 100) * 100;
      if (apDrop >= 20 && darknetDrop < 8 && bgpDrop < 3) {
        isSingleIspIsolated = true;
      }
    }

    // Determine final severity and interpretation based on exact methodology
    let severity: OutageSeverity = 'NORMALIDAD';
    let interpretation = 'Servicio eléctrico y conectividad telemétrica estables.';

    if (isNighttimeFalsePositive) {
      severity = 'NORMALIDAD';
      interpretation = 'Variación circadiana nocturna normal (patrón de sueño / reposo de routers residenciales). No constituye evento del SEN.';
    } else if (isSingleIspIsolated) {
      severity = 'NORMALIDAD';
      interpretation = 'Falla aislada de enlaces de telecomunicaciones / un solo ISP. Descartada afectación en infraestructura del SEN.';
    } else {
      if (dropPercentage >= 80.0) {
        severity = 'APAGON_GENERAL';
        interpretation = `Apagón general / Colapso de subestación troncal (${entity.criticalSubstations[0] || 'Nodo Regional'}). Pérdida masiva de alimentación en repetidoras y nodos de acceso.`;
        generalBlackoutCount++;
        overallAffectedCount++;
        totalDropSum += dropPercentage;
      } else if (dropPercentage >= 51.0) {
        severity = 'CRITICO';
        interpretation = `Evento Crítico (Apagón Estatal / Parcial). Afectación severa en líneas de transmisión ${entity.keyTransmissionLines[0] || 'de alta tensión'} y salida de circuitos primarios.`;
        criticalCount++;
        overallAffectedCount++;
        totalDropSum += dropPercentage;
      } else if (dropPercentage >= 25.0) {
        severity = 'MODERADO';
        interpretation = `Evento Moderado (Corte Sectorial / Falla Local). Apertura de circuitos de distribución o disparo selectivo en ${entity.criticalSubstations[0] || 'distribución municipal'}.`;
        overallAffectedCount++;
        totalDropSum += dropPercentage;
      } else {
        severity = 'NORMALIDAD';
        interpretation = 'Variación semanal estándar (90% - 100% de conectividad esperada). Operación normal del SEN.';
      }
    }

    if (severity !== 'NORMALIDAD' && anomalyStartTs) {
      if (!earliestOnsetTs || anomalyStartTs < earliestOnsetTs) {
        earliestOnsetTs = anomalyStartTs;
      }
    }

    stateResults.push({
      entity,
      baselineScore: Math.round(baseline),
      minimumScore: Math.round(minScore),
      currentScore: timeSeries[timeSeries.length - 1]?.compositeScore || 100,
      dropPercentage,
      severity,
      interpretation,
      anomalyStartTimestamp: anomalyStartTs,
      anomalyStartVET,
      recoveryTimestamp: recoveryTs,
      recoveryVET,
      recoveryType,
      timeSeries,
      isNighttimeFalsePositiveFiltered: isNighttimeFalsePositive,
      isSingleIspIsolatedAnomaly: isSingleIspIsolated,
    });
  }

  // Sort results by drop percentage descending
  stateResults.sort((a, b) => b.dropPercentage - a.dropPercentage);

  // General Country / Region summary synthesis
  const totalAnalyzed = stateResults.length;
  const avgDrop = overallAffectedCount > 0 ? Math.round((totalDropSum / overallAffectedCount) * 10) / 10 : 0;
  const estimatedOnsetVET = earliestOnsetTs ? formatVET(earliestOnsetTs) : 'No detectada / N/A';

  let generalStatus = 'Operación Normal del SEN a nivel nacional.';
  let primaryHypothesis = 'El Sistema Eléctrico Nacional opera con parámetros y fluctuaciones dentro de la norma estadística.';

  if (generalBlackoutCount >= 10) {
    generalStatus = `COLAPSO GENERALIZADO DEL SEN: Emergencia Eléctrica Nacional que afecta a ${overallAffectedCount} de ${totalAnalyzed} entidades federales.`;
    primaryHypothesis = 'Disparo catastrófico en el Troncal de 765kV (Guri - San Gerónimo - La Arenosa) o colapso por desbalance de frecuencia en la Casa de Máquinas de Central Hidroeléctrica Simón Bolívar (Guri).';
  } else if (criticalCount + generalBlackoutCount >= 4) {
    generalStatus = `EVENTO REGIONAL SEVERO: Interrupción crítica en ${overallAffectedCount} entidades federales del SEN.`;
    primaryHypothesis = 'Apertura de enlaces troncales de 400kV/230kV o caída en nodo de interconexión regional.';
  } else if (overallAffectedCount >= 1) {
    generalStatus = `INCIDENCIA SECTORIAL LOCALIZADA: Falla puntual en ${overallAffectedCount} estado(s).`;
    primaryHypothesis = 'Falla de subestación de distribución local o contingencia climatológica/mecánica sectorial.';
  }

  // Recovery analysis synthesis
  let overallRecoveryType: RecoveryType = 'SIN_RECUPERACION';
  let restoredCount = 0;
  let pendingCount = 0;

  for (const st of stateResults) {
    if (st.severity !== 'NORMALIDAD') {
      if (st.recoveryType === 'REBOTE_RAPIDO' || st.recoveryType === 'RECUPERACION_LENTA_ESCALONADA') {
        restoredCount++;
      } else {
        pendingCount++;
      }
    }
  }

  let recoverySpeedSummary = 'Sin eventos de recuperación activos en el conjunto analizado.';
  let technicalInterpretation = 'Las métricas se mantienen en umbrales estables de conectividad.';

  if (overallAffectedCount > 0) {
    const rapidBounces = stateResults.filter((s) => s.recoveryType === 'REBOTE_RAPIDO').length;
    const slowRecoveries = stateResults.filter((s) => s.recoveryType === 'RECUPERACION_LENTA_ESCALONADA').length;

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

  // Alert and recommendations
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

  // Build the exact Structured Markdown output as requested in the prompt
  const timestampAnalyzed = Date.now();
  const executiveSummary: OutageReport['executiveSummary'] = {
    generalStatus,
    affectedStatesCount: overallAffectedCount,
    criticalStatesCount: criticalCount,
    generalBlackoutStatesCount: generalBlackoutCount,
    totalStatesAnalyzed: totalAnalyzed,
    estimatedOnsetVET,
    nationalConnectivityDropPct: avgDrop,
    primaryHypothesis,
  };
  const recoveryAnalysis: OutageReport['recoveryAnalysis'] = {
    recoverySpeedSummary,
    recoveryType: overallRecoveryType,
    restoredStatesCount: restoredCount,
    pendingStatesCount: pendingCount,
    technicalInterpretation,
  };

  const markdownText = generateMarkdownReport({
    timestampAnalyzed,
    executiveSummary,
    stateClassifications: stateResults,
    recoveryAnalysis,
    alertRecommendation,
  });

  return {
    timestampAnalyzed,
    executiveSummary,
    stateClassifications: stateResults,
    recoveryAnalysis,
    alertRecommendation,
    markdownText,
  };
}

function generateMarkdownReport(data: {
  timestampAnalyzed: number;
  executiveSummary: OutageReport['executiveSummary'];
  stateClassifications: StateAnalysisResult[];
  recoveryAnalysis: OutageReport['recoveryAnalysis'];
  alertRecommendation: string;
}): string {
  const { executiveSummary, stateClassifications, recoveryAnalysis, alertRecommendation } = data;

  let md = `## REPORTE TÉCNICO DE TELEMETRÍA IODA - SERVICIO ELÉCTRICO NACIONAL (SEN)\n\n`;

  // 1. Resumen Ejecutivo
  md += `### 1. Resumen Ejecutivo:\n`;
  md += `- **Estado general del país o región analizada:** ${executiveSummary.generalStatus}\n`;
  md += `- **Cantidad de estados afectados:** ${executiveSummary.affectedStatesCount} de ${executiveSummary.totalStatesAnalyzed} entidades federales (${executiveSummary.generalBlackoutStatesCount} con colapso total/general, ${executiveSummary.criticalStatesCount} con apagón estatal crítico).\n`;
  md += `- **Hora estimada de inicio de la anomalía:** ${executiveSummary.estimatedOnsetVET}\n`;
  if (executiveSummary.primaryHypothesis) {
    md += `- **Hipótesis del incidente SEN:** ${executiveSummary.primaryHypothesis}\n`;
  }
  md += `\n`;

  // 2. Clasificación por Estado
  md += `### 2. Clasificación por Estado:\n`;
  for (const item of stateClassifications) {
    const sevLabel =
      item.severity === 'APAGON_GENERAL'
        ? 'Apagón General / Colapso'
        : item.severity === 'CRITICO'
        ? 'Evento Crítico (Apagón Estatal)'
        : item.severity === 'MODERADO'
        ? 'Evento Moderado (Corte Sectorial)'
        : 'Normalidad';

    md += `- **[${item.entity.name}]**: ${item.dropPercentage}% de caída de conectividad | Nivel de Severidad: **${sevLabel}** | Interpretación: ${item.interpretation}\n`;
  }
  md += `\n`;

  // 3. Análisis de Recuperación
  md += `### 3. Análisis de Recuperación:\n`;
  md += `- **Velocidad de reconexión:** ${recoveryAnalysis.recoverySpeedSummary}\n`;
  md += `- **Evaluación de Dinámica de Red:** ${recoveryAnalysis.technicalInterpretation}\n`;
  md += `\n`;

  // 4. Alerta / Recomendación
  md += `### 4. Alerta / Recomendación:\n`;
  md += `${alertRecommendation}\n`;

  return md;
}
