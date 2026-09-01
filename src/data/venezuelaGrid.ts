import { OutageIncidentPreset } from '../types';
import { ScenarioProfile, generateScenario } from './syntheticTelemetry';

/**
 * Escenarios telemétricos del SEN modelados como perfiles declarativos para la
 * fábrica de telemetría sintética. Los datos de entidades viven en
 * entityRegistry.ts; aquí solo queda la configuración de cada preset.
 */

const NATIONAL_BLACKOUT_PROFILE: ScenarioProfile = {
  perturbations: [
    {
      kind: 'collapse',
      from: 67, // 16:45 VET
      to: 84, // 21:00 VET
      severityFloor: 0.08,
      severityStep: 0.015,
      bgpFloor: 45,
      stateOverrides: [
        { stateId: 'VE-F', active: 0.45, darknet: 0.4, bgp: 70 }, // Bolívar (cerca de Guri)
        { stateId: 'VE-X', active: 0.6, darknet: 0.55, bgp: 85 }, // Amazonas
      ],
      recovery: {
        from: 84,
        type: 'STAGGERED',
        regionRates: { Capital: 1.5, Guayana: 1.5, Occidental: 0.65, Andes: 0.65 },
        floor: 0.12,
        gain: 0.85,
        darknetFactor: 0.95,
        bgpFloor: 45,
        bgpTarget: 99,
      },
    },
  ],
};

const WESTERN_TRIP_PROFILE: ScenarioProfile = {
  perturbations: [
    {
      kind: 'drop',
      stateIds: ['VE-V', 'VE-S', 'VE-M', 'VE-T', 'VE-J', 'VE-L'],
      from: 52, // 13:00 VET
      to: 76, // 19:00 VET
      active: 0.5, // fallback; todos los estados tienen sobrescritura
      perState: [
        { stateId: 'VE-V', active: 0.12, darknet: 0.1, bgp: 55 }, // Zulia 88%
        { stateId: 'VE-S', active: 0.18, darknet: 0.15, bgp: 60 }, // Táchira 82%
        { stateId: 'VE-M', active: 0.18, darknet: 0.15, bgp: 60 }, // Mérida 82%
        { stateId: 'VE-T', active: 0.26, darknet: 0.22, bgp: 68 }, // Trujillo 74%
        { stateId: 'VE-J', active: 0.38, darknet: 0.34, bgp: 75 }, // Falcón 62%
        { stateId: 'VE-L', active: 0.55, darknet: 0.52, bgp: 82 }, // Lara 45%
      ],
      recovery: {
        from: 76,
        type: 'SLOW',
        floor: 0.2,
        gain: 0.78,
        darknetFactor: 0.95,
        bgpFloor: 60,
        bgpTarget: 98,
      },
    },
  ],
};

const CAPITAL_LOCAL_PROFILE: ScenarioProfile = {
  perturbations: [
    {
      kind: 'drop',
      stateIds: ['VE-N', 'VE-A'],
      from: 42, // 10:30 VET
      to: 46, // 11:30 VET
      active: 0.5,
      perState: [
        { stateId: 'VE-N', active: 0.62, darknet: 0.6, bgp: 99 }, // Miranda 38%
        { stateId: 'VE-A', active: 0.72, darknet: 0.7, bgp: 99 }, // Dtto. Capital 28%
      ],
      recovery: {
        from: 46,
        type: 'FAST',
        darknetFactor: 1.0,
        bgpTarget: 99,
      },
    },
  ],
};

const NIGHT_CIRCADIAN_PROFILE: ScenarioProfile = {
  perturbations: [
    {
      kind: 'drop',
      from: 8, // 02:00 VET
      to: 23, // 05:45 VET
      curve: 'sine',
      active: 0.82, // descenso máximo 18%
      darknet: 0.82,
      bgp: 99, // BGP permanece sólido
    },
  ],
};

