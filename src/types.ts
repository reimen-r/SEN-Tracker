export type OutageSeverity = 'NORMALIDAD' | 'MODERADO' | 'CRITICO' | 'APAGON_GENERAL';

export type RecoveryType = 'REBOTE_RAPIDO' | 'RECUPERACION_LENTA_ESCALONADA' | 'SIN_RECUPERACION' | 'EN_CURSO';

export interface TimeSeriesPoint {
  timestamp: number; // Unix timestamp in seconds
  vetTime: string; // HH:mm format in VET (UTC-4)
  activeProbing: number; // Normalized index 0 - 100
  darknetTelescope: number; // Normalized index 0 - 100
  bgpPrefixes: number; // Normalized index 0 - 100
  compositeScore: number; // Weighted connectivity score 0 - 100
}

export interface FederalEntity {
  id: string; // e.g. "VE-A", "VE-Z"
  name: string; // e.g. "Zulia", "Distrito Capital"
  code: string; // "ZUL", "CCS", "BOL"
  region: 'Guayana' | 'Capital' | 'Central' | 'Occidental' | 'Andes' | 'Oriente' | 'Llanos' | 'Insular';
  capital: string;
  populationEstimate: number;
  criticalSubstations: string[];
  keyTransmissionLines: string[];
  coordinates: { x: number; y: number; lat: number; lng: number };
}

export interface StateAnalysisResult {
  entity: FederalEntity;
  baselineScore: number;
  minimumScore: number;
  currentScore: number;
  dropPercentage: number;
  severity: OutageSeverity;
  interpretation: string;
  anomalyStartTimestamp?: number;
  anomalyStartVET?: string;
  recoveryTimestamp?: number;
  recoveryVET?: string;
  recoveryType: RecoveryType;
  timeSeries: TimeSeriesPoint[];
  isNighttimeFalsePositiveFiltered: boolean;
  isSingleIspIsolatedAnomaly: boolean;
}

export interface ExecutiveSummary {
  generalStatus: string;
  affectedStatesCount: number;
  criticalStatesCount: number;
  generalBlackoutStatesCount: number;
  totalStatesAnalyzed: number;
  estimatedOnsetVET: string;
  nationalConnectivityDropPct: number;
  primaryHypothesis: string;
}

export interface RecoveryAnalysis {
  recoverySpeedSummary: string;
  recoveryType: RecoveryType;
  restoredStatesCount: number;
  pendingStatesCount: number;
  technicalInterpretation: string;
}

export interface OutageReport {
  timestampAnalyzed: number;
  executiveSummary: ExecutiveSummary;
  stateClassifications: StateAnalysisResult[];
  recoveryAnalysis: RecoveryAnalysis;
  alertRecommendation: string;
  markdownText: string;
}

export interface IodaRawSignalSeries {
  metric: 'ping-slash24' | 'ucsd-nt' | 'bgp';
  values: [number, number][]; // [timestamp_sec, value]
}

export interface IodaStateDataset {
  entityId: string;
  entityName: string;
  signals: {
    activeProbing: [number, number][];
    darknetTelescope: [number, number][];
    bgpPrefixes: [number, number][];
  };
}

export interface OutageIncidentPreset {
  id: string;
  title: string;
  subtitle: string;
  category: 'CRITICAL_OUTAGE' | 'REGIONAL_TRIP' | 'LOCAL_FAILURE' | 'NIGHT_VARIATION' | 'ISP_ISOLATED';
  description: string;
  timeRangeDescription: string;
  dataset: IodaStateDataset[];
}
