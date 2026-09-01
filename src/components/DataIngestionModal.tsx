import React, { useState } from 'react';
import { IodaStateDataset, OutageIncidentPreset } from '../types';
import { INCIDENT_PRESETS, VENEZUELA_ENTITIES } from '../data/venezuelaGrid';
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
    const baseStart = Math.floor(new Date('2026-08-30T04:00:00Z').getTime() / 1000);
    const stepSec = 15 * 60;
    const pointCount = 96;
    const onsetIndex = Math.floor((genOnsetHour * 60) / 15);
    const recoveryStartIndex = onsetIndex + 20;

    const datasets: IodaStateDataset[] = VENEZUELA_ENTITIES.map((entity) => {
      const isTarget = genTargetStates.includes(entity.id);
      const ap: [number, number][] = [];
      const darknet: [number, number][] = [];
      const bgp: [number, number][] = [];

      for (let i = 0; i < pointCount; i++) {
        const ts = baseStart + i * stepSec;
        const base = 96 + (Math.sin(i * 0.2) * 2);

        let active = base;
        let telescope = base;
        let bgpVal = 99;

        if (isTarget && i >= onsetIndex) {
          const dropMult = 1 - genDropPct / 100;
          if (genRecoveryType === 'NONE' || i < recoveryStartIndex) {
            active = base * dropMult;
            telescope = base * (dropMult * 0.9);
            bgpVal = 50 + (dropMult * 40);
          } else {
            // In recovery phase
            const recProgress = (i - recoveryStartIndex) / (pointCount - recoveryStartIndex);
            if (genRecoveryType === 'FAST') {
              const fastProgress = Math.min(1, recProgress * 3.0);
              active = base * (dropMult + (1 - dropMult) * fastProgress);
              telescope = active;
              bgpVal = 50 + 49 * fastProgress;
            } else {
              // SLOW
              active = base * (dropMult + (1 - dropMult) * recProgress);
              telescope = base * (dropMult + (1 - dropMult) * recProgress * 0.95);
              bgpVal = 50 + 49 * recProgress;
            }
          }
        }

        ap.push([ts, Math.round(active * 10) / 10]);
        darknet.push([ts, Math.round(telescope * 10) / 10]);
        bgp.push([ts, Math.round(bgpVal * 10) / 10]);
      }

      return {
        entityId: entity.id,
        entityName: entity.name,
        signals: {
          activeProbing: ap,
          darknetTelescope: darknet,
          bgpPrefixes: bgp,
        },
      };
    });

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0c0e12]/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#161b22] border border-slate-700/50 rounded shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#161b22] border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-blue-500/20 border border-blue-500/40 text-blue-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                Gestión de Datos Telemétricos IODA
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Casos históricos SEN, ingestión de JSON de Georgia Tech o simulación sintética
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#0c0e12] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Nav Tabs */}
        <div className="flex px-6 pt-3 bg-[#0c0e12] border-b border-slate-700/50 gap-4 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`pb-2.5 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'presets'
                ? 'border-red-500 text-white font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Casos SEN Preconfigurados
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`pb-2.5 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'paste'
                ? 'border-red-500 text-white font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Cargar / Pegar JSON
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('generator')}
            className={`pb-2.5 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'generator'
                ? 'border-red-500 text-white font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Generador Sintético
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'presets' ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 font-mono">
                Selecciona uno de los escenarios telemétricos modelados a partir de eventos del SEN:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {INCIDENT_PRESETS.map((preset) => {
                  const isCurrent = currentScenarioTitle === preset.title;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-4 rounded border cursor-pointer transition-all duration-150 relative flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-[#1c2128] border-red-500 shadow-md'
                          : 'bg-[#0c0e12] border-slate-700/50 hover:border-slate-500 hover:bg-[#161b22]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                              preset.category === 'CRITICAL_OUTAGE'
                                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                                : preset.category === 'REGIONAL_TRIP'
                                ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                                : preset.category === 'LOCAL_FAILURE'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            }`}
                          >
                            {preset.category}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-mono text-red-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVO
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-white uppercase font-mono mb-1">{preset.title}</h4>
                        <p className="text-[11px] text-blue-400 font-mono mb-2">{preset.subtitle}</p>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-sans line-clamp-3">
                          {preset.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>{preset.timeRangeDescription}</span>
                        <span className="text-red-400 flex items-center gap-1 font-bold">
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
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <span className="text-slate-300">Pega el JSON con la estructura telemétrica de IODA:</span>
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0c0e12] text-slate-200 border border-slate-700/50 hover:bg-[#1c2128] cursor-pointer transition-all">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir archivo .json</span>
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {jsonError && (
                <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{jsonError}</span>
                </div>
              )}

              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={`[
  {
    "entityId": "VE-V",
    "entityName": "Zulia",
    "signals": {
      "activeProbing": [[1725000000, 95.2], [1725000900, 12.1]],
      "darknetTelescope": [[1725000000, 98.0], [1725000900, 9.4]],
      "bgpPrefixes": [[1725000000, 99.0], [1725000900, 52.0]]
    }
  }
]`}
                rows={12}
                className="w-full p-3.5 rounded bg-[#0c0e12] border border-slate-700/50 text-slate-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-red-500 placeholder:text-slate-700"
              />

              <div className="flex items-center justify-end gap-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setJsonInput('')}
                  className="px-4 py-2 rounded bg-[#0c0e12] text-slate-300 border border-slate-700/50 hover:bg-[#1c2128] transition-all"
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  onClick={handleParseAndApplyJson}
                  className="px-5 py-2 rounded bg-red-500 hover:bg-red-600 text-white font-bold flex items-center gap-1.5 transition-all shadow-md"
                >
                  <Play className="w-3.5 h-3.5" /> Procesar y Generar Reporte
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs font-mono">
              <p className="text-slate-300">
                Configura los parámetros para generar una serie telemétrica artificial y probar las reglas de inferencia:
              </p>

              {/* Slider for Drop Pct */}
              <div className="p-4 rounded bg-[#0c0e12] border border-slate-700/50 space-y-2">
                <div className="flex justify-between items-center text-slate-200">
                  <span className="font-semibold uppercase text-[11px]">Magnitud de la Caída (% Drop):</span>
                  <span className="font-mono font-bold text-red-400 text-sm">{genDropPct}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="98"
                  value={genDropPct}
                  onChange={(e) => setGenDropPct(Number(e.target.value))}
                  className="w-full accent-red-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Normalidad (&lt;25%)</span>
                  <span>Moderado (25-50%)</span>
                  <span>Crítico (51-80%)</span>
                  <span>Colapso (&gt;80%)</span>
                </div>
              </div>

              {/* Onset Hour */}
              <div className="p-4 rounded bg-[#0c0e12] border border-slate-700/50 space-y-2">
                <div className="flex justify-between items-center text-slate-200">
                  <span className="font-semibold uppercase text-[11px]">Hora de Inicio de la Anomalía (VET):</span>
                  <span className="font-mono font-bold text-blue-400 text-sm">
                    {genOnsetHour.toString().padStart(2, '0')}:00 VET
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="22"
                  value={genOnsetHour}
                  onChange={(e) => setGenOnsetHour(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="text-[11px] text-slate-400">
                  {genOnsetHour >= 1 && genOnsetHour <= 6 ? (
                    <span className="text-amber-400 font-mono">
                      ⚠️ Hora de madrugada: Si el drop es &lt;40%, el filtro lo descartará como variación circadiana.
                    </span>
                  ) : (
                    <span>Horario diurno / vespertino de alta carga en el SEN.</span>
                  )}
                </div>
              </div>

              {/* Recovery Curve Selection */}
              <div className="p-4 rounded bg-[#0c0e12] border border-slate-700/50 space-y-2">
                <span className="font-semibold uppercase text-[11px] text-slate-200 block">Perfil de Recuperación:</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setGenRecoveryType('SLOW')}
                    className={`p-2.5 rounded border text-left transition-all ${
                      genRecoveryType === 'SLOW'
                        ? 'bg-[#1c2128] border-red-500 text-white'
                        : 'bg-[#161b22] border-slate-700/50 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs">Lenta Escalonada</div>
                    <div className="text-[10px] text-slate-400 font-mono">Líneas 765kV / Turbinas</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenRecoveryType('FAST')}
                    className={`p-2.5 rounded border text-left transition-all ${
                      genRecoveryType === 'FAST'
                        ? 'bg-[#1c2128] border-red-500 text-white'
                        : 'bg-[#161b22] border-slate-700/50 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs">Rebote Rápido</div>
                    <div className="text-[10px] text-slate-400 font-mono">Distribución local</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenRecoveryType('NONE')}
                    className={`p-2.5 rounded border text-left transition-all ${
                      genRecoveryType === 'NONE'
                        ? 'bg-[#1c2128] border-red-500 text-white'
                        : 'bg-[#161b22] border-slate-700/50 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs">Sin Restitución</div>
                    <div className="text-[10px] text-slate-400 font-mono">Apagón persistente</div>
                  </button>
                </div>
              </div>

              {/* State Pickers */}
              <div className="p-4 rounded bg-[#0c0e12] border border-slate-700/50 space-y-2">
                <div className="flex justify-between items-center text-slate-200">
                  <span className="font-semibold uppercase text-[11px]">Estados Afectados ({genTargetStates.length} seleccionados):</span>
                  <div className="flex gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setGenTargetStates(VENEZUELA_ENTITIES.map((e) => e.id))}
                      className="text-blue-400 hover:underline"
                    >
                      Todos (Nacional)
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenTargetStates([])}
                      className="text-slate-400 hover:underline"
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
                        className={`px-2 py-1 rounded text-xs font-mono transition-all ${
                          isChecked
                            ? 'bg-red-500/20 text-red-300 border border-red-500/50 font-bold'
                            : 'bg-[#161b22] text-slate-400 border border-slate-700/50'
                        }`}
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
                  className="px-6 py-2.5 rounded bg-red-500 hover:bg-red-600 text-white font-bold text-xs font-mono flex items-center gap-1.5 transition-all shadow-md"
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
