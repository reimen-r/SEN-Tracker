import React from 'react';
import { OutageSeverity } from '../types';

interface SeverityBadgeProps {
  severity: OutageSeverity;
  size?: 'sm' | 'md';
}

const BADGE_CONFIG: Record<OutageSeverity, { label: string; classes: string; dot?: boolean }> = {
  APAGON_GENERAL: {
    label: 'APAGÓN GENERAL (>80%)',
    classes: 'bg-red-500/20 text-red-400 border-red-500/40',
    dot: true,
  },
  CRITICO: {
    label: 'CRÍTICO (51%-80%)',
    classes: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  },
  MODERADO: {
    label: 'MODERADO (25%-50%)',
    classes: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  NORMALIDAD: {
    label: 'NORMALIDAD (0%-24%)',
    classes: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
};

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, size = 'sm' }) => {
  const config = BADGE_CONFIG[severity] || BADGE_CONFIG.NORMALIDAD;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono border ${
        size === 'sm' ? 'text-[10px]' : 'text-xs font-bold'
      } ${config.classes}`}
    >
      {config.dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
      )}
      {config.label}
    </span>
  );
};

/**
 * Get fill color for the SVG map based on severity.
 */
export function getSeverityFillColor(severity?: OutageSeverity): string {
  if (severity === 'APAGON_GENERAL') return '#dc2626';
  if (severity === 'CRITICO') return '#ea580c';
  if (severity === 'MODERADO') return '#d97706';
  return '#059669';
}
