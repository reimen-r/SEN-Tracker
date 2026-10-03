import React from 'react';
import { Clock, RotateCcw } from 'lucide-react';
import type { OutageReport } from '../types';
import { SEVERITY_ORDER, nationalAlertToken, severityToken } from '../design/severity';
import { RecoveryNote } from './RecoveryNote';

interface SeverityDistributionProps {
  report: OutageReport;
}

/**
 * Lectura nacional de un vistazo.
 *
 * Antes eran cinco tarjetas con el patrón "etiqueta pequeña encima de número
 * grande", que el craft-floor marca como default perezoso: el mismo esqueleto
 * cinco veces, y sobre todo perdía la única cosa que un operador necesita
 * responder de inmediato — ¿esto es un estado o es el país?—. Cinco números
 * sueltos no dan la proporción; una barra apilada sí, y de paso da los
 * conteos.
 *
 * La barra es decorativa (`aria-hidden`); los conteos viven en texto visible,
 * así que un lector de pantalla recibe exactamente la misma información.
 */
export const SeverityDistribution: React.FC<SeverityDistributionProps> = ({ report }) => {
  const { executiveSummary, recoveryAnalysis, stateClassifications } = report;

  // Se cuenta sobre las clasificaciones reales, no sobre un campo agregado:
  // así el desglose y la tabla de estados no pueden contradecirse.
  const counts = stateClassifications.reduce<Record<string, number>>(
    (acc, s) => {
      acc[s.severity] = (acc[s.severity] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const total = Math.max(stateClassifications.length, 1);
  const affected = executiveSummary.affectedStatesCount;
  const affectedPct = Math.round((affected / total) * 100);

  const alert = nationalAlertToken(
    executiveSummary.affectedStatesCount,
    executiveSummary.generalBlackoutStatesCount,
  );

  return (
    <section aria-labelledby="dist-titulo" className="no-print bg-surface border border-line rounded-card">
      {/* Distribución por severidad */}
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
          <h2
            id="dist-titulo"
            className="text-body font-semibold text-fg tracking-tight"
          >
            Distribución nacional
          </h2>
          <p className="text-label font-mono text-fg-muted">
            <span className={`${alert.fg} font-semibold`}>
              {affected} de {executiveSummary.totalStatesAnalyzed}
            </span>{' '}
            entidades afectadas · {affectedPct}%
          </p>
        </div>

        <div
          aria-hidden="true"
          className="h-2.5 w-full rounded-full overflow-hidden bg-canvas flex gap-0.5"
        >
          {SEVERITY_ORDER.map((sev) => {
            const n = counts[sev] ?? 0;
            if (n <= 0) return null;
            return (
              <div
                key={sev}
                style={{
                  width: `${(n / total) * 100}%`,
                  backgroundColor: severityToken(sev).mapFill,
                }}
                className="h-full first:rounded-l-full last:rounded-r-full"
              />
            );
          })}
        </div>

        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
          {SEVERITY_ORDER.map((sev) => {
            const token = severityToken(sev);
            const n = counts[sev] ?? 0;
            return (
              <li key={sev} className="flex items-center gap-1.5 text-label font-mono">
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                  style={{ backgroundColor: token.mapFill }}
                />
                <span className="text-fg-muted">{token.label}</span>
                <span className={`font-semibold tabular-nums ${token.fg}`}>{n}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Momento del evento y estado de restitución: no son contadores,
          son tiempo y estado, así que van aparte y con su propio formato. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 border-t border-line divide-y sm:divide-y-0 sm:divide-x divide-line">
        <div className="p-4">
          <h3 className="flex items-center gap-1.5 text-label-sm uppercase tracking-wider text-fg-subtle font-mono mb-1.5">
            <Clock className="w-3.5 h-3.5 text-info" aria-hidden="true" />
            Inicio de la falla
          </h3>
          {/* formatVET ya devuelve "HH:mm VET": añadir la zona otra vez
              producía "16:45 VET VET". */}
          <p className="text-metric font-bold text-info font-mono tabular-nums leading-none">
            {executiveSummary.estimatedOnsetVET}
          </p>
        </div>

        <div className="p-4">
          <h3 className="flex items-center gap-1.5 text-label-sm uppercase tracking-wider text-fg-subtle font-mono mb-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-sev-moderate" aria-hidden="true" />
            Recuperación
          </h3>
          <RecoveryNote recoveryType={recoveryAnalysis.recoveryType} className="text-body" />
        </div>
      </div>
    </section>
  );
};