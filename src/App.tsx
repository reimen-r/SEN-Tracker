import { useState, useMemo, useCallback, lazy, Suspense, useEffect, useRef } from 'react';
import { IodaStateDataset, OutageReport } from './types';
import { INCIDENT_PRESETS } from './data/venezuelaGrid';
import { VENEZUELA_ENTITIES } from './data/entityRegistry';
import { analyzeIodaDatasets } from './services/analyzer';
import { fetchIodaSignals } from './services/iodaApi';
import {
  detectEscalations,
  fetchNationalTelemetry,
  seedSeverityMap,
  SeverityMap,
} from './services/vigilance';
import { loadPersistedState, savePersistedState } from './utils/storage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { VenezuelaMap } from './components/VenezuelaMap';
import { TelemetryChart } from './components/TelemetryChart';
import { ReportView } from './components/ReportView';
import { MethodologyBanner } from './components/MethodologyBanner';
import { SeverityDistribution } from './components/SeverityDistribution';
import { Radar, TriangleAlert, X } from 'lucide-react';

// Lazy-load modals to keep the initial bundle small
const DataIngestionModal = lazy(() =>
  import('./components/DataIngestionModal').then((m) => ({ default: m.DataIngestionModal }))
);
const GeminiAnalystModal = lazy(() =>
  import('./components/GeminiAnalystModal').then((m) => ({ default: m.GeminiAnalystModal }))
);

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
  const prevSeverityMap = useRef<SeverityMap>(new Map());

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
      // Concurrencia limitada a 6 estados por lote (ver fetchNationalTelemetry).
      const datasets = await fetchNationalTelemetry(VENEZUELA_ENTITIES, fetchIodaSignals, 6);
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

  useEffect(() => {
    if (!watchMode) return;
    const id = setInterval(() => {
      void (async () => {
        const datasets = await runLiveFetch();
        if (!datasets) return;
        setCurrentDatasets(datasets);
        setCurrentScenarioTitle('Telemetría en Vivo IODA (24h)');
        const report = analyzeIodaDatasets(datasets);
        const { escalations, nextSeverityMap } = detectEscalations(prevSeverityMap.current, report);
        prevSeverityMap.current = nextSeverityMap;
        if (escalations.length > 0) {
          const msg = `Nueva anomalía detectada: ${escalations.join(' · ')}`;
          setWatchAlert(msg);
          sendSystemNotification('SEN — Alerta de Vigilancia', msg);
        }
      })();
    }, watchIntervalSec * 1000);
    return () => clearInterval(id);
  }, [watchMode, watchIntervalSec, runLiveFetch, sendSystemNotification]);

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
      prevSeverityMap.current = seedSeverityMap(report);
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
    <div className="min-h-screen flex flex-col bg-canvas text-fg antialiased font-sans">
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
          <div
            role="alert"
            className="no-print flex items-center gap-3 px-4 py-3 rounded-control bg-sev-blackout-surface border border-sev-blackout text-body"
          >
            <TriangleAlert className="w-4 h-4 shrink-0 text-sev-blackout" aria-hidden="true" />
            <span className="text-sev-blackout flex-1 min-w-0">{liveError}</span>
            <button
              type="button"
              onClick={() => setLiveError(null)}
              aria-label="Descartar aviso de error"
              className="shrink-0 rounded-control p-2 -m-1 text-fg-muted hover:text-fg hover:bg-canvas transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Vigilancia Alert Banner */}
        {watchAlert && (
          <div
            role="status"
            className="no-print flex items-center gap-3 px-4 py-3 rounded-control bg-sev-moderate-surface border border-sev-moderate text-body"
          >
            <Radar className="w-4 h-4 shrink-0 text-sev-moderate" aria-hidden="true" />
            <span className="text-sev-moderate flex-1 min-w-0">{watchAlert}</span>
            <button
              type="button"
              onClick={() => setWatchAlert(null)}
              aria-label="Descartar alerta de vigilancia"
              className="shrink-0 rounded-control p-2 -m-1 text-fg-muted hover:text-fg hover:bg-canvas transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Methodology & Detection Rules Banner */}
        <div className="no-print">
          <MethodologyBanner />
        </div>

        {/* Lectura nacional: la proporcion y los conteos en un solo objeto */}
        <SeverityDistribution report={report} />

        {/* View Layouts */}
        {activeView === 'dashboard' ? (
          <div className="space-y-4">
            {/* Top Row: Map (Left) + Telemetry Time-Series Chart (Right) */}
            <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-6 min-h-[520px]">
                <ErrorBoundary>
                  <VenezuelaMap
                    stateResults={report.stateClassifications}
                    selectedStateId={selectedStateId}
                    onSelectState={(id) => setSelectedStateId(id)}
                  />
                </ErrorBoundary>
              </div>

              <div className="lg:col-span-6 min-h-[520px]">
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
          <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[600px]">
            <div className="lg:col-span-6 min-h-[520px]">
              <ErrorBoundary>
                <VenezuelaMap
                  stateResults={report.stateClassifications}
                  selectedStateId={selectedStateId}
                  onSelectState={(id) => setSelectedStateId(id)}
                />
              </ErrorBoundary>
            </div>
            <div className="lg:col-span-6 min-h-[520px]">
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
      <footer className="mt-8 border-t border-line bg-canvas px-6 py-3 text-label-sm text-fg-subtle font-mono">
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 backdrop-blur-sm">
              <div className="text-label font-mono text-fg-muted animate-pulse">Cargando módulo...</div>
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 backdrop-blur-sm">
              <div className="text-label font-mono text-fg-muted animate-pulse">Cargando analista IA...</div>
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
