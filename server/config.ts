import 'dotenv/config';
import path from 'path';

/**
 * Configuración central del servidor. Se lee de process.env (dotenv ya cargó
 * .env / .env.local). Un solo punto de verdad para el arranque de la app.
 */
export const config = {
  port: Number(process.env.PORT || 3000),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  appUrl: process.env.APP_URL || '',
  // Tras un proxy/LB (Cloud Run) la IP real del cliente llega en X-Forwarded-For.
  // Se activa por defecto; desactivar solo en dev local directo.
  trustProxy: process.env.TRUST_PROXY !== 'false',
  isProduction: process.env.NODE_ENV === 'production',
  distPath: process.env.DIST_PATH || path.join(process.cwd(), 'dist'),
};