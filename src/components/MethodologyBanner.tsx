import React, { useState, useId } from 'react';
import { ChevronDown, ChevronUp, ShieldCheck, Zap, TriangleAlert } from 'lucide-react';
import { SEVERITY_THRESHOLD_COPY, severityToken } from '../design/severity';

export const MethodologyBanner: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const panelId = useId();

  return (
    <section className="bg-surface border border-line rounded-card text-body overflow-hidden">
      {/* Disclosure real: antes era un div con onClick, inalcanzable por
          teclado y sin estado anunciado. */}
      <h2>
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          aria-expanded={isExpanded}
          aria-controls={panelId}
          className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-surface-raised transition-colors duration-150"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 rounded-control bg-sev-blackout-surface border border-sev-blackout text-sev-blackout shrink-0">
              <Zap className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
            <span className="font-semibold text-fg font-mono tracking-tight text-label truncate">
              Metodología de inferencia SEN // IODA
            </span>
            <span className="text-label-sm text-fg-muted font-mono hidden lg:inline">
              [ Active Probing + Darknet Telescope + BGP ]
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-fg-muted text-label font-mono shrink-0">
            <span className="hidden sm:inline">
              {isExpanded ? 'Ocultar parámetros' : 'Ver reglas y umbrales'}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            )}
          </span>
        </button>
      </h2>

      {isExpanded && (
        <div
          id={panelId}
          className="px-4 py-4 bg-canvas border-t border-line grid grid-cols-1 md:grid-cols-3 gap-4 text-body leading-relaxed text-fg-muted"
        >
          {/* Las tres caras del método. Sin numeración: no son pasos que
              haya que seguir en orden, sino facetas que se leen juntas. */}
          <div className="space-y-2">
            <h3 className="font-semibold text-info flex items-center gap-1.5 font-mono text-label">
              <Zap className="w-3.5 h-3.5" aria-hidden="true" />
              Relación internet-electricidad
            </h3>
            <p>
              Una caída abrupta y simultánea en las métricas de{' '}
              <strong className="text-fg">Active Probing (/24s)</strong> y{' '}
              <strong className="text-fg">Darknet Telescope (ucsd-nt)</strong> en una región
              específica indica pérdida de energía en repetidoras, cabeceras OLT y routers
              residenciales.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sev-moderate flex items-center gap-1.5 font-mono text-label">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              Umbrales de detección
            </h3>
            {/* Los umbrales salen de la misma fuente que el clasificador,
                así que la metodología no puede mentir sobre las reglas. */}
            <dl className="space-y-1.5 font-mono text-label">
              {SEVERITY_THRESHOLD_COPY.map(({ severity, text }) => {
                const token = severityToken(severity);
                return (
                  <div key={severity} className="flex gap-2">
                    <dt className={`shrink-0 ${token.fg}`}>
                      <span aria-hidden="true">{token.glyph} </span>
                      {token.label}:
                    </dt>
                    <dd>{text}</dd>
                  </div>
                );
              })}
            </dl>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sev-blackout flex items-center gap-1.5 font-mono text-label">
              <TriangleAlert className="w-3.5 h-3.5" aria-hidden="true" />
              Restricciones y filtros
            </h3>
            <ul className="space-y-1.5 list-disc pl-4 marker:text-fg-subtle">
              <li>
                <strong className="text-fg">Filtro de madrugada:</strong> no se confunde una
                variación nocturna (01:00–06:00 VET) con una falla del SEN, a menos que el drop
                supere el <strong className="text-sev-moderate">40% instantáneo</strong>.
              </li>
              <li>
                <strong className="text-fg">Filtro de ISP aislado:</strong> se excluyen las
                caídas de un solo operador si el resto de las métricas BGP y Active Probing del
                estado se mantienen estables.
              </li>
            </ul>
          </div>
        </div>
      )}
    </section>
  );
};