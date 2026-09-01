import {
  IodaStateDataset,
  OutageSeverity,
  RecoveryType,
  StateAnalysisResult,
  TimeSeriesPoint,
} from '../types';
import { VENEZUELA_ENTITIES } from '../data/entityRegistry';
import { formatVET, getVETHourDecimal } from '../utils/time';

// Umbrales de la metodología de inferencia SEN-IODA. Viven aquí, detrás de la
// interfaz del clasificador, para poder probarse en aislamiento.
const COMPOSITE_WEIGHTS = { activeProbing: 0.55, darknetTelescope: 0.35, bgp: 0.1 };
const BASELINE_PERCENTILE = 0.75;
const ANOMALY_DROP_PCT = 20; // primer punto con caída >=20% sobre la base
const RECOVERY_DETECT_PCT = 50; // recuperado si retorna >=50% de la caída
const RECOVERY_CROSS_PCT = 60; // punto que cruza el 60% de restitución
const FAST_RECOVERY_RATE_PER_HOUR = 45; // >=45%/h => rebote rápido
const NIGHT_FALSE_POSITIVE_MAX_DROP = 40; // madrugada con drop <40% => falso positivo
const NIGHT_FALSE_POSITIVE_RANGE = { from: 1.0, to: 6.0 }; // 01:00-06:00 VET
const ISP_FALSE_POSITIVE_MAX_DROP = 35;
const ISP_AP_MIN_DROP = 20; // Active Probing cae >=20%
const ISP_DARKNET_MAX_DROP = 8; // mientras Darknet cae <8%
const ISP_BGP_MAX_DROP = 3; // y BGP cae <3%
const SEVERITY_APAGON_GENERAL = 80.0;
const SEVERITY_CRITICO = 51.0;
const SEVERITY_MODERADO = 25.0;

function resolveEntity(ds: IodaStateDataset) {
  return (
    VENEZUELA_ENTITIES.find(
      (e) => e.id === ds.entityId || e.name.toLowerCase() === ds.entityName.toLowerCase()
    ) || {
      id: ds.entityId,
      name: ds.entityName,
      code: ds.entityId.replace('VE-', '').slice(0, 3).toUpperCase(),
      region: 'Central' as const,
      capital: ds.entityName,
      populationEstimate: 1000000,
      criticalSubstations: ['Subestación Principal'],
      keyTransmissionLines: ['Troncal SEN'],
      coordinates: { x: 50, y: 50, lat: 10, lng: -66 },
    }
  );
}

function buildTimeSeries(ds: IodaStateDataset): TimeSeriesPoint[] {
  const apList = ds.signals.activeProbing || [];
  const darknetList = ds.signals.darknetTelescope || [];
  const bgpList = ds.signals.bgpPrefixes || [];

  const timeSeries: TimeSeriesPoint[] = [];
  for (let i = 0; i < apList.length; i++) {
    const ts = apList[i][0];
    const ap = apList[i][1];
    const darknet = darknetList[i] ? darknetList[i][1] : ap;
    const bgp = bgpList[i] ? bgpList[i][1] : 100;

    // Índice compuesto que pondera Active Probing y Darknet Telescope.
    const composite =
      ap * COMPOSITE_WEIGHTS.activeProbing +
      darknet * COMPOSITE_WEIGHTS.darknetTelescope +
      bgp * COMPOSITE_WEIGHTS.bgp;

    timeSeries.push({
      timestamp: ts,
      vetTime: formatVET(ts),
      activeProbing: ap,
      darknetTelescope: darknet,
      bgpPrefixes: bgp,
      compositeScore: Math.round(composite * 10) / 10,
    });
  }
  return timeSeries;
}

function computeBaseline(timeSeries: TimeSeriesPoint[]): number {
  const sortedScores = [...timeSeries.map((p) => p.compositeScore)].sort((a, b) => a - b);
  return sortedScores.length > 0
    ? sortedScores[Math.floor(sortedScores.length * BASELINE_PERCENTILE)]
    : 100;
}

