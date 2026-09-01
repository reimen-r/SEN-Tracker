import { createServer as createViteServer } from 'vite';
import { config } from './server/config';
import { createApp } from './server/app';

async function startServer() {
  const app = createApp();

  if (!config.isProduction) {
    // Dev: Vite middleware sirve la SPA con HMR.
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`[SEN-IODA Monitor] Server running on http://0.0.0.0:${config.port}`);
  });
}

startServer();