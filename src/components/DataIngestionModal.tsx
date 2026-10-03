import React, { useState } from 'react';
import { useModalDialog } from './useModalDialog';
import { IodaStateDataset, OutageIncidentPreset } from '../types';
import { INCIDENT_PRESETS } from '../data/venezuelaGrid';
import { VENEZUELA_ENTITIES } from '../data/entityRegistry';
import { ScenarioProfile, generateScenario } from '../data/syntheticTelemetry';
import {
  Upload,
  FileCode,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Database,
  Play,
  Zap,
  X,
  Moon,
  Sun,
} from 'lucide-react';

interface DataIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyDataset: (dataset: IodaStateDataset[], scenarioTitle?: string) => void;
  currentScenarioTitle?: string;
}

export const DataIngestionModal: React.FC<DataIngestionModalProps> = ({
  isOpen,
  onClose,
  onApplyDataset,
  currentScenarioTitle,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'paste' | 'generator'>('presets');
  const [jsonInput, setJsonInput] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Generator states
  const [genTargetStates, setGenTargetStates] = useState<string[]>(['VE-V', 'VE-S', 'VE-M', 'VE-T']);
  const [genDropPct, setGenDropPct] = useState<number>(75);
  const [genOnsetHour, setGenOnsetHour] = useState<number>(14); // 14:00 VET
  const [genRecoveryType, setGenRecoveryType] = useState<'SLOW' | 'FAST' | 'NONE'>('SLOW');

  const dialogRef = useModalDialog<HTMLDivElement>(isOpen, onClose);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: OutageIncidentPreset) => {
    onApplyDataset(preset.dataset, preset.title);
    onClose();
  };

  const handleParseAndApplyJson = () => {
    setJsonError(null);
    try {
      if (!jsonInput.trim()) {
        setJsonError('Por favor pega un JSON válido.');
        return;
      }
      const parsed = JSON.parse(jsonInput);
      let datasets: IodaStateDataset[] = [];

      if (Array.isArray(parsed)) {
        // Direct array of IodaStateDataset or simple entities
        datasets = parsed.map((item: any) => {
          const entityId = item.entityId || item.id || item.code || 'VE-A';
          const entityName = item.entityName || item.name || entityId;
          const ap = item.signals?.activeProbing || item.activeProbing || [];
          const darknet = item.signals?.darknetTelescope || item.darknetTelescope || ap;
          const bgp = item.signals?.bgpPrefixes || item.bgpPrefixes || [];

          return {
            entityId,
            entityName,
            signals: {
              activeProbing: Array.isArray(ap) ? ap : [],
              darknetTelescope: Array.isArray(darknet) ? darknet : [],
              bgpPrefixes: Array.isArray(bgp) ? bgp : [],
            },
          };
        });
      } else if (parsed && typeof parsed === 'object') {
        // Object containing entities or IODA API responses
        if (parsed.data && Array.isArray(parsed.data)) {
          datasets = parsed.data;
        } else {
          // Wrap single or multi
          datasets = Object.keys(parsed).map((key) => {
            const val = parsed[key];
            return {
              entityId: key.startsWith('VE-') ? key : `VE-${key.toUpperCase()}`,
              entityName: val.name || key,
              signals: {
                activeProbing: val.activeProbing || val.signals?.activeProbing || [],
                darknetTelescope: val.darknetTelescope || val.signals?.darknetTelescope || [],
                bgpPrefixes: val.bgpPrefixes || val.signals?.bgpPrefixes || [],
              },
            };
          });
        }
      }

      if (!datasets.length) {
        setJsonError('No se encontraron series temporales válidas en el JSON.');
        return;
      }

      onApplyDataset(datasets, 'Dataset IODA Personalizado (Cargado por usuario)');
      onClose();
    } catch (e: any) {
      setJsonError(`Error de sintaxis JSON: ${e.message}`);
    }
  };

  const handleGenerateCustomDataset = () => {
    const dropMult = 1 - genDropPct / 100;
    const onsetIndex = genOnsetHour * 4; // 4 puntos por hora (paso de 15 min)
    const recoveryStartIndex = onsetIndex + 20;

    // El modal es un adaptador delgado: traduce los sliders a un perfil
    // declarativo para la fábrica de telemetría sintética.
    const profile: ScenarioProfile = {
      perturbations: [
        {
          kind: 'drop',
          stateIds: genTargetStates,
          from: onsetIndex,
          to: recoveryStartIndex,
          active: dropMult,
          darknet: dropMult * 0.9,
          bgp: 50 + dropMult * 40,
          recovery:
            genRecoveryType === 'NONE'
              ? undefined
              : {
                  from: recoveryStartIndex,
                  type: genRecoveryType === 'FAST' ? 'FAST' : 'SLOW',
                  darknetFactor: genRecoveryType === 'FAST' ? 1.0 : 0.95,
                  bgpFloor: 50 + dropMult * 40,
                  bgpTarget: 99,
                },
        },
      ],
    };

    const datasets = generateScenario(profile);

    onApplyDataset(
      datasets,
      `Simulación SEN Personalizada: -${genDropPct}% drop (${genTargetStates.length} estados)`
    );
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setJsonInput(text);
      setActiveTab('paste');
    };
    reader.readAsText(file);
  };

  const toggleTargetState = (id: string) => {
    if (genTargetStates.includes(id)) {
      setGenTargetStates(genTargetStates.filter((s) => s !== id));
    } else {
      setGenTargetStates([...genTargetStates, id]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="data-dialog-ref"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-surface border border-line rounded-card shadow-overlay overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-surface border-b border-line">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-control bg-info-surface border-info text-info">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 id="data-dialog-ref" className="text-label font-bold text-fg uppercase font-mono tracking-wider">
                Gestión de Datos Telemétricos IODA
              </h3>
              <p className="text-label text-fg-muted font-mono">
                Casos históricos SEN, ingestión de JSON de Georgia Tech o simulación sintética
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar diálogo"
            className="p-2.5 -m-1 rounded-control text-fg-muted hover:text-fg hover:bg-canvas transition-colors duration-150"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Nav Tabs */}
        <div className="flex px-6 pt-3 bg-canvas border-b border-line gap-4 text-label font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`pb-2.5 border-b-2 flex items-center gap-2 transition-colors duration-150 ${ activeTab === 'presets' ? 'border-sev-blackout text-fg font-bold' : 'border-transparent text-fg-muted hover:text-fg' }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Casos SEN Preconfigurados
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`pb-2.5 border-b-2 flex items-center gap-2 transition-colors duration-150 ${ activeTab === 'paste' ? 'border-sev-blackout text-fg font-bold' : 'border-transparent text-fg-muted hover:text-fg' }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Cargar / Pegar JSON
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('generator')}
            className={`pb-2.5 border-b-2 flex items-center gap-2 transition-colors duration-150 ${ activeTab === 'generator' ? 'border-sev-blackout text-fg font-bold' : 'border-transparent text-fg-muted hover:text-fg' }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Generador Sintético
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'presets' ? (
            <div className="space-y-3">
              <p className="text-label text-fg-muted font-mono">
                Selecciona uno de los escenarios telemétricos modelados a partir de eventos del SEN:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {INCIDENT_PRESETS.map((preset) => {
                  const isCurrent = currentScenarioTitle === preset.title;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-4 rounded-card border cursor-pointer transition-colors duration-150 duration-150 relative flex flex-col justify-between ${ isCurrent ? 'bg-surface-raised border-sev-blackout ' : 'bg-canvas border-line hover:border-line-strong hover:bg-surface' }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span
                            className={`text-label-sm font-mono font-bold px-2 py-0.5 rounded-control border ${ preset.category === 'CRITICAL_OUTAGE' ? 'bg-sev-blackout/20 text-sev-blackout border-sev-blackout' : preset.category === 'REGIONAL_TRIP' ? 'bg-sev-critical-surface text-sev-critical border-sev-critical' : preset.category === 'LOCAL_FAILURE' ? 'bg-sev-moderate-surface text-sev-moderate border-sev-moderate' : 'bg-sev-normal/20 text-sev-normal border-sev-normal' }`}
                          >
                            {preset.category}
                          </span>
                          {isCurrent && (
                            <span className="text-label-sm font-mono text-sev-blackout flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVO
                            </span>
                          )}
                        </div>
                        <h4 className="text-label font-bold text-fg uppercase font-mono mb-1">{preset.title}</h4>
                        <p className="text-label text-info font-mono mb-2">{preset.subtitle}</p>
                        <p className="text-label text-fg-muted leading-relaxed font-sans line-clamp-3">
                          {preset.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-line flex items-center justify-between text-label-sm text-fg-muted font-mono">
                        <span>{preset.timeRangeDescription}</span>
                        <span className="text-sev-blackout flex items-center gap-1 font-bold">
                          CARGAR <Play className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : activeTab === 'paste' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-label font-mono">
                <span className="text-fg-muted">Pega el JSON con la estructura telemétrica de IODA:</span>
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-control bg-canvas text-fg border border-line hover:bg-surface-raised cursor-pointer transition-colors duration-150">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir archivo .json</span>
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {jsonError && (
                <div className="p-3 rounded-card bg-sev-blackout/10 border border-sev-blackout text-sev-blackout text-label font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{jsonError}</span>
                </div>
              )}

              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={`[ { "entityId": "VE-V", "entityName": "Zulia", "signals": { "activeProbing": [[1725000000, 95.2], [1725000900, 12.1]], "darknetTelescope": [[1725000000, 98.0], [1725000900, 9.4]], "bgpPrefixes": [[1725000000, 99.0], [1725000900, 52.0]] } }
]`}
                rows={12}
                className="w-full p-3.5 rounded-card bg-canvas border border-line text-fg font-mono text-label placeholder:text-fg-muted"
              />

              <div className="flex items-center justify-end gap-2 font-mono text-label">
                <button
                  type="button"
                  onClick={() => setJsonInput('')}
                  className="px-4 py-2 rounded-control bg-canvas text-fg-muted border border-line hover:bg-surface-raised transition-colors duration-150"
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  onClick={handleParseAndApplyJson}
                  className="px-5 py-2 rounded-control bg-action-primary hover:bg-action-primary-hover text-action-primary-ink font-bold flex items-center gap-1.5 transition-colors duration-150"
                >
                  <Play className="w-3.5 h-3.5" /> Procesar y Generar Reporte
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-label font-mono">
              <p className="text-fg-muted">
                Configura los parámetros para generar una serie telemétrica artificial y probar las reglas de inferencia:
              </p>

              {/* Slider for Drop Pct */}
              <div className="p-4 rounded-card bg-canvas border border-line space-y-2">
                <div className="flex justify-between items-center text-fg">
                  <span className="font-semibold uppercase text-label">Magnitud de la Caída (% Drop):</span>
                  <span className="font-mono font-bold text-sev-blackout text-sm">{genDropPct}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="98"
                  value={genDropPct}
                  onChange={(e) => setGenDropPct(Number(e.target.value))}
                  className="w-full accent-sev-blackout cursor-pointer"
                />
                <div className="flex justify-between text-label-sm text-fg-subtle font-mono">
                  <span>Normalidad (&lt;25%)</span>
                  <span>Moderado (25-50%)</span>
                  <span>Crítico (51-80%)</span>
                  <span>Colapso (&gt;80%)</span>
                </div>
              </div>

              {/* Onset Hour */}
              <div className="p-4 rounded-card bg-canvas border border-line space-y-2">
                <div className="flex justify-between items-center text-fg">
                  <span className="font-semibold uppercase text-label">Hora de Inicio de la Anomalía (VET):</span>
                  <span className="font-mono font-bold text-info text-sm">
                    {genOnsetHour.toString().padStart(2, '0')}:00 VET
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="22"
                  value={genOnsetHour}
                  onChange={(e) => setGenOnsetHour(Number(e.target.value))}
                  className="w-full accent-info cursor-pointer"
                />
                {/* Mensaje de ayuda pegado al campo, no arriba de la página. */}
                <p
                  className="text-label flex items-start gap-1.5"
                  role={genOnsetHour >= 1 && genOnsetHour <= 6 ? 'alert' : undefined}
                >
                  {genOnsetHour >= 1 && genOnsetHour <= 6 ? (
                    <>
                      <Moon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-sev-moderate" aria-hidden="true" />
                      <span className="text-sev-moderate">
                        Hora de madrugada: si el drop es menor a 40%, el filtro lo descartará
                        como variación circadiana.
                      </span>
                    </>
                  ) : (
                    <>
                      <Sun className="w-3.5 h-3.5 mt-0.5 shrink-0 text-fg-subtle" aria-hidden="true" />
                      <span className="text-fg-muted">
                        Horario diurno o vespertino, de alta carga en el SEN.
                      </span>
                    </>
                  )}
                </p>
              </div>

              {/* Recovery Curve Selection */}
              <div className="p-4 rounded-card bg-canvas border border-line space-y-2">
                <span className="font-semibold uppercase text-label text-fg block">Perfil de Recuperación:</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setGenRecoveryType('SLOW')}
                    className={`p-2.5 rounded-card border text-left transition-colors duration-150 ${ genRecoveryType === 'SLOW' ? 'bg-surface-raised border-sev-blackout text-fg' : 'bg-surface border-line text-fg-muted' }`}
                  >
                    <div className="font-bold text-label">Lenta Escalonada</div>
                    <div className="text-label-sm text-fg-muted font-mono">Líneas 765kV / Turbinas</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenRecoveryType('FAST')}
                    className={`p-2.5 rounded-card border text-left transition-colors duration-150 ${ genRecoveryType === 'FAST' ? 'bg-surface-raised border-sev-blackout text-fg' : 'bg-surface border-line text-fg-muted' }`}
                  >
                    <div className="font-bold text-label">Rebote Rápido</div>
                    <div className="text-label-sm text-fg-muted font-mono">Distribución local</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenRecoveryType('NONE')}
                    className={`p-2.5 rounded-card border text-left transition-colors duration-150 ${ genRecoveryType === 'NONE' ? 'bg-surface-raised border-sev-blackout text-fg' : 'bg-surface border-line text-fg-muted' }`}
                  >
                    <div className="font-bold text-label">Sin Restitución</div>
                    <div className="text-label-sm text-fg-muted font-mono">Apagón persistente</div>
                  </button>
                </div>
              </div>

              {/* State Pickers */}
              <div className="p-4 rounded-card bg-canvas border border-line space-y-2">
                <div className="flex justify-between items-center text-fg">
                  <span className="font-semibold uppercase text-label">Estados Afectados ({genTargetStates.length} seleccionados):</span>
                  <div className="flex gap-2 text-label">
                    <button
                      type="button"
                      onClick={() => setGenTargetStates(VENEZUELA_ENTITIES.map((e) => e.id))}
                      className="text-info hover:underline"
                    >
                      Todos (Nacional)
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenTargetStates([])}
                      className="text-fg-muted hover:underline"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1 max-h-36 overflow-y-auto">
                  {VENEZUELA_ENTITIES.map((e) => {
                    const isChecked = genTargetStates.includes(e.id);
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => toggleTargetState(e.id)}
                        className={`px-2 py-1 rounded-control text-label font-mono transition-colors duration-150 ${ isChecked ? 'bg-sev-blackout/20 text-sev-blackout border border-sev-blackout font-bold' : 'bg-surface text-fg-muted border border-line' }`}
                      >
                        {e.code} ({e.name})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleGenerateCustomDataset}
                  className="px-6 py-3 rounded-control bg-action-primary hover:bg-action-primary-hover text-action-primary-ink font-bold text-label font-mono flex items-center gap-1.5 transition-colors duration-150"
                >
                  <Play className="w-4 h-4" /> GENERAR Y EVALUAR DATASET
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
