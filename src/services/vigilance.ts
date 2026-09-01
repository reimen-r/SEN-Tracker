import { IodaStateDataset, OutageReport, OutageSeverity } from '../types';

/**
 * Escalador de vigilancia. Funciones puras: dado el mapa de severidades previo
 * y un reporte nuevo, devuelve las escaladas detectadas y el mapa siguiente.
 * El ranking de severidad vive aquí, no en la capa de UI. Además expone el
 * fetch por lotes de la telemetría nacional con un adaptador inyectable para
 * poder probarse sin red.
 */

const SEVERITY_RANK: Record<OutageSeverity, number> = {
  NORMALIDAD: 0,
  MODERADO: 1,
  CRITICO: 2,
  APAGON_GENERAL: 3,
};

export function severityRank(severity: OutageSeverity): number {
  return SEVERITY_RANK[severity];
}

export type SeverityMap = Map<string, OutageSeverity>;

export function seedSeverityMap(report: OutageReport): SeverityMap {
  return new Map(report.stateClassifications.map((s) => [s.entity.id, s.severity]));
}

export interface EscalationResult {
  escalations: string[];
  nextSeverityMap: SeverityMap;
}

export function detectEscalations(prev: SeverityMap, report: OutageReport): EscalationResult {
  const escalations: string[] = [];
  for (const st of report.stateClassifications) {
    const prevSev = prev.get(st.entity.id);
    if (prevSev !== undefined && severityRank(st.severity) > severityRank(prevSev)) {
      escalations.push(`${st.entity.name} → ${st.severity} (-${st.dropPercentage}%)`);
    }
  }
  return { escalations, nextSeverityMap: seedSeverityMap(report) };
}

/**
 * Consulta la telemetría nacional por lotes (por defecto 6 estados a la vez)
 * para no saturar el proxy ni el upstream de Georgia Tech. Las entidades que
 * fallen se omiten; el resultado es el conjunto de las que respondieron.
 */
export async function fetchNationalTelemetry(
  entities: readonly { id: string }[],
  fetchEntity: (entityId: string) => Promise<IodaStateDataset>,
  batchSize = 6
): Promise<IodaStateDataset[]> {
  const results: (IodaStateDataset | null)[] = [];
  for (let i = 0; i < entities.length; i += batchSize) {
    const batch = entities.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (entity) => {
        try {
          return await fetchEntity(entity.id);
        } catch {
          return null;
        }
      })
    );
    results.push(...batchResults);
  }
  return results.filter((d): d is IodaStateDataset => d !== null);
}