import React from 'react';
import { Activity, PowerOff, TrendingUp, Zap } from 'lucide-react';
import type { RecoveryType } from '../types';
import { recoveryToken } from '../design/severity';

const RECOVERY_ICON: Record<RecoveryType, React.ComponentType<{ className?: string }>> = {
  REBOTE_RAPIDO: Zap,
  RECUPERACION_LENTA_ESCALONADA: TrendingUp,
  EN_CURSO: Activity,
  SIN_RECUPERACION: PowerOff,
};

interface RecoveryNoteProps {
  recoveryType: RecoveryType;
  /** `inline`: sólo el texto. `detailed`: icono + etiqueta + explicación. */
  variant?: 'inline' | 'detailed';
  className?: string;
}

/**
 * Presentación de la recuperación electrical.
 *
 * Este texto vivía en tres cadenas ternarias paralelas (App, ReportView y
 * TelemetryChart) que no coincidían entre sí: una decía "NULA / SIN RETORNO",
 * otra "Sin retorno", y sólo una traía la explicación. El icono va de
 * lucide —antes eran cuatro emoji— y el color nunca es la única señal,
 * porque la etiqueta textual acompaña siempre.
 */
export const RecoveryNote: React.FC<RecoveryNoteProps> = ({
  recoveryType,
  variant = 'detailed',
  className = '',
}) => {
  const token = recoveryToken(recoveryType);
  const Icon = RECOVERY_ICON[recoveryType] ?? PowerOff;

  if (variant === 'inline') {
    return (
      <span className={`${token.fg} ${className}`}>
        <span className="sr-only">Recuperación: </span>
        {token.label}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-start gap-2 ${token.fg} ${className}`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0">
        <span className="font-semibold">{token.label}.</span>{' '}
        <span className="text-fg-muted">{token.detail}</span>
      </span>
    </span>
  );
};