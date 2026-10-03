import React from 'react';
import { OutageReport } from '../types';
import {
  Database,
  Bot,
  RefreshCw,
  ChevronDown,
  Eye,
} from 'lucide-react';
import { INCIDENT_PRESETS } from '../data/venezuelaGrid';
import { LiveClock } from './LiveClock';
import { nationalAlertToken } from '../design/severity';

interface HeaderProps {
  report: OutageReport;
  currentScenarioTitle: string;
  onOpenDataModal: () => void;
  onOpenGeminiModal: () => void;
  onSelectPreset: (presetId: string) => void;
  activeView: 'dashboard' | 'report' | 'map';
  setActiveView: (view: 'dashboard' | 'report' | 'map') => void;
  onFetchLiveData: () => void;
  isLiveLoading?: boolean;
  watchMode?: boolean;
  watchIntervalSec?: number;
  onToggleWatch?: () => void;
  onWatchIntervalChange?: (sec: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  report,
  currentScenarioTitle,
  onOpenDataModal,
  onOpenGeminiModal,
  onSelectPreset,
  activeView,
  setActiveView,
  onFetchLiveData,
  isLiveLoading,
  watchMode,
  watchIntervalSec = 300,
  onToggleWatch,
  onWatchIntervalChange,
}) => {
  const { executiveSummary } = report;

  const alert = nationalAlertToken(
    executiveSummary.affectedStatesCount,
    executiveSummary.generalBlackoutStatesCount,
  );

  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-line">
      {/* Fila 1 — identidad, estado y acciones */}
      <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0 shrink-0">
          <span className="w-9 h-9 bg-sev-blackout-surface rounded-control flex items-center justify-center border border-sev-blackout shrink-0">
            <span className="w-2.5 h-2.5 bg-sev-blackout rounded-full motion-safe:animate-pulse" />
          </span>
          <div className="min-w-0">
            <h1 className="text-body font-bold tracking-tight text-fg uppercase font-display leading-tight truncate">
              SEN Monitor{' '}
              <span className="text-fg-subtle font-normal text-label-sm">// IODA</span>
            </h1>
            <p className="text-label-sm font-mono text-fg-muted leading-tight truncate">
              SEN Venezuela · telemetría en vivo
            </p>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="hidden lg:flex gap-5 text-right font-mono">
            <div>
              <p className="text-label-sm text-fg-subtle uppercase tracking-wider leading-tight">
                Hora local
              </p>
              <p className="text-body font-mono text-info font-bold leading-tight">
                <LiveClock />
              </p>
            </div>
            <div>
              <p className="text-label-sm text-fg-subtle uppercase tracking-wider leading-tight">
                Nivel de alerta
              </p>
              <p className={`text-body font-mono font-bold leading-tight ${alert.fg}`}>
                <span aria-hidden="true">{alert.glyph} </span>
                {alert.label}
              </p>
            </div>
          </div>

          {/* Vigilancia */}
          <div
            className={`flex items-center overflow-hidden rounded-control border shrink-0 transition-colors duration-150 ${
              watchMode ? 'border-sev-moderate bg-sev-moderate-surface' : 'border-line bg-canvas'
            }`}
          >
            <button
              type="button"
              onClick={onToggleWatch}
              aria-pressed={!!watchMode}
              title="Vigilancia automática: consulta IODA cada N minutos y alerta cuando un estado cruza un umbral de severidad"
              className={`flex items-center gap-1.5 px-3 py-3 text-label font-mono transition-colors duration-150 ${
                watchMode ? 'text-sev-moderate font-bold' : 'text-fg-muted hover:bg-surface-raised'
              }`}
            >
              <Eye
                className={`w-3.5 h-3.5 shrink-0 ${watchMode ? 'motion-safe:animate-pulse' : ''}`}
                aria-hidden="true"
              />
              <span>{watchMode ? 'Vigilancia ON' : 'Vigilancia'}</span>
            </button>
            <label htmlFor="watch-interval" className="sr-only">
              Intervalo de sondeo de vigilancia
            </label>
            <select
              id="watch-interval"
              value={watchIntervalSec}
              onChange={(e) => onWatchIntervalChange?.(Number(e.target.value))}
              disabled={!watchMode}
              className={`bg-transparent border-l border-line text-label-sm font-mono py-3 pr-1 pl-2 cursor-pointer disabled:opacity-40 ${
                watchMode ? 'text-sev-moderate' : 'text-fg-subtle'
              }`}
            >
              <option value={60}>1 min</option>
              <option value={300}>5 min</option>
              <option value={900}>15 min</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onFetchLiveData}
            disabled={isLiveLoading}
            title="Obtener telemetría en vivo de IODA Georgia Tech"
            className="flex items-center gap-1.5 px-3 py-3 rounded-control shrink-0 bg-action-live hover:bg-action-live-hover disabled:opacity-50 text-action-live-ink font-semibold text-label transition-colors duration-150"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 shrink-0 ${isLiveLoading ? 'motion-safe:animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">{isLiveLoading ? 'Cargando…' : 'Datos en vivo'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenDataModal}
            title="Cargar un dataset de telemetría en JSON"
            className="flex items-center gap-1.5 px-3 py-3 rounded-control shrink-0 bg-canvas border border-line text-label text-fg-muted hover:bg-surface-raised hover:border-line-strong hover:text-fg transition-colors duration-150"
          >
            <Database className="w-3.5 h-3.5 shrink-0 text-info" aria-hidden="true" />
            <span className="hidden md:inline">Datos JSON</span>
          </button>

          <button
            type="button"
            onClick={onOpenGeminiModal}
            title="Abrir el analista asistido por IA"
            className="flex items-center gap-1.5 px-3 py-3 rounded-control shrink-0 bg-action-primary hover:bg-action-primary-hover text-action-primary-ink font-semibold text-label transition-colors duration-150"
          >
            <Bot className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Analista IA</span>
          </button>
        </div>
      </div>

      {/* Fila 2 — qué se está mirando. Su propio espacio, con scroll
          horizontal en pantallas estrechas en vez de solaparse. */}
      <div className="border-t border-line bg-canvas">
        <div className="max-w-7xl mx-auto flex items-center gap-3 px-4 py-2 overflow-x-auto">
          <div className="relative flex items-center min-w-0 shrink-0">
            <label htmlFor="scenario-select" className="sr-only">
              Escenario de telemetría activo
            </label>
            <select
              id="scenario-select"
              value={
                INCIDENT_PRESETS.find((p) => p.title === currentScenarioTitle)?.id || 'custom'
              }
              onChange={(e) => {
                if (e.target.value === 'custom') onOpenDataModal();
                else onSelectPreset(e.target.value);
              }}
              className="appearance-none bg-surface border border-line text-label font-mono text-fg rounded-control pl-3 pr-9 py-2 cursor-pointer max-w-[240px] truncate"
            >
              {INCIDENT_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
              <option value="custom">Dataset personalizado…</option>
            </select>
            <ChevronDown
              className="w-3.5 h-3.5 text-fg-muted absolute right-3 pointer-events-none"
              aria-hidden="true"
            />
          </div>

          <div
            role="tablist"
            aria-label="Vista del panel"
            className="flex p-1 bg-surface border border-line rounded-control text-label gap-0.5 shrink-0"
          >
            {(
              [
                ['dashboard', 'Dashboard'],
                ['map', 'Mapa & Telemetría'],
                ['report', 'Reporte'],
              ] as const
            ).map(([view, label]) => (
              <button
                key={view}
                type="button"
                role="tab"
                aria-selected={activeView === view}
                onClick={() => setActiveView(view)}
                className={`px-3 py-1.5 rounded-control font-medium whitespace-nowrap transition-colors duration-150 ${
                  activeView === view
                    ? 'bg-surface-raised text-fg border border-line-strong'
                    : 'border border-transparent text-fg-muted hover:text-fg hover:bg-surface'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
