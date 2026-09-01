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

  const alertStatusText =
    executiveSummary.generalBlackoutStatesCount >= 5
      ? 'CRÍTICO'
      : executiveSummary.affectedStatesCount >= 3
      ? 'MODERADO'
      : 'NORMALIDAD';

  const alertStatusColor =
    executiveSummary.generalBlackoutStatesCount >= 5
      ? 'text-red-500'
      : executiveSummary.affectedStatesCount >= 3
      ? 'text-orange-400'
      : 'text-green-500';

  return (
    <header className="sticky top-0 z-40 bg-[#161b22] border-b border-slate-700/50 backdrop-blur-xl px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Live Pulse */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 bg-red-500/20 rounded flex items-center justify-center border border-red-500/40 shrink-0">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-500"></div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white uppercase font-display">
                SEN MONITOR <span className="text-slate-500 font-normal">// IODA INFRASTRUCTURE</span>
              </h1>
            </div>
            <p className="text-[10px] font-mono text-slate-400 tracking-wide">
              VENEZUELA - SISTEMA ELÉCTRICO NACIONAL - LIVE FEED
            </p>
          </div>
        </div>

        {/* Center / Scenario Quick Switcher & Views */}
        <div className="flex items-center gap-2.5">
          {/* Quick Scenario Dropdown */}
          <div className="relative flex items-center">
            <select
              value={
                INCIDENT_PRESETS.find((p) => p.title === currentScenarioTitle)?.id || 'custom'
              }
              onChange={(e) => {
                if (e.target.value === 'custom') onOpenDataModal();
                else onSelectPreset(e.target.value);
              }}
              className="appearance-none bg-[#0c0e12] border border-slate-700/50 text-xs font-mono text-slate-200 rounded px-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer max-w-[220px] truncate"
            >
              {INCIDENT_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
              <option value="custom">⚙️ Dataset Personalizado...</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
          </div>

          {/* View Mode Buttons */}
          <div className="hidden sm:flex p-0.5 bg-[#0c0e12] border border-slate-700/50 rounded text-xs">
            <button
              type="button"
              onClick={() => setActiveView('dashboard')}
              className={`px-3 py-1 rounded font-medium transition-all ${
                activeView === 'dashboard'
                  ? 'bg-[#1c2128] text-white shadow-sm border border-slate-600/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => setActiveView('map')}
              className={`px-3 py-1 rounded font-medium transition-all ${
                activeView === 'map'
                  ? 'bg-[#1c2128] text-white shadow-sm border border-slate-600/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mapa & Telemetría
            </button>
            <button
              type="button"
              onClick={() => setActiveView('report')}
              className={`px-3 py-1 rounded font-medium transition-all ${
                activeView === 'report'
                  ? 'bg-[#1c2128] text-white shadow-sm border border-slate-600/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Reporte Estructurado
            </button>
          </div>
        </div>

        {/* Right Status (Live Time & Alert Level & Actions) */}
        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-6 text-right font-mono">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Hora Local (VET)</p>
              <p className="text-sm font-mono text-blue-400 font-bold">
                <LiveClock /> <span className="text-[10px] font-normal text-slate-400">UTC-4</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Nivel de Alerta</p>
              <p className={`text-sm font-mono font-bold ${alertStatusColor}`}>
                {alertStatusText}
              </p>
            </div>
          </div>

          {/* Action Modals Trigger */}
          <div className="flex items-center gap-2">
            {/* Modo Vigilancia */}
            <div
              className={`flex items-center overflow-hidden rounded border transition-all ${
                watchMode
                  ? 'border-amber-500/50 bg-amber-500/10'
                  : 'border-slate-700/60 bg-[#0c0e12]'
              }`}
              title="Vigilancia automática: consulta telemetría en vivo cada N minutos y alerta cuando un estado cruza un umbral de severidad"
            >
              <button
                type="button"
                onClick={onToggleWatch}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono transition-all ${
                  watchMode ? 'text-amber-300 font-bold' : 'text-slate-300 hover:bg-[#1c2128]'
                }`}
              >
                <Eye className={`w-3.5 h-3.5 ${watchMode ? 'animate-pulse' : ''}`} />
                <span>{watchMode ? 'Vigilancia ON' : 'Vigilancia'}</span>
              </button>
              <select
                value={watchIntervalSec}
                onChange={(e) => onWatchIntervalChange?.(Number(e.target.value))}
                disabled={!watchMode}
                className={`bg-transparent border-l border-slate-700/50 text-[10px] font-mono py-1.5 pr-1 pl-1.5 focus:outline-none cursor-pointer disabled:opacity-40 ${
                  watchMode ? 'text-amber-300' : 'text-slate-500'
                }`}
              >
                <option value={60}>1min</option>
                <option value={300}>5min</option>
                <option value={900}>15min</option>
              </select>
            </div>

            <button
              type="button"
              onClick={onFetchLiveData}
              disabled={isLiveLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-950/50 transition-all"
              title="Obtener telemetría en vivo de IODA Georgia Tech"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLiveLoading ? 'animate-spin' : ''}`} />
              <span>{isLiveLoading ? 'Cargando...' : 'Datos en Vivo'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenDataModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0c0e12] border border-slate-700/60 text-xs font-mono text-slate-300 hover:bg-[#1c2128] hover:border-slate-500 transition-all"
            >
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>Datos JSON</span>
            </button>

            <button
              type="button"
              onClick={onOpenGeminiModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-950/50 transition-all"
            >
              <Bot className="w-3.5 h-3.5 text-white" />
              <span>Analista IA</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
