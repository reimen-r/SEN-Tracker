import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { config } from './config';
import { RateLimiter } from './rateLimit';

const SYSTEM_INSTRUCTION = `Eres un Analista Senior de Infraestructura y Redes Eléctricas especializado en el monitoreo del Servicio Eléctrico Nacional (SEN) de Venezuela (CORPOELEC / CENACE / Sistema Interconectado Nacional) y telemetría de IODA (Georgia Tech / CAIDA).

Tu tarea es interpretar los datos de caída telemétrica (Active Probing /24s, Darknet Telescope ucsd-nt, y prefijos BGP) y relacionarlos con la topología eléctrica venezolana:
- Central Hidroeléctrica Simón Bolívar (Guri, 10.000 MW), Caruachi, Macagua.
- Troncal de 765 kV (Líneas 1, 2 y 3: Guri -> Malena -> San Gerónimo -> La Horqueta -> La Arenosa).
- Red troncal de 400 kV (La Arenosa -> Yaracuy -> El Tablazo / Cruce del Lago de Maracaibo).
- Subestaciones clave: San Gerónimo (nodo distribuidor a los Llanos y Centro), Santa Teresa 400kV (alimentador clave de Caracas y Miranda), Yaracuy (nodo del Occidente), Planta Centro (Carabobo), Cuatricentenario (Maracaibo), Uribante Caparo (Andes).
- Dinámica de Restitución: Arranque en negro (black start), sincronización en frecuencia a 60 Hz, energización escalonada de reactores y líneas para mitigar sobretensiones por efecto Ferranti.

Metodología de Inferencia:
1. Relación Internet-Electricidad: Caída abrupta y simultánea en Active Probing y Darknet/Telescope en una región específica indica pérdida de energía en repetidoras y routers.
2. Umbrales:
   - Normalidad (90%-100%)
   - Evento Moderado / Corte Sectorial (25% - 50% drop)
   - Evento Crítico / Apagón Estatal (51% - 80% drop)
   - Apagón General / Colapso (>80% drop)
3. Restricciones:
   - Descartar variaciones de madrugada a menos que el drop instantáneo supere el 40%.
   - Descartar fallas aisladas de un solo ISP si BGP y Active Probing general del estado se mantienen estables.

Entrega explicaciones técnicas, precisas, en español profesional, sin rodeos innecesarios, enfocadas en la infraestructura eléctrica y de telecomunicaciones de Venezuela.`;

let aiClient: GoogleGenAI | null = null;

export function getAIClient(): GoogleGenAI | null {
  if (!aiClient && config.geminiApiKey) {
    aiClient = new GoogleGenAI({
      apiKey: config.geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export function createGeminiRouter(rateLimiter: RateLimiter): Router {
  const router = Router();

  router.post('/analyze-gemini', async (req, res) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      if (!rateLimiter.allow(clientIp)) {
        return res.status(429).json({
          error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.',
          retryAfterSeconds: rateLimiter.retryAfterSeconds(clientIp),
        });
      }

      const { reportContext, userQuery } = req.body ?? {};

      const ai = getAIClient();
      if (!ai) {
        return res.status(503).json({
          error: 'Servicio de IA Gemini no disponible (GEMINI_API_KEY no configurada en el servidor).',
          fallback: true,
        });
      }

      const promptText = `A continuación se presentan los datos telemétricos y el análisis del estado del SEN actual:
${typeof reportContext === 'string' ? reportContext : JSON.stringify(reportContext, null, 2)}

Consulta / Solicitud específica del operador:
${userQuery || 'Por favor genera una evaluación técnica profunda del estado del SEN, identificando las subestaciones y líneas troncales probablemente comprometidas, la dinámica de recuperación y las recomendaciones prioritarias.'}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: promptText,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.2,
        },
      });

      const analysisText = response.text || 'Sin respuesta generada.';

      return res.json({
        success: true,
        analysis: analysisText,
        modelUsed: 'gemini-3.7-flash',
      });
    } catch (err) {
      console.error('Error in Gemini analysis route:', err);
      const message = err instanceof Error ? err.message : 'Error al procesar la solicitud con Gemini API.';
      return res.status(500).json({ error: message });
    }
  });

  return router;
}