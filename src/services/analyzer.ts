import { IodaStateDataset, OutageReport } from '../types';
import { classifyState } from './stateClassifier';
import { synthesizeNationalReport } from './nationalSynthesis';
import { renderMarkdownReport } from './proseRenderer';
import { formatVET } from '../utils/time';

export { formatVET }; // Re-export para compatibilidad con imports/tests existentes

/**
 * Facade del motor de análisis: compone el clasificador por estado, la síntesis
 * nacional y el renderizado de prosa. La interfaz pública se conserva intacta
 * (misma firma y mismo resultado) para que los call sites y los tests existentes
 * no cambien; las reglas ahora viven detrás de las interfaces de los submódulos.
 */
export function analyzeIodaDatasets(datasets: IodaStateDataset[]): OutageReport {
  const stateClassifications = datasets.map(classifyState);
  stateClassifications.sort((a, b) => b.dropPercentage - a.dropPercentage);

  const { executiveSummary, recoveryAnalysis, alertRecommendation } =
    synthesizeNationalReport(stateClassifications);

  const timestampAnalyzed = Date.now();
  const markdownText = renderMarkdownReport({
    timestampAnalyzed,
    executiveSummary,
    stateClassifications,
    recoveryAnalysis,
    alertRecommendation,
  });

  return {
    timestampAnalyzed,
    executiveSummary,
    stateClassifications,
    recoveryAnalysis,
    alertRecommendation,
    markdownText,
  };
}