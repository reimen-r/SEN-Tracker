import React, { useState } from 'react';
import { OutageReport } from '../types';
import { SeverityBadge } from './SeverityBadge';
import {
  FileText,
  Copy,
  Check,
  Download,
  Zap,
  RefreshCw,
  Search,
  FileJson,
  FileSpreadsheet,
  Printer,
  X,
} from 'lucide-react';
import { downloadCsv, downloadJson } from '../utils/export';
import { renderBroadcastText } from '../services/proseRenderer';
import { RecoveryNote } from './RecoveryNote';
import {
  SEVERITY_ORDER,
  nationalAlertToken,
  severityFromDrop,
  severityToken,
} from '../design/severity';

interface ReportViewProps {
  report: OutageReport;
  onSelectState: (stateId: string) => void;
  selectedStateId: string | null;
}

export const ReportView: React.FC<ReportViewProps> = ({
  report,
  onSelectState,
  selectedStateId,
}) => {
  const [activeTab, setActiveTab] = useState<'structured' | 'markdown' | 'broadcast'>('structured');
  const [copied, setCopied] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const hasActiveFilter = searchFilter.trim() !== '' || severityFilter !== 'ALL';

  const { executiveSummary, stateClassifications, recoveryAnalysis, alertRecommendation } = report;
  const alert = nationalAlertToken(
    executiveSummary.affectedStatesCount,
    executiveSummary.generalBlackoutStatesCount,
  );
  const reportDate = new Date(report.timestampAnalyzed).toISOString().slice(0, 10);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([report.markdownText], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `Reporte_SEN_IODA_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleExportJson = () => {
    downloadJson(`reporte_SEN_IODA_${reportDate}.json`, report);
  };

  const handleExportSummaryCsv = () => {
    const rows: (string | number)[][] = [
      ['codigo', 'estado', 'caidaPct', 'severidad', 'inicioVET', 'recuperacion'],
      ...report.stateClassifications.map((s) => [
        s.entity.code,
        s.entity.name,
        s.dropPercentage,
        s.severity,
        s.anomalyStartVET || 'N/A',
        s.recoveryType,
      ]),
    ];
    downloadCsv(`resumen_estados_SEN_${reportDate}.csv`, rows);
  };

  const filteredStates = stateClassifications.filter((st) => {
    const matchesSearch =
      st.entity.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      st.entity.code.toLowerCase().includes(searchFilter.toLowerCase()) ||
      st.interpretation.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesSeverity =
      severityFilter === 'ALL' ||
      (severityFilter === 'AFFECTED' && st.severity !== 'NORMALIDAD') ||
      st.severity === severityFilter;

    return matchesSearch && matchesSeverity;
  });

  // Formato Telegram / WhatsApp producido por el mismo renderer que el markdown.
  const telegramBroadcastText = renderBroadcastText(report);

  return (
    <div className="flex flex-col h-full bg-surface border border-line rounded-card overflow-hidden shadow-raised">
      {/* Header with Tabs & Export Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-surface border-b border-line">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-control bg-sev-normal/20 border border-sev-normal text-sev-normal">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-label font-bold text-fg uppercase font-mono tracking-wider flex items-center gap-2">
              Reporte Estructurado de Inferencia SEN
            </h3>
            <p className="text-label text-fg-muted font-mono">
              Evaluación metódica según umbrales de Active Probing y Darknet Telescope
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex p-0.5 bg-canvas border border-line rounded-control text-label font-mono">
            <button
              type="button"
              onClick={() => setActiveTab('structured')}
              className={`px-3 py-1 rounded-control transition-colors duration-150 ${ activeTab === 'structured' ? 'bg-surface-raised text-fg border border-line-strong' : 'text-fg-muted hover:text-fg' }`}
            >
              Vista Ejecutiva
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('markdown')}
              className={`px-3 py-1 rounded-control transition-colors duration-150 ${ activeTab === 'markdown' ? 'bg-surface-raised text-fg border border-line-strong' : 'text-fg-muted hover:text-fg' }`}
            >
              Texto Markdown
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('broadcast')}
              className={`px-3 py-1 rounded-control transition-colors duration-150 ${ activeTab === 'broadcast' ? 'bg-surface-raised text-fg border border-line-strong' : 'text-fg-muted hover:text-fg' }`}
            >
              Alerta Comunitaria
            </button>
          </div>

          {/* Copy & Download */}
          <button
            type="button"
            onClick={() => handleCopy(activeTab === 'broadcast' ? telegramBroadcastText : report.markdownText)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-control bg-canvas border border-line text-label font-mono text-fg-muted hover:bg-surface-raised hover:border-line-strong transition-colors duration-150"
            title="Copiar contenido"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-sev-normal" /> : <Copy className="w-3.5 h-3.5 text-fg-muted" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-control bg-canvas border border-line text-label font-mono text-fg-muted hover:bg-surface-raised hover:border-line-strong transition-colors duration-150"
            title="Descargar Markdown"
          >
            <Download className="w-3.5 h-3.5 text-fg-muted" />
            Descargar
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-control bg-canvas border border-line text-label font-mono text-fg-muted hover:bg-surface-raised hover:border-line-strong transition-colors duration-150"
            title="Descargar reporte completo en JSON"
          >
            <FileJson className="w-3.5 h-3.5 text-fg-muted" />
            JSON
          </button>
          <button
            type="button"
            onClick={handleExportSummaryCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-control bg-canvas border border-line text-label font-mono text-fg-muted hover:bg-surface-raised hover:border-line-strong transition-colors duration-150"
            title="Descargar resumen por estado en CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-sev-normal" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-control bg-canvas border border-line text-label font-mono text-fg-muted hover:bg-surface-raised hover:border-line-strong transition-colors duration-150"
            title="Imprimir o exportar a PDF (fondo claro)"
          >
            <Printer className="w-3.5 h-3.5 text-fg-muted" />
            Imprimir
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'structured' ? (
          <>
            {/* 1. Resumen Ejecutivo */}
            <div className="p-4 rounded-card bg-canvas border border-line space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-control bg-info-surface border border-info text-info font-mono text-label font-bold">
                    1
                  </span>
                  <h4 className="text-label font-bold uppercase tracking-wider text-fg font-mono">
                    Resumen Ejecutivo
                  </h4>
                </div>
                <span className="text-label font-mono text-fg-muted">
                  Hora Inicio: <strong className="text-info">{executiveSummary.estimatedOnsetVET}</strong>
                </span>
              </div>

              {/* Status Banner */}
              <div
                className={`p-3 rounded-card border text-label font-mono ${alert.surface} ${alert.border} ${alert.fg}`}
              >
                <div className="font-bold text-sm mb-1 flex items-center gap-2 uppercase">
                  <Zap className="w-4 h-4" />
                  {executiveSummary.generalStatus}
                </div>
                <p className="text-fg-muted leading-relaxed font-sans">
                  {executiveSummary.primaryHypothesis}
                </p>
              </div>

              {/* Key Metric Grid */}
              {/* Métricas en línea, no en tarjetas: la proporción ya la da
                  el panel de distribución nacional de arriba, así que aquí
                  solo hacen falta las cifras que aún no se han visto. */}
              <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-2 pt-1 font-mono">
                {(
                  [
                    ['Afectados', `${executiveSummary.affectedStatesCount}/${executiveSummary.totalStatesAnalyzed}`, 'text-fg'],
                    ['Apagón general', String(executiveSummary.generalBlackoutStatesCount), 'text-sev-blackout'],
                    ['Críticos', String(executiveSummary.criticalStatesCount), 'text-sev-critical'],
                    ['Caída media', `−${executiveSummary.nationalConnectivityDropPct}%`, 'text-sev-moderate'],
                  ] as const
                ).map(([label, value, tone]) => (
                  <div key={label} className="flex items-baseline gap-2">
                    <dt className="text-label-sm text-fg-subtle">{label}</dt>
                    <dd className={`text-body font-semibold tabular-nums ${tone}`}>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* 2. Clasificación por Estado */}
            <div className="p-4 rounded-card bg-canvas border border-line space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-control bg-info-surface border border-info text-info font-mono text-label font-bold">
                    2
                  </span>
                  <h4 className="text-label font-bold uppercase tracking-wider text-fg font-mono">
                    Clasificación por Estado
                  </h4>
                </div>

                {/* Filtro y búsqueda. Ambos controles llevan etiqueta
                    visible: un placeholder no es una etiqueta, y un
                    selector sin nombre no lo anuncia un lector de pantalla. */}
                <div className="flex items-end gap-3 text-label font-mono flex-wrap">
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="state-search"
                      className="text-label-sm text-fg-subtle uppercase tracking-wider"
                    >
                      Buscar estado
                    </label>
                    <div className="relative">
                      <Search
                        className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted"
                        aria-hidden="true"
                      />
                      <input
                        id="state-search"
                        type="search"
                        placeholder="Nombre, código o interpretación"
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        className="bg-surface border border-line rounded-control pl-8 pr-2.5 py-1.5 text-label text-fg placeholder:text-fg-subtle"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="severity-filter"
                      className="text-label-sm text-fg-subtle uppercase tracking-wider"
                    >
                      Severidad
                    </label>
                    <select
                      id="severity-filter"
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value)}
                      className="bg-surface border border-line rounded-control px-2.5 py-1.5 text-label text-fg-muted"
                    >
                      <option value="ALL">Todos los estados</option>
                      <option value="AFFECTED">Solo afectados (≥25%)</option>
                      {SEVERITY_ORDER.map((sev) => (
                        <option key={sev} value={sev}>
                          {severityToken(sev).labelWithThreshold}
                        </option>
                      ))}
                    </select>
                  </div>
                  {hasActiveFilter && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchFilter('');
                        setSeverityFilter('ALL');
                      }}
                      className="flex items-center gap-1.5 rounded-control border border-line bg-canvas px-2.5 py-1.5 text-label text-fg-muted hover:bg-surface-raised hover:text-fg transition-colors"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              {/* Tabla de clasificación. Cada fila es operable: antes sólo tenía
                  onClick, así que un operador de teclado no podía seleccionar
                  un estado desde el reporte. El botón real de la primera
                  celda da el nombre accesible y el foco; la fila entera
                  amplía el área sensible sin duplicar el control. */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-label border-collapse">
                  <caption className="sr-only">
                    Clasificación de severidad por estado, con caída porcentual,
                    interpretación técnica y tipo de reconexión. Seleccione una
                    fila para ver su telemetría.
                  </caption>
                  <thead>
                    <tr className="border-b border-line text-fg-muted font-mono uppercase text-label-sm">
                      <th scope="col" className="py-2.5 px-3">Estado / Entidad</th>
                      <th scope="col" className="py-2.5 px-3 text-right">Caída %</th>
                      <th scope="col" className="py-2.5 px-3">Nivel de Severidad</th>
                      <th scope="col" className="py-2.5 px-3">Interpretación Técnica SEN</th>
                      <th scope="col" className="py-2.5 px-3">Reconexión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredStates.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-10 px-3 text-center">
                          <p className="text-body text-fg font-medium">
                            Ningún estado coincide con el filtro
                          </p>
                          <p className="text-label text-fg-muted mt-1">
                            {hasActiveFilter
                              ? 'Prueba con otro nombre o vuelve a Todos los estados.'
                              : 'No hay telemetría para los estados seleccionados.'}
                          </p>
                          {hasActiveFilter && (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchFilter('');
                                setSeverityFilter('ALL');
                              }}
                              className="mt-3 inline-flex items-center gap-1.5 rounded-control border border-line bg-canvas px-3 py-2 text-label text-fg-muted hover:bg-surface-raised hover:text-fg transition-colors duration-150"
                            >
                              <X className="w-3.5 h-3.5" aria-hidden="true" />
                              Limpiar filtro
                            </button>
                          )}
                        </td>
                      </tr>
                    )}
                    {filteredStates.map((st) => {
                      const isSelected = selectedStateId === st.entity.id;
                      return (
                        <tr
                          key={st.entity.id}
                          onClick={() => onSelectState(st.entity.id)}
                          aria-selected={isSelected}
                          className={`transition-colors ${ isSelected ? 'bg-surface-raised text-fg' : 'hover:bg-surface text-fg-muted cursor-pointer' }`}
                        >
                          <td className="py-2.5 px-3 font-medium">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectState(st.entity.id);
                              }}
                              aria-pressed={isSelected}
                              className="flex items-center gap-1.5 text-left rounded-control px-1 -mx-1 hover:text-fg transition-colors"
                            >
                              <span className="font-mono text-info font-bold">
                                [{st.entity.code}]
                              </span>
                              <span>{st.entity.name}</span>
                            </button>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-right tabular-nums">
                            <span className={severityToken(severityFromDrop(st.dropPercentage)).fg}>
                              −{st.dropPercentage}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3"><SeverityBadge severity={st.severity} /></td>
                          <td className="py-2.5 px-3 text-fg-muted leading-snug max-w-md">
                            {st.interpretation}
                          </td>
                          <td className="py-2.5 px-3 text-label-sm">
                            <RecoveryNote recoveryType={st.recoveryType} variant="inline" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Análisis de Recuperación */}
            <div className="p-4 rounded-card bg-canvas border border-line space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-control bg-info-surface border border-info text-info font-mono text-label font-bold">
                    3
                  </span>
                  <h4 className="text-label font-bold uppercase tracking-wider text-fg font-mono">
                    Análisis de Recuperación
                  </h4>
                </div>
                <span className="text-label font-mono text-fg-muted">
                  Tipo: <strong className="text-sev-moderate">{recoveryAnalysis.recoveryType}</strong>
                </span>
              </div>

              <div className="space-y-2 text-label">
                <div className="p-3 rounded-card bg-surface border border-line space-y-1">
                  <div className="font-semibold text-fg flex items-center gap-2 font-mono text-label uppercase">
                    <RefreshCw className="w-3.5 h-3.5 text-info" />
                    Velocidad de Reconexión:
                  </div>
                  <p className="text-fg-muted leading-relaxed font-sans">
                    {recoveryAnalysis.recoverySpeedSummary}
                  </p>
                </div>

                <div className="p-3 rounded-card bg-surface border border-line space-y-1">
                  <div className="font-semibold text-fg flex items-center gap-2 font-mono text-label uppercase">
                    <Zap className="w-3.5 h-3.5 text-sev-moderate" />
                    Evaluación de Dinámica de Red SEN:
                  </div>
                  <p className="text-fg-muted leading-relaxed font-sans">
                    {recoveryAnalysis.technicalInterpretation}
                  </p>
                </div>
              </div>
            </div>

            {/* 4. Alerta / Recomendación */}
            <div className="p-4 rounded-card bg-canvas border border-line space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-control bg-info-surface border border-info text-info font-mono text-label font-bold">
                    4
                  </span>
                  <h4 className="text-label font-bold uppercase tracking-wider text-fg font-mono">
                    Alerta / Recomendación Comunitaria
                  </h4>
                </div>
              </div>

              <div className="p-3 rounded-card bg-sev-moderate-surface border border-sev-moderate text-label text-sev-moderate leading-relaxed font-sans">
                {alertRecommendation}
              </div>
            </div>
          </>
        ) : activeTab === 'markdown' ? (
          /* Raw Markdown Output */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-label text-fg-muted font-mono">
              <span>Texto estructurado según formato de inferencia SEN-IODA:</span>
              <span className="text-info">FORMATO ESTÁNDAR</span>
            </div>
            <pre className="p-4 rounded-card bg-canvas border border-line text-fg font-mono text-label leading-relaxed whitespace-pre-wrap select-all overflow-x-auto">
              {report.markdownText}
            </pre>
          </div>
        ) : (
          /* Broadcast View */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-label text-fg-muted font-mono">
              <span>Mensaje para Telegram / WhatsApp:</span>
              <button
                type="button"
                onClick={() => handleCopy(telegramBroadcastText)}
                className="text-info hover:text-info flex items-center gap-1 font-mono"
              >
                <Copy className="w-3.5 h-3.5" /> Copiar Mensaje
              </button>
            </div>
            <pre className="p-4 rounded-card bg-canvas border border-line text-fg font-mono text-label leading-relaxed whitespace-pre-wrap select-all overflow-x-auto">
              {telegramBroadcastText}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
