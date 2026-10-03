import React from 'react';
import { OutageSeverity } from '../types';
import { severityToken } from '../design/severity';

interface SeverityBadgeProps {
  severity: OutageSeverity;
  size?: 'sm' | 'md';
}

/**
 * Chip de severidad. El color nunca es la única señal: el `glyph` y la
 * etiqueta textual acompañan siempre al tono, para que el nivel se lea sin
 * depender de la percepción cromática.
 */
export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, size = 'sm' }) => {
  const token = severityToken(severity);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-control border font-medium whitespace-nowrap ${ size === 'sm' ? 'px-2 py-0.5 text-label-sm' : 'px-2.5 py-1 text-body' } ${token.surface} ${token.border} ${token.fg}`}
    >
      <span
        aria-hidden="true"
        className="font-mono font-semibold leading-none opacity-80"
      >
        {token.glyph}
      </span>
      {size === 'sm' ? token.label : token.labelWithThreshold}
    </span>
  );
};