import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ShieldCheck, Zap, AlertTriangle } from 'lucide-react';

export const MethodologyBanner: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <div className="bg-[#161b22] border border-slate-700/50 rounded text-xs overflow-hidden">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-[#1c2128] transition-colors"
      >
        <div className="flex items-center gap-2.5 text-slate-300">
          <div className="p-1 rounded bg-red-500/20 border border-red-500/40 text-red-400">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-slate-100 font-mono tracking-tight">
            METODOLOGÍA DE INFERENCIA DE APAGONES SEN // IODA GEORGIA TECH
          </span>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            [ ACTIVE PROBING + DARKNET TELESCOPE + BGP ]
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-[11px] font-mono">
          <span>{isExpanded ? 'OCULTAR PARÁMETROS' : 'VER REGLAS Y UMBRALES'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 py-3 bg-[#0c0e12] border-t border-slate-700/50 grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] leading-relaxed text-slate-300">
          {/* Column 1 */}
          <div className="space-y-1.5 p-3 rounded bg-[#161b22] border border-slate-700/50">
            <div className="font-bold text-blue-400 flex items-center gap-1.5 font-mono">
              <Zap className="w-3.5 h-3.5" /> 1. RELACIÓN INTERNET-ELECTRICIDAD
            </div>
            <p className="text-slate-400">
              Una caída abrupta y simultánea en las métricas de <strong className="text-slate-200">Active Probing (/24s)</strong> y{' '}
              <strong className="text-slate-200">Darknet/Telescope (ucsd-nt)</strong> en una región específica indica pérdida de energía en repetidoras, cabeceras OLT y routers residenciales.
            </p>
          </div>

          {/* Column 2 */}
          <div className="space-y-1.5 p-3 rounded bg-[#161b22] border border-slate-700/50">
            <div className="font-bold text-amber-400 flex items-center gap-1.5 font-mono">
              <ShieldCheck className="w-3.5 h-3.5" /> 2. UMBRALES DE DETECCIÓN
            </div>
            <ul className="space-y-1 font-mono text-[10px]">
              <li><strong className="text-emerald-400">Normalidad:</strong> Variación semanal 90% - 100% de señal.</li>
              <li><strong className="text-amber-400">Evento Moderado:</strong> Drop de 25% a 50% (Corte Sectorial).</li>
              <li><strong className="text-orange-400">Evento Crítico:</strong> Drop de 51% a 80% (Apagón Estatal).</li>
              <li><strong className="text-red-400">Apagón General:</strong> Drop &gt;80% (Colapso Subestación / Red Troncal).</li>
            </ul>
          </div>

          {/* Column 3 */}
          <div className="space-y-1.5 p-3 rounded bg-[#161b22] border border-slate-700/50">
            <div className="font-bold text-red-400 flex items-center gap-1.5 font-mono">
              <AlertTriangle className="w-3.5 h-3.5" /> 3. RESTRICCIONES Y FILTROS
            </div>
            <p className="text-slate-400">
              • <strong className="text-slate-200">Filtro de Madrugada:</strong> No se confunden variaciones nocturnas (01:00-06:00 VET) con fallas del SEN a menos que el drop supere el <strong className="text-amber-400">40% instantáneo</strong>.
            </p>
            <p className="text-slate-400">
              • <strong className="text-slate-200">Filtro de ISP Aislado:</strong> Se excluyen caídas de un solo operador si el resto de las métricas BGP y Active Probing del estado se mantienen estables.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