export function classifyState(ds: IodaStateDataset): StateAnalysisResult {
  const entity = resolveEntity(ds);
  const timeSeries = buildTimeSeries(ds);

  const baseline = computeBaseline(timeSeries);
  const minScorePoint = timeSeries.reduce(
    (min, p) => (p.compositeScore < min.compositeScore ? p : min),
    timeSeries[0] || { timestamp: 0, compositeScore: 100 }
  );
  const minScore = minScorePoint ? minScorePoint.compositeScore : 100;
  const dropPercentage = Math.max(
    0,
    Math.round(((baseline - minScore) / (baseline || 1)) * 1000) / 10
  );

  // Identificar el punto de inicio de la anomalía (primer punto con caída >=20%).
  let anomalyStartTs: number | undefined;
  let anomalyStartVET: string | undefined;
  for (let i = 0; i < timeSeries.length; i++) {
    const dropFromBase = ((baseline - timeSeries[i].compositeScore) / baseline) * 100;
    if (dropFromBase >= ANOMALY_DROP_PCT) {
      anomalyStartTs = timeSeries[i].timestamp;
      anomalyStartVET = timeSeries[i].vetTime;
      break;
    }
  }

  let minIndex = 0;
  for (let i = 0; i < timeSeries.length; i++) {
    if (timeSeries[i].compositeScore === minScore) {
      minIndex = i;
      break;
    }
  }

  // Recuperación tras el mínimo.
  let isRecovered = false;
  let recoveryRatePerHour = 0;
  let recoveryTs: number | undefined;
  let recoveryVET: string | undefined;
  if (minIndex < timeSeries.length - 1) {
    const lastPoint = timeSeries[timeSeries.length - 1];
    const recoveryDelta = lastPoint.compositeScore - minScore;
    const recoveryPct = (recoveryDelta / (baseline - minScore || 1)) * 100;

    if (recoveryPct >= RECOVERY_DETECT_PCT) {
      isRecovered = true;
      for (let i = minIndex; i < timeSeries.length; i++) {
        if (
          timeSeries[i].compositeScore >= minScore + (baseline - minScore) * (RECOVERY_CROSS_PCT / 100)
        ) {
          recoveryTs = timeSeries[i].timestamp;
          recoveryVET = timeSeries[i].vetTime;
          break;
        }
      }
      const hoursFromMin = (lastPoint.timestamp - minScorePoint.timestamp) / 3600;
      recoveryRatePerHour = hoursFromMin > 0 ? recoveryPct / hoursFromMin : 100;
    }
  }

  let recoveryType: RecoveryType = 'SIN_RECUPERACION';
  if (isRecovered) {
    recoveryType =
      recoveryRatePerHour >= FAST_RECOVERY_RATE_PER_HOUR
        ? 'REBOTE_RAPIDO'
        : 'RECUPERACION_LENTA_ESCALONADA';
  } else if (dropPercentage >= SEVERITY_MODERADO && minIndex < timeSeries.length - 3) {
    const lastScore = timeSeries[timeSeries.length - 1].compositeScore;
    if (lastScore > minScore + 5) {
      recoveryType = 'EN_CURSO';
    }
  }

  // Restricción 1: variación de madrugada (01:00-06:00 VET) con drop <40%.
  let isNighttimeFalsePositive = false;
  if (anomalyStartTs) {
    const hourVET = getVETHourDecimal(anomalyStartTs);
    if (hourVET >= NIGHT_FALSE_POSITIVE_RANGE.from && hourVET <= NIGHT_FALSE_POSITIVE_RANGE.to) {
      if (dropPercentage < NIGHT_FALSE_POSITIVE_MAX_DROP) {
        isNighttimeFalsePositive = true;
      }
    }
  }

  // Restricción 2: anomalía aislada de un solo ISP (AP cae, Darknet/BGP estables).
  let isSingleIspIsolated = false;
  if (dropPercentage < ISP_FALSE_POSITIVE_MAX_DROP && minIndex >= 0 && minIndex < timeSeries.length) {
    const apDrop = ((100 - timeSeries[minIndex].activeProbing) / 100) * 100;
    const darknetDrop = ((100 - timeSeries[minIndex].darknetTelescope) / 100) * 100;
    const bgpDrop = ((100 - timeSeries[minIndex].bgpPrefixes) / 100) * 100;
    if (apDrop >= ISP_AP_MIN_DROP && darknetDrop < ISP_DARKNET_MAX_DROP && bgpDrop < ISP_BGP_MAX_DROP) {
      isSingleIspIsolated = true;
    }
  }

  // Severidad final e interpretación según la metodología exacta.
  let severity: OutageSeverity = 'NORMALIDAD';
  let interpretation = 'Servicio eléctrico y conectividad telemétrica estables.';

  if (isNighttimeFalsePositive) {
    severity = 'NORMALIDAD';
    interpretation =
      'Variación circadiana nocturna normal (patrón de sueño / reposo de routers residenciales). No constituye evento del SEN.';
  } else if (isSingleIspIsolated) {
    severity = 'NORMALIDAD';
    interpretation =
      'Falla aislada de enlaces de telecomunicaciones / un solo ISP. Descartada afectación en infraestructura del SEN.';
  } else if (dropPercentage >= SEVERITY_APAGON_GENERAL) {
    severity = 'APAGON_GENERAL';
    interpretation = `Apagón general / Colapso de subestación troncal (${entity.criticalSubstations[0] || 'Nodo Regional'}). Pérdida masiva de alimentación en repetidoras y nodos de acceso.`;
  } else if (dropPercentage >= SEVERITY_CRITICO) {
    severity = 'CRITICO';
    interpretation = `Evento Crítico (Apagón Estatal / Parcial). Afectación severa en líneas de transmisión ${entity.keyTransmissionLines[0] || 'de alta tensión'} y salida de circuitos primarios.`;
  } else if (dropPercentage >= SEVERITY_MODERADO) {
    severity = 'MODERADO';
    interpretation = `Evento Moderado (Corte Sectorial / Falla Local). Apertura de circuitos de distribución o disparo selectivo en ${entity.criticalSubstations[0] || 'distribución municipal'}.`;
  } else {
    severity = 'NORMALIDAD';
    interpretation =
      'Variación semanal estándar (90% - 100% de conectividad esperada). Operación normal del SEN.';
  }

  return {
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
  };
}