import { OutageReport, StateAnalysisResult } from '../types';

export interface MarkdownReportData {
  timestampAnalyzed: number;
  executiveSummary: OutageReport['executiveSummary'];
  stateClassifications: StateAnalysisResult[];
  recoveryAnalysis: OutageReport['recoveryAnalysis'];
  alertRecommendation: string;
}

export function renderMarkdownReport(data: MarkdownReportData): string {
  const { executiveSummary, stateClassifications, recoveryAnalysis, alertRecommendation } = data;

  let md = `## REPORTE TÉCNICO DE TELEMETRÍA IODA - SERVICIO ELÉCTRICO NACIONAL (SEN)\n\n`;

  // 1. Resumen Ejecutivo
  md += `### 1. Resumen Ejecutivo:\n`;
  md += `- **Estado general del país o región analizada:** ${executiveSummary.generalStatus}\n`;
  md += `- **Cantidad de estados afectados:** ${executiveSummary.affectedStatesCount} de ${executiveSummary.totalStatesAnalyzed} entidades federales (${executiveSummary.generalBlackoutStatesCount} con colapso total/general, ${executiveSummary.criticalStatesCount} con apagón estatal crítico).\n`;
  md += `- **Hora estimada de inicio de la anomalía:** ${executiveSummary.estimatedOnsetVET}\n`;
  if (executiveSummary.primaryHypothesis) {
    md += `- **Hipótesis del incidente SEN:** ${executiveSummary.primaryHypothesis}\n`;
  }
  md += `\n`;

  // 2. Clasificación por Estado
  md += `### 2. Clasificación por Estado:\n`;
  for (const item of stateClassifications) {
    const sevLabel =
      item.severity === 'APAGON_GENERAL'
        ? 'Apagón General / Colapso'
        : item.severity === 'CRITICO'
        ? 'Evento Crítico (Apagón Estatal)'
        : item.severity === 'MODERADO'
        ? 'Evento Moderado (Corte Sectorial)'
        : 'Normalidad';

    md += `- **[${item.entity.name}]**: ${item.dropPercentage}% de caída de conectividad | Nivel de Severidad: **${sevLabel}** | Interpretación: ${item.interpretation}\n`;
  }
  md += `\n`;

  // 3. Análisis de Recuperación
  md += `### 3. Análisis de Recuperación:\n`;
  md += `- **Velocidad de reconexión:** ${recoveryAnalysis.recoverySpeedSummary}\n`;
  md += `- **Evaluación de Dinámica de Red:** ${recoveryAnalysis.technicalInterpretation}\n`;
  md += `\n`;

  // 4. Alerta / Recomendación
  md += `### 4. Alerta / Recomendación:\n`;
  md += `${alertRecommendation}\n`;

  return md;
}

export function renderBroadcastText(report: OutageReport): string {
  const { executiveSummary, stateClassifications, recoveryAnalysis, alertRecommendation } = report;
  const dateLabel = new Date(report.timestampAnalyzed).toLocaleDateString('es-VE');

  return `🚨 *REPORTE DE MONITOREO SEN - VENEZUELA (TELEMETRÍA IODA)* ⚡
📅 Fecha: ${dateLabel} | ⏰ Inicio: ${executiveSummary.estimatedOnsetVET}

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
}