import { useState, useMemo, useCallback, lazy, Suspense, useEffect, useRef } from 'react';
import { IodaStateDataset, OutageReport, OutageSeverity } from './types';
import { INCIDENT_PRESETS, VENEZUELA_ENTITIES } from './data/venezuelaGrid';
import { analyzeIodaDatasets } from './services/analyzer';
import { fetchIodaSignals } from './services/iodaApi';
import { loadPersistedState, savePersistedState } from './utils/storage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { VenezuelaMap } from './components/VenezuelaMap';
import { TelemetryChart } from './components/TelemetryChart';
import { ReportView } from './components/ReportView';
import { MethodologyBanner } from './components/MethodologyBanner';

// Lazy-load modals to keep the initial bundle small
const DataIngestionModal = lazy(() =>
  import('./components/DataIngestionModal').then((m) => ({ default: m.DataIngestionModal }))
);
const GeminiAnalystModal = lazy(() =>
  import('./components/GeminiAnalystModal').then((m) => ({ default: m.GeminiAnalystModal }))
);

const SEVERITY_RANK: Record<OutageSeverity, number> = {
  NORMALIDAD: 0,
  MODERADO: 1,
  CRITICO: 2,
  APAGON_GENERAL: 3,
};

export default function App() {
  // Estado persistido de la sesión anterior (localStorage), si es válido.
  const [initialState] = useState(() => loadPersistedState());

  // Default to national blackout scenario
  const [currentScenarioTitle, setCurrentScenarioTitle] = useState<string>(
    initialState?.scenarioTitle ?? INCIDENT_PRESETS[0].title
  );
  const [currentDatasets, setCurrentDatasets] = useState<IodaStateDataset[]>(
    initialState?.datasets ?? INCIDENT_PRESETS[0].dataset
  );

  // Selected state for deep telemetry drilldown (default Zulia or Distrito Capital)
  const [selectedStateId, setSelectedStateId] = useState<string>(
    initialState?.selectedStateId ?? 'VE-V'
  );

  // Active view: full dashboard, report focused, or map/telemetry focused
  const [activeView, setActiveView] = useState<'dashboard' | 'report' | 'map'>(
    initialState?.activeView ?? 'dashboard'
  );

  // Modals
  const [isDataModalOpen, setIsDataModalOpen] = useState<boolean>(false);
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState<boolean>(false);

  // Live IODA data loading state
  const [isLiveLoading, setIsLiveLoading] = useState<boolean>(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  // Modo vigilancia: polling automático + alertas de escalada de severidad
  const [watchMode, setWatchMode] = useState<boolean>(false);
  const [watchIntervalSec, setWatchIntervalSec] = useState<number>(300);
  const [watchAlert, setWatchAlert] = useState<string | null>(null);
  const prevSeverityMap = useRef<Map<string, OutageSeverity>>(new Map());

  const sendSystemNotification = useCallback((title: string, body: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      new Notification(title, { body });
    } catch {
      // Algunos navegadores rechazan notifications sin icono; ignorar.
    }
  }, []);

  const runLiveFetch = useCallback(async (): Promise<IodaStateDataset[] | null> => {
    setIsLiveLoading(true);
    setLiveError(null);
    try {
      // Concurrencia limitada a 6 estados por lote para no martillar el
      // proxy ni el upstream de Georgia Tech (24 peticiones simultáneas).
      const batchSize = 6;
      const results: (IodaStateDataset | null)[] = [];
      for (let i = 0; i < VENEZUELA_ENTITIES.length; i += batchSize) {
        const batch = VENEZUELA_ENTITIES.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (entity) => {
            try {
              return await fetchIodaSignals(entity.id);
            } catch {
              return null;
            }
          })
        );
        results.push(...batchResults);
      }
      const datasets = results.filter((d): d is IodaStateDataset => d !== null);
      if (datasets.length === 0) {
        throw new Error('No se pudo obtener datos en vivo de IODA.');
      }
      return datasets;
    } catch (err: any) {
      setLiveError(err.message || 'Error al obtener datos en vivo.');
      return null;
    } finally {
      setIsLiveLoading(false);
    }
  }, []);

  // Fetch live telemetry from IODA for all Venezuelan states
  const handleFetchLiveData = useCallback(async () => {
    const datasets = await runLiveFetch();
    if (datasets) {
      setCurrentDatasets(datasets);
      setCurrentScenarioTitle('Telemetría en Vivo IODA (24h)');
    }
  }, [runLiveFetch]);

  const detectEscalations = useCallback(
    (datasets: IodaStateDataset[]) => {
      const newReport = analyzeIodaDatasets(datasets);
      const escalations: string[] = [];
      for (const st of newReport.stateClassifications) {
        const prev = prevSeverityMap.current.get(st.entity.id);
        if (prev !== undefined && SEVERITY_RANK[st.severity] > SEVERITY_RANK[prev]) {
          escalations.push(`${st.entity.name} → ${st.severity} (-${st.dropPercentage}%)`);
        }
      }
      prevSeverityMap.current = new Map(
        newReport.stateClassifications.map((s) => [s.entity.id, s.severity])
      );
      if (escalations.length > 0) {
        const msg = `Nueva anomalía detectada: ${escalations.join(' · ')}`;
        setWatchAlert(msg);
        sendSystemNotification('⚠️ SEN — Alerta de Vigilancia', msg);
      }
    },
    [sendSystemNotification]
  );

  useEffect(() => {
    if (!watchMode) return;
    const id = setInterval(() => {
      void (async () => {
        const datasets = await runLiveFetch();
        if (datasets) {
          setCurrentDatasets(datasets);
          setCurrentScenarioTitle('Telemetría en Vivo IODA (24h)');
          detectEscalations(datasets);
        }
      })();
    }, watchIntervalSec * 1000);
    return () => clearInterval(id);
  }, [watchMode, watchIntervalSec, runLiveFetch, detectEscalations]);

  // Compute outage analysis
  const report: OutageReport = useMemo(() => {
    return analyzeIodaDatasets(currentDatasets);
  }, [currentDatasets]);

  // Selected state analysis object
  const selectedStateResult = useMemo(() => {
    return (
      report.stateClassifications.find((s) => s.entity.id === selectedStateId) ||
      report.stateClassifications[0]
    );
  }, [report, selectedStateId]);

  const handleToggleWatch = useCallback(() => {
    const next = !watchMode;
    if (next) {
      // Seed con la severidad actual para no disparar falsa alarma en el primer poll
      prevSeverityMap.current = new Map(
        report.stateClassifications.map((s) => [s.entity.id, s.severity])
      );
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => undefined);
      }
    }
    setWatchMode(next);
  }, [watchMode, report]);

  // Persistir la sesión (escenario, datasets, estado y vista seleccionados).
  useEffect(() => {
    savePersistedState({
      scenarioTitle: currentScenarioTitle,
      datasets: currentDatasets,
      selectedStateId,
      activeView,
    });
  }, [currentScenarioTitle, currentDatasets, selectedStateId, activeView]);

  const handleApplyDataset = (dataset: IodaStateDataset[], scenarioTitle?: string) => {
    setCurrentDatasets(dataset);
    if (scenarioTitle) {
      setCurrentScenarioTitle(scenarioTitle);
    }
  };

  const handleSelectPreset = (presetId: string) => {
    const preset = INCIDENT_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setCurrentDatasets(preset.dataset);
      setCurrentScenarioTitle(preset.title);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0c0e12] text-slate-200 antialiased font-sans">
      {/* Top Operations Header */}
      <Header
        report={report}
        currentScenarioTitle={currentScenarioTitle}
        onOpenDataModal={() => setIsDataModalOpen(true)}
        onOpenGeminiModal={() => setIsGeminiModalOpen(true)}
        onSelectPreset={handleSelectPreset}
        activeView={activeView}
        setActiveView={setActiveView}
        onFetchLiveData={handleFetchLiveData}
        isLiveLoading={isLiveLoading}
        watchMode={watchMode}
        watchIntervalSec={watchIntervalSec}
        onToggleWatch={handleToggleWatch}
        onWatchIntervalChange={setWatchIntervalSec}
      />

      {/* Main Operations Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-4">
        {/* Live Data Error Banner */}
        {liveError && (
          <div className="no-print flex items-center justify-between gap-3 px-4 py-2.5 rounded bg-red-500/10 border border-red-500/30 text-xs text-red-300 font-mono">
            <span>⚠️ {liveError}</span>
            <button
              type="button"
              onClick={() => setLiveError(null)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* Vigilancia Alert Banner */}
        {watchAlert && (
          <div className="no-print flex items-center justify-between gap-3 px-4 py-2.5 rounded bg-amber-500/10 border border-amber-500/40 text-xs text-amber-200 font-mono">
            <span>🛰️ {watchAlert}</span>
            <button
              type="button"
              onClick={() => setWatchAlert(null)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* Methodology & Detection Rules Banner */}
        <div className="no-print">
          <MethodologyBanner />
        </div>

        {/* Global KPI Summary Strip in Sleek Theme */}
        <div className="no-print grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          <div className="bg-[#161b22] p-3.5 border border-slate-700/50 rounded flex flex-col justify-between">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-1">
              Estados Afectados
            </p>
            <p className="text-3xl font-bold text-white font-mono">
              {report.executiveSummary.affectedStatesCount}{' '}
              <span className="text-sm font-normal text-slate-500">/ 24</span>
            </p>
          </div>

          <div className="bg-[#161b22] p-3.5 border border-slate-700/50 rounded flex flex-col justify-between">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-1">
              Apagón General (&gt;80%)
            </p>
            <p className="text-3xl font-bold text-red-500 font-mono">
              {report.executiveSummary.generalBlackoutStatesCount}
            </p>
          </div>

          <div className="bg-[#161b22] p-3.5 border border-slate-700/50 rounded flex flex-col justify-between">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-1">
              Eventos Críticos (51-80%)
            </p>
            <p className="text-3xl font-bold text-orange-400 font-mono">
              {report.executiveSummary.criticalStatesCount}
            </p>
          </div>

          <div className="bg-[#161b22] p-3.5 border border-slate-700/50 rounded flex flex-col justify-between">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-1">
              Falla Detectada
            </p>
            <p className="text-2xl font-bold text-blue-400 font-mono">
              {report.executiveSummary.estimatedOnsetVET}{' '}
              <span className="text-xs font-normal text-slate-400">VET</span>
            </p>
          </div>

          <div className="hidden lg:flex bg-[#161b22] p-3.5 border border-slate-700/50 rounded flex-col justify-between">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-1">
              Recuperación
            </p>
            <p className="text-base font-bold text-amber-400 font-mono truncate">
              {report.recoveryAnalysis.recoveryType === 'SIN_RECUPERACION'
                ? 'NULA / SIN RETORNO'
                : report.recoveryAnalysis.recoveryType.replace('_', ' ')}
            </p>
          </div>
        </div>

        {/* View Layouts */}
        {activeView === 'dashboard' ? (
          <div className="space-y-4">
            {/* Top Row: Map (Left) + Telemetry Time-Series Chart (Right) */}
            <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-6 h-[500px]">
                <ErrorBoundary>
                  <VenezuelaMap
                    stateResults={report.stateClassifications}
                    selectedStateId={selectedStateId}
                    onSelectState={(id) => setSelectedStateId(id)}
                  />
                </ErrorBoundary>
              </div>

              <div className="lg:col-span-6 h-[500px]">
                <ErrorBoundary>
                  <TelemetryChart
                    selectedState={selectedStateResult}
                    allStates={report.stateClassifications}
                    onSelectState={(id) => setSelectedStateId(id)}
                  />
                </ErrorBoundary>
              </div>
            </div>

            {/* Bottom Row: Full Structured Report Engine */}
            <div className="min-h-[520px]">
              <ErrorBoundary>
                <ReportView
                  report={report}
                  selectedStateId={selectedStateId}
                  onSelectState={(id) => setSelectedStateId(id)}
                />
              </ErrorBoundary>
            </div>
          </div>
        ) : activeView === 'map' ? (
          <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-230px)] min-h-[600px]">
            <div className="lg:col-span-6 h-full">
              <ErrorBoundary>
                <VenezuelaMap
                  stateResults={report.stateClassifications}
                  selectedStateId={selectedStateId}
                  onSelectState={(id) => setSelectedStateId(id)}
                />
              </ErrorBoundary>
            </div>
            <div className="lg:col-span-6 h-full">
              <ErrorBoundary>
                <TelemetryChart
                  selectedState={selectedStateResult}
                  allStates={report.stateClassifications}
                  onSelectState={(id) => setSelectedStateId(id)}
                />
              </ErrorBoundary>
            </div>
          </div>
        ) : (
          /* Report View Only */
          <div className="min-h-[750px]">
            <ErrorBoundary>
              <ReportView
                report={report}
                selectedStateId={selectedStateId}
                onSelectState={(id) => setSelectedStateId(id)}
              />
            </ErrorBoundary>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-8 border-t border-slate-800 bg-[#0c0e12] px-6 py-3 text-[10px] text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>IODA DATASET SOURCE: GA-TECH / INTERNET OUTAGE DETECTION & ANALYSIS</span>
          <span>SISTEMA ELÉCTRICO NACIONAL DE VENEZUELA (SEN)</span>
          <span>ESTACIÓN_ID: CCS-TR-09</span>
        </div>
      </footer>

      {/* Modals */}
      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0e12]/80 backdrop-blur-sm">
              <div className="text-xs font-mono text-slate-400 animate-pulse">Cargando módulo...</div>
            </div>
          }
        >
          <DataIngestionModal
            isOpen={isDataModalOpen}
            onClose={() => setIsDataModalOpen(false)}
            onApplyDataset={handleApplyDataset}
            currentScenarioTitle={currentScenarioTitle}
          />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0e12]/80 backdrop-blur-sm">
              <div className="text-xs font-mono text-slate-400 animate-pulse">Cargando analista IA...</div>
            </div>
          }
        >
          <GeminiAnalystModal
            isOpen={isGeminiModalOpen}
            onClose={() => setIsGeminiModalOpen(false)}
            report={report}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
