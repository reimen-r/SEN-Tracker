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
} from 'lucide-react';
import { downloadCsv, downloadJson } from '../utils/export';

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
  const [generatedAt] = useState<Date>(() => new Date());

  const { executiveSummary, stateClassifications, recoveryAnalysis, alertRecommendation } = report;

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
    downloadJson(`reporte_SEN_IODA_${generatedAt.toISOString().slice(0, 10)}.json`, report);
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
    downloadCsv(`resumen_estados_SEN_${generatedAt.toISOString().slice(0, 10)}.csv`, rows);
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

  // Generate Telegram / WhatsApp Community broadcast format
  const telegramBroadcastText = `🚨 *REPORTE DE MONITOREO SEN - VENEZUELA (TELEMETRÍA IODA)* ⚡
📅 Fecha: ${generatedAt.toLocaleDateString('es-VE')} | ⏰ Inicio: ${executiveSummary.estimatedOnsetVET}

📊 *RESUMEN EJECUTIVO:*
• Situación: ${executiveSummary.generalStatus}
• Estados con Afectación: ${executiveSummary.affectedStatesCount} de ${executiveSummary.totalStatesAnalyzed}
• Colapsos Generales (>80%): ${executiveSummary.generalBlackoutStatesCount}
• Eventos Críticos (51-80%): ${executiveSummary.criticalStatesCount}

📍 *ESTADOS MÁS COMPROMETIDOS:*
${stateClassifications
  .filter((s) => s.severity !== 'NORMALIDAD')
  .slice(0, 10)
  .map((s) => `• *${s.entity.name}*: -${s.dropPercentage}% (${s.severity.replace('_', ' ')})`)
  .join('\n') || '• No se registran caídas críticas en las entidades evaluadas.'}

🔄 *ANÁLISIS DE RESTITUCIÓN:*
${recoveryAnalysis.recoverySpeedSummary}

📢 *ALERTA / RECOMENDACIÓN COMUNITARIA:*
${alertRecommendation}

_Fuente: Algoritmo de Inferencia IODA Georgia Tech / Monitoreo de Redes del SEN_`;

  return (
    <div className="flex flex-col h-full bg-[#161b22] border border-slate-700/50 rounded overflow-hidden shadow-lg">
      {/* Header with Tabs & Export Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#161b22] border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              Reporte Estructurado de Inferencia SEN
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Evaluación metódica según umbrales de Active Probing y Darknet Telescope
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex p-0.5 bg-[#0c0e12] border border-slate-700/50 rounded text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveTab('structured')}
              className={`px-3 py-1 rounded transition-all ${
                activeTab === 'structured'
                  ? 'bg-[#1c2128] text-white shadow-sm border border-slate-600/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Vista Ejecutiva
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('markdown')}
              className={`px-3 py-1 rounded transition-all ${
                activeTab === 'markdown'
                  ? 'bg-[#1c2128] text-white shadow-sm border border-slate-600/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Texto Markdown
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('broadcast')}
              className={`px-3 py-1 rounded transition-all ${
                activeTab === 'broadcast'
                  ? 'bg-[#1c2128] text-white shadow-sm border border-slate-600/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Alerta Comunitaria
            </button>
          </div>

          {/* Copy & Download */}
          <button
            type="button"
            onClick={() => handleCopy(activeTab === 'broadcast' ? telegramBroadcastText : report.markdownText)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0c0e12] border border-slate-700/50 text-xs font-mono text-slate-300 hover:bg-[#1c2128] hover:border-slate-500 transition-all"
            title="Copiar contenido"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0c0e12] border border-slate-700/50 text-xs font-mono text-slate-300 hover:bg-[#1c2128] hover:border-slate-500 transition-all"
            title="Descargar Markdown"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Descargar
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0c0e12] border border-slate-700/50 text-xs font-mono text-slate-300 hover:bg-[#1c2128] hover:border-slate-500 transition-all"
            title="Descargar reporte completo en JSON"
          >
            <FileJson className="w-3.5 h-3.5 text-slate-400" />
            JSON
          </button>
          <button
            type="button"
            onClick={handleExportSummaryCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0c0e12] border border-slate-700/50 text-xs font-mono text-slate-300 hover:bg-[#1c2128] hover:border-slate-500 transition-all"
            title="Descargar resumen por estado en CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0c0e12] border border-slate-700/50 text-xs font-mono text-slate-300 hover:bg-[#1c2128] hover:border-slate-500 transition-all"
            title="Imprimir o exportar a PDF (fondo claro)"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            Imprimir
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'structured' ? (
          <>
            {/* 1. Resumen Ejecutivo */}
            <div className="p-4 rounded bg-[#0c0e12] border border-slate-700/50 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-blue-500/20 border border-blue-500/40 text-blue-400 font-mono text-xs font-bold">
                    1
                  </span>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                    Resumen Ejecutivo
                  </h4>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Hora Inicio: <strong className="text-blue-400">{executiveSummary.estimatedOnsetVET} VET</strong>
                </span>
              </div>

              {/* Status Banner */}
              <div
                className={`p-3 rounded border text-xs font-mono ${
                  executiveSummary.generalBlackoutStatesCount >= 5
                    ? 'bg-red-500/10 border-red-500/30 text-red-300'
                    : executiveSummary.affectedStatesCount >= 2
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}
              >
                <div className="font-bold text-sm mb-1 flex items-center gap-2 uppercase">
                  <Zap className="w-4 h-4" />
                  {executiveSummary.generalStatus}
                </div>
                <p className="text-slate-300 leading-relaxed font-sans">
                  {executiveSummary.primaryHypothesis}
                </p>
              </div>

              {/* Key Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="p-2.5 rounded bg-[#161b22] border border-slate-700/50">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Estados Afectados</div>
                  <div className="text-xl font-bold font-mono text-white">
                    {executiveSummary.affectedStatesCount}{' '}
                    <span className="text-xs font-normal text-slate-500">/ {executiveSummary.totalStatesAnalyzed}</span>
                  </div>
                </div>
                <div className="p-2.5 rounded bg-[#161b22] border border-slate-700/50">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Apagones Totales (&gt;80%)</div>
                  <div className="text-xl font-bold font-mono text-red-400">
                    {executiveSummary.generalBlackoutStatesCount}
                  </div>
                </div>
                <div className="p-2.5 rounded bg-[#161b22] border border-slate-700/50">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Eventos Críticos (51-80%)</div>
                  <div className="text-xl font-bold font-mono text-orange-400">
                    {executiveSummary.criticalStatesCount}
                  </div>
                </div>
                <div className="p-2.5 rounded bg-[#161b22] border border-slate-700/50">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Caída Media Afectados</div>
                  <div className="text-xl font-bold font-mono text-amber-400">
                    -{executiveSummary.nationalConnectivityDropPct}%
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Clasificación por Estado */}
            <div className="p-4 rounded bg-[#0c0e12] border border-slate-700/50 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-blue-500/20 border border-blue-500/40 text-blue-400 font-mono text-xs font-bold">
                    2
                  </span>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                    Clasificación por Estado
                  </h4>
                </div>

                {/* Filter and Search */}
                <div className="flex items-center gap-2 text-xs font-mono">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar estado..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="bg-[#161b22] border border-slate-700/50 rounded pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="bg-[#161b22] border border-slate-700/50 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="ALL">Todos los estados</option>
                    <option value="AFFECTED">Solo afectados (≥25%)</option>
                    <option value="APAGON_GENERAL">Apagón General (&gt;80%)</option>
                    <option value="CRITICO">Crítico (51%-80%)</option>
                    <option value="MODERADO">Moderado (25%-50%)</option>
                    <option value="NORMALIDAD">Normalidad</option>
                  </select>
                </div>
              </div>

              {/* State Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                      <th className="py-2.5 px-3">Estado / Entidad</th>
                      <th className="py-2.5 px-3">Caída %</th>
                      <th className="py-2.5 px-3">Nivel de Severidad</th>
                      <th className="py-2.5 px-3">Interpretación Técnica SEN</th>
                      <th className="py-2.5 px-3">Reconexión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 font-sans">
                    {filteredStates.map((st) => {
                      const isSelected = selectedStateId === st.entity.id;
                      return (
                        <tr
                          key={st.entity.id}
                          onClick={() => onSelectState(st.entity.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#1c2128] text-white font-medium'
                              : 'hover:bg-[#161b22] text-slate-300'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-medium flex items-center gap-1.5">
                            <span className="font-mono text-blue-400 font-bold">[{st.entity.code}]</span>
                            <span>{st.entity.name}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold">
                            <span
                              className={
                                st.dropPercentage >= 80
                                  ? 'text-red-400'
                                  : st.dropPercentage >= 51
                                  ? 'text-orange-400'
                                  : st.dropPercentage >= 25
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                              }
                            >
                              -{st.dropPercentage}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3"><SeverityBadge severity={st.severity} /></td>
                          <td className="py-2.5 px-3 text-slate-300 leading-snug max-w-md">
                            {st.interpretation}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">
                            {st.recoveryType === 'REBOTE_RAPIDO' ? (
                              <span className="text-emerald-400 font-semibold">Rebote Rápido</span>
                            ) : st.recoveryType === 'RECUPERACION_LENTA_ESCALONADA' ? (
                              <span className="text-amber-400 font-semibold">Lenta Escalonada</span>
                            ) : st.recoveryType === 'EN_CURSO' ? (
                              <span className="text-blue-400">En Curso</span>
                            ) : (
                              <span className="text-slate-500">Sin retorno</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Análisis de Recuperación */}
            <div className="p-4 rounded bg-[#0c0e12] border border-slate-700/50 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-blue-500/20 border border-blue-500/40 text-blue-400 font-mono text-xs font-bold">
                    3
                  </span>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                    Análisis de Recuperación
                  </h4>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Tipo: <strong className="text-amber-400">{recoveryAnalysis.recoveryType}</strong>
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded bg-[#161b22] border border-slate-700/50 space-y-1">
                  <div className="font-semibold text-white flex items-center gap-2 font-mono text-[11px] uppercase">
                    <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                    Velocidad de Reconexión:
                  </div>
                  <p className="text-slate-300 leading-relaxed font-sans">
                    {recoveryAnalysis.recoverySpeedSummary}
                  </p>
                </div>

                <div className="p-3 rounded bg-[#161b22] border border-slate-700/50 space-y-1">
                  <div className="font-semibold text-white flex items-center gap-2 font-mono text-[11px] uppercase">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Evaluación de Dinámica de Red SEN:
                  </div>
                  <p className="text-slate-300 leading-relaxed font-sans">
                    {recoveryAnalysis.technicalInterpretation}
                  </p>
                </div>
              </div>
            </div>

            {/* 4. Alerta / Recomendación */}
            <div className="p-4 rounded bg-[#0c0e12] border border-slate-700/50 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-blue-500/20 border border-blue-500/40 text-blue-400 font-mono text-xs font-bold">
                    4
                  </span>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                    Alerta / Recomendación Comunitaria
                  </h4>
                </div>
              </div>

              <div className="p-3 rounded bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed font-sans">
                {alertRecommendation}
              </div>
            </div>
          </>
        ) : activeTab === 'markdown' ? (
          /* Raw Markdown Output */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Texto estructurado según formato de inferencia SEN-IODA:</span>
              <span className="text-blue-400">FORMATO ESTÁNDAR</span>
            </div>
            <pre className="p-4 rounded bg-[#0c0e12] border border-slate-700/50 text-slate-200 font-mono text-xs leading-relaxed whitespace-pre-wrap select-all overflow-x-auto">
              {report.markdownText}
            </pre>
          </div>
        ) : (
          /* Broadcast View */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Mensaje para Telegram / WhatsApp:</span>
              <button
                type="button"
                onClick={() => handleCopy(telegramBroadcastText)}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono"
              >
                <Copy className="w-3.5 h-3.5" /> Copiar Mensaje
              </button>
            </div>
            <pre className="p-4 rounded bg-[#0c0e12] border border-slate-700/50 text-slate-200 font-mono text-xs leading-relaxed whitespace-pre-wrap select-all overflow-x-auto">
              {telegramBroadcastText}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
