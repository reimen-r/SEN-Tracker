import React, { useState } from 'react';
import { OutageReport } from '../types';
import { Bot, Send, Sparkles, X, Zap, Cpu, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { formatVETClock } from '../utils/time';

interface GeminiAnalystModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: OutageReport;
}

export const GeminiAnalystModal: React.FC<GeminiAnalystModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [responseHtml, setResponseHtml] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [nowTs] = useState<number>(() => Math.floor(Date.now() / 1000));

  if (!isOpen) return null;

  const handleAskAI = async (customPrompt?: string) => {
    const promptToUse = customPrompt || query;
    if (!promptToUse.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/analyze-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportContext: {
            executiveSummary: report.executiveSummary,
            recoveryAnalysis: report.recoveryAnalysis,
            topAffectedStates: report.stateClassifications
              .filter((s) => s.severity !== 'NORMALIDAD')
              .slice(0, 8)
              .map((s) => ({
                state: s.entity.name,
                code: s.entity.code,
                drop: s.dropPercentage,
                severity: s.severity,
                substations: s.entity.criticalSubstations,
                lines: s.entity.keyTransmissionLines,
              })),
          },
          userQuery: promptToUse,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al comunicarse con el servidor.');
      }

      setResponseHtml(data.analysis);
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo generar el análisis.');
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    {
      title: 'Diagnóstico Causa Raíz (765kV / Guri)',
      prompt:
        'Explica la física eléctrica y la secuencia de eventos más probable (líneas de 765kV, subestaciones Malena / San Gerónimo / Arenosa, desbalance de frecuencia en Guri) que justifican este patrón telemétrico.',
      icon: Zap,
    },
    {
      title: 'Estimación de Tiempo de Restitución',
      prompt:
        'Basado en la curva de recuperación y los estados afectados, evalúa el tiempo estimado de sincronización de turbinas, energización de reactores y retorno total a 60 Hz.',
      icon: Clock,
    },
    {
      title: 'Boletín Técnico para Ingenieros de Red',
      prompt:
        'Genera un informe técnico formal dirigido a operadores de red y telecomunicaciones con métricas de pérdida de paquetes, telemetría BGP y estado de alimentación de repetidoras.',
      icon: Cpu,
    },
    {
      title: 'Aviso Público y Medidas de Protección',
      prompt:
        'Redacta un comunicado claro para la ciudadanía sobre el estado del suministro, recomendaciones de conservación de agua, protección contra sobrevoltaje y optimización de carga de dispositivos.',
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0c0e12]/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#161b22] border border-slate-700/50 rounded shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#161b22] border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-blue-500/20 border border-blue-500/40 text-blue-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Analista Senior de Redes e Infraestructura SEN
                </h3>
                <span className="text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded">
                  Gemini 3.7 Flash
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Razonamiento asistido sobre topología del SEN, subestaciones y telemetría IODA
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono">
          {/* Quick Action Prompt Chips */}
          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
              Análisis Especializados Rápidos:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickPrompts.map((qp, idx) => {
                const Icon = qp.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuery(qp.prompt);
                      handleAskAI(qp.prompt);
                    }}
                    className="p-3 rounded bg-[#0c0e12] border border-slate-700/50 hover:border-red-500 hover:bg-[#1c2128] text-left transition-all flex items-start gap-2.5 group"
                  >
                    <div className="p-1.5 rounded bg-[#161b22] border border-slate-700/50 text-blue-400 group-hover:text-red-400">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200 group-hover:text-white font-mono uppercase">
                        {qp.title}
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-1 font-sans">{qp.prompt}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Response Area */}
          {loading ? (
            <div className="p-8 rounded bg-[#0c0e12] border border-slate-700/50 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="w-6 h-6 text-red-400 animate-spin" />
              <div className="text-xs font-mono text-white uppercase">
                Analizando topología de 765kV, nodos de subestación y dinámica de red...
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Consultando modelo Gemini 3.7 Flash server-side
              </div>
            </div>
          ) : errorMsg ? (
            <div className="p-4 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono">
              <strong>Error:</strong> {errorMsg}
            </div>
          ) : responseHtml ? (
            <div className="p-5 rounded bg-[#0c0e12] border border-slate-700/50 text-xs leading-relaxed space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-blue-400 font-mono text-[10px] uppercase">
                <span className="flex items-center gap-1.5 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Dictamen del Analista Eléctrico
                </span>
                <span>Hora VET: {formatVETClock(nowTs)}</span>
              </div>
              <div className="text-slate-200 text-xs whitespace-pre-wrap font-sans leading-relaxed">
                {responseHtml}
              </div>
            </div>
          ) : (
            <div className="p-6 rounded bg-[#0c0e12] border border-slate-700/50 text-center text-xs text-slate-400 font-mono">
              Selecciona una de las consultas de ingeniería eléctrica anteriores o formula una pregunta técnica abajo.
            </div>
          )}
        </div>

        {/* Query Input Footer */}
        <div className="p-4 bg-[#161b22] border-t border-slate-700/50 flex gap-2 font-mono">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
            placeholder="Escribe una consulta técnica sobre el SEN, subestaciones o telemetría..."
            className="flex-1 px-4 py-2 rounded bg-[#0c0e12] border border-slate-700/50 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <button
            type="button"
            onClick={() => handleAskAI()}
            disabled={loading || !query.trim()}
            className="px-5 py-2 rounded bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold text-xs uppercase flex items-center gap-2 transition-all shadow-md"
          >
            <Send className="w-3.5 h-3.5" />
            Consultar
          </button>
        </div>
      </div>
    </div>
  );
};
