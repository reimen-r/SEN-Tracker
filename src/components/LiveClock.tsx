import React, { useEffect, useState } from 'react';
import { formatVETClock } from '../utils/time';

/**
 * Reloj VET autónomo. El intervalo vive aquí para que el Header (y su árbol)
 * no se re-renderice a 1 Hz; este componente es el único que cambia de estado.
 */
export const LiveClock: React.FC = () => {
  const [now, setNow] = useState<number>(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  return <>{formatVETClock(now)}</>;
};