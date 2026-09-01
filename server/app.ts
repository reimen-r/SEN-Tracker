import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { config } from './config';
import { RateLimiter } from './rateLimit';
import { createGeminiRouter } from './gemini';
import { createIodaProxyRouter } from './iodaProxy';

const GEMINI_RATE_LIMIT_WINDOW_MS = 60_000;
const GEMINI_RATE_LIMIT_MAX = 10;

export function createApp(): express.Express {
  const app = express();

  if (config.trustProxy) {
    app.set('trust proxy', true);
  }

  // Body limits por ruta (no global 15 MB): Gemini 1 MB, proxy IODA 100 KB.
  app.use('/api/analyze-gemini', express.json({ limit: '1mb' }));
  app.use('/api/ioda', express.json({ limit: '100kb' }));

  // Logging básico de requests.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      console.log(
        `[req] ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`
      );
    });
    next();
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'SEN Venezuela IODA Telemetry Monitor API',
      hasGeminiKey: Boolean(config.geminiApiKey),
      timeVET: new Date().toLocaleTimeString('es-VE', {
        timeZone: 'America/Caracas',
      }),
    });
  });

  const geminiRateLimiter = new RateLimiter(
    GEMINI_RATE_LIMIT_WINDOW_MS,
    GEMINI_RATE_LIMIT_MAX
  );
  app.use('/api', createGeminiRouter(geminiRateLimiter));
  app.use('/api/ioda', createIodaProxyRouter());

  // En producción se sirven los estáticos y el fallback SPA. El middleware usa
  // app.use (Express 5 / path-to-regexp v8 rechaza '*'); las rutas /api/* que
  // no existan devuelven 404 JSON, el resto carga index.html.
  if (config.isProduction) {
    app.use(express.static(config.distPath));
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(config.distPath, 'index.html'));
    });
  }

  return app;
}