const ISOLATED_ISP_PROFILE: ScenarioProfile = {
  perturbations: [
    {
      kind: 'drop',
      stateIds: ['VE-G'],
      from: 36, // 09:00 VET
      to: 60, // 15:00 VET
      active: 0.84, // caída de un solo proveedor (~16%)
      darknet: 1.0, // Darknet sin afectación
      bgp: 99, // BGP estable
    },
  ],
};

export const INCIDENT_PRESETS: OutageIncidentPreset[] = [
  {
    id: 'preset-national-collapse',
    title: 'Colapso Generalizado del SEN (Troncal 765kV Guri)',
    subtitle: 'Apagón total/crítico en 22 estados simultáneos con energización escalonada',
    category: 'CRITICAL_OUTAGE',
    description: 'Disparo de las líneas troncales 1, 2 y 3 de 765kV (Guri-San Gerónimo-La Arenosa). Caída masiva >85% en Active Probing y Darknet Telescope a las 16:45 VET. Proceso de arranque en negro y sincronización lenta de turbinas.',
    timeRangeDescription: '24 Horas (Ventana de análisis con inicio a las 16:45 VET y fase de recuperación)',
    dataset: generateScenario(NATIONAL_BLACKOUT_PROFILE),
  },
  {
    id: 'preset-western-trip',
    title: 'Incidente Regional Sistema Occidental (Yaracuy - El Tablazo)',
    subtitle: 'Afectación severa en Zulia, Táchira, Mérida, Trujillo, Falcón y Lara',
    category: 'REGIONAL_TRIP',
    description: 'Falla en nodo Yaracuy 400kV y líneas hacia el cruce del Lago de Maracaibo. Drops de 45% a 88% en la región occidental, mientras la región Central y Oriental se mantienen en normalidad.',
    timeRangeDescription: '24 Horas (Evento iniciado a las 13:00 VET con 6 entidades federales afectadas)',
    dataset: generateScenario(WESTERN_TRIP_PROFILE),
  },
  {
    id: 'preset-capital-substation',
    title: 'Evento Sectorial Subestación Santa Teresa (Miranda / Capital)',
    subtitle: 'Falla de distribución local con rebote rápido en 45 minutos',
    category: 'LOCAL_FAILURE',
    description: 'Apertura de interruptores en S/E Santa Teresa afectando circuitos de Miranda (38% drop) y Este de Caracas (28% drop). Recuperación rápida tras reconexión por protecciones locales.',
    timeRangeDescription: '24 Horas (Caída moderada a las 10:30 VET y retorno rápido a las 11:30 VET)',
    dataset: generateScenario(CAPITAL_LOCAL_PROFILE),
  },
  {
    id: 'preset-circadian-night',
    title: 'Falso Positivo Filtrado: Ciclo Circadiano Nocturno',
    subtitle: 'Variación de madrugada (18% drop) sin colapso de red ni BGP',
    category: 'NIGHT_VARIATION',
    description: 'Descenso paulatino en el tráfico de 02:00 a 05:30 VET por desconexión de routers residenciales y ahorro energético. Cumple la restricción: drop <40% instantáneo es clasificado como NORMALIDAD.',
    timeRangeDescription: '24 Horas (Patrón diario estándar sin anomalía eléctrica)',
    dataset: generateScenario(NIGHT_CIRCADIAN_PROFILE),
  },
  {
    id: 'preset-isolated-isp',
    title: 'Falso Positivo Filtrado: Falla de Enlace ISP Aislado',
    subtitle: 'Corte de fibra en un solo operador en Carabobo sin afectación del SEN',
    category: 'ISP_ISOLATED',
    description: 'Caída de tráfico de un proveedor menor (16% drop en Active Probing) con estabilidad total en Darknet y BGP. El filtro descarta falla eléctrica del SEN por ausencia de correlación multisensorial.',
    timeRangeDescription: '24 Horas (Falla de telecomunicaciones excluida de la alerta eléctrica)',
    dataset: generateScenario(ISOLATED_ISP_PROFILE),
  },
];