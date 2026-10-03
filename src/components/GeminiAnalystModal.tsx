import React, { useState } from 'react';
import { useModalDialog } from './useModalDialog';
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

  const dialogRef = useModalDialog<HTMLDivElement>(isOpen, onClose);

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gemini-dialog-ref"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-surface border border-line rounded-card shadow-overlay overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-surface border-b border-line">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-control bg-info-surface border-info text-info">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="gemini-dialog-ref" className="text-label font-bold text-fg uppercase font-mono tracking-wider">
                  Analista Senior de Redes e Infraestructura SEN
                </h3>
                <span className="text-label-sm font-mono font-bold bg-info-surface text-info border-info px-2 py-0.5 rounded-control">
                  Gemini 3.7 Flash
                </span>
              </div>
              <p className="text-label text-fg-muted font-mono">
                Razonamiento asistido sobre topología del SEN, subestaciones y telemetría IODA
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono">
          {/* Quick Action Prompt Chips */}
          <div className="space-y-2">
            <span className="text-label-sm text-fg-muted uppercase tracking-wider">
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
                    className="p-3 rounded-card bg-canvas border border-line hover:border-sev-blackout hover:bg-surface-raised text-left transition-colors duration-150 flex items-start gap-2.5 group"
                  >
                    <div className="p-1.5 rounded-control bg-surface border border-line text-info group-hover:text-sev-blackout">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-label font-bold text-fg group-hover:text-fg font-mono uppercase">
                        {qp.title}
                      </div>
                      <div className="text-label-sm text-fg-muted line-clamp-1 font-sans">{qp.prompt}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Response Area */}
          {loading ? (
            <div className="p-8 rounded-card bg-canvas border border-line flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="w-6 h-6 text-sev-blackout animate-spin" />
              <div className="text-label font-mono text-fg uppercase">
                Analizando topología de 765kV, nodos de subestación y dinámica de red...
              </div>
              <div className="text-label-sm text-fg-muted font-mono">
                Consultando modelo Gemini 3.7 Flash server-side
              </div>
            </div>
          ) : errorMsg ? (
            <div className="p-4 rounded-card bg-sev-blackout/10 border border-sev-blackout text-sev-blackout text-label font-mono">
              <strong>Error:</strong> {errorMsg}
            </div>
          ) : responseHtml ? (
            <div className="p-5 rounded-card bg-canvas border border-line text-label leading-relaxed space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2 text-info font-mono text-label-sm uppercase">
                <span className="flex items-center gap-1.5 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-sev-moderate" /> Dictamen del Analista Eléctrico
                </span>
                <span>Hora: {formatVETClock(nowTs)}</span>
              </div>
              <div className="text-fg text-label whitespace-pre-wrap font-sans leading-relaxed">
                {responseHtml}
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-card bg-canvas border border-line text-center text-label text-fg-muted font-mono">
              Selecciona una de las consultas de ingeniería eléctrica anteriores o formula una pregunta técnica abajo.
            </div>
          )}
        </div>

        {/* Query Input Footer */}
        <div className="p-4 bg-surface border-t border-line flex gap-2 font-mono">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
            placeholder="Escribe una consulta técnica sobre el SEN, subestaciones o telemetría..."
            className="flex-1 px-4 py-2 rounded-control bg-canvas border border-line text-label text-fg placeholder:text-fg-subtle"
          />
          <button
            type="button"
            onClick={() => handleAskAI()}
            disabled={loading || !query.trim()}
            className="px-5 py-2 rounded-control bg-action-primary hover:bg-action-primary-hover disabled:opacity-50 text-action-primary-ink font-bold text-label uppercase flex items-center gap-2 transition-colors duration-150"
          >
            <Send className="w-3.5 h-3.5" />
            Consultar
          </button>
        </div>
      </div>
    </div>
  );
};
