import { FederalEntity, IodaStateDataset, OutageIncidentPreset } from '../types';

export const VENEZUELA_ENTITIES: FederalEntity[] = [
  {
    id: 'VE-A',
    name: 'Distrito Capital',
    code: 'CCS',
    region: 'Capital',
    capital: 'Caracas',
    populationEstimate: 2100000,
    criticalSubstations: ['S/E Boyacá 230kV', 'S/E Tacoa 230kV', 'S/E El Cafetal'],
    keyTransmissionLines: ['Tacoa-Boyacá 230kV', 'Santa Teresa-Caracas 230kV'],
    coordinates: { x: 50, y: 22, lat: 10.4806, lng: -66.9036 },
  },
  {
    id: 'VE-B',
    name: 'Anzoátegui',
    code: 'ANZ',
    region: 'Oriente',
    capital: 'Barcelona',
    populationEstimate: 1600000,
    criticalSubstations: ['S/E Barbacoa 230kV', 'S/E Tigre 400kV/230kV', 'S/E Guanta'],
    keyTransmissionLines: ['Guri-Tigre 400kV', 'Tigre-Barbacoa 230kV'],
    coordinates: { x: 67, y: 35, lat: 10.134, lng: -64.686 },
  },
  {
    id: 'VE-C',
    name: 'Apure',
    code: 'APU',
    region: 'Llanos',
    capital: 'San Fernando de Apure',
    populationEstimate: 580000,
    criticalSubstations: ['S/E San Fernando 230kV', 'S/E Guasdualito 115kV'],
    keyTransmissionLines: ['Calabozo-San Fernando 230kV'],
    coordinates: { x: 44, y: 55, lat: 7.8939, lng: -67.4724 },
  },
  {
    id: 'VE-D',
    name: 'Aragua',
    code: 'ARA',
    region: 'Central',
    capital: 'Maracay',
    populationEstimate: 1800000,
    criticalSubstations: ['S/E La Horqueta 400kV', 'S/E San Ignacio 230kV', 'S/E Morita'],
    keyTransmissionLines: ['San Gerónimo-La Horqueta 765kV/400kV', 'La Horqueta-La Morita 230kV'],
    coordinates: { x: 46, y: 26, lat: 10.2469, lng: -67.5958 },
  },
  {
    id: 'VE-E',
    name: 'Barinas',
    code: 'BAR',
    region: 'Llanos',
    capital: 'Barinas',
    populationEstimate: 900000,
    criticalSubstations: ['S/E Barinas I/II 230kV', 'S/E Planta Páez 230kV'],
    keyTransmissionLines: ['Arenosa-Barinas 230kV', 'Páez-Barinas 230kV'],
    coordinates: { x: 30, y: 44, lat: 8.6226, lng: -70.2075 },
  },
  {
    id: 'VE-F',
    name: 'Bolívar',
    code: 'BOL',
    region: 'Guayana',
    capital: 'Ciudad Bolívar',
    populationEstimate: 1900000,
    criticalSubstations: ['Central Hidroeléctrica Guri (Simón Bolívar)', 'S/E Macagua 400kV', 'S/E Caruachi 400kV', 'S/E Malena 765kV'],
    keyTransmissionLines: ['Guri-Malena 765kV', 'Guri-San Gerónimo 765kV (Troncal 1, 2 y 3)'],
    coordinates: { x: 70, y: 65, lat: 8.116, lng: -63.54 },
  },
  {
    id: 'VE-G',
    name: 'Carabobo',
    code: 'CAR',
    region: 'Central',
    capital: 'Valencia',
    populationEstimate: 2300000,
    criticalSubstations: ['S/E La Arenosa 765kV/400kV/230kV', 'Termoeléctrica Planta Centro 400kV', 'S/E Guaparo 230kV'],
    keyTransmissionLines: ['La Horqueta-Arenosa 765kV/400kV', 'Arenosa-Planta Centro 400kV'],
    coordinates: { x: 42, y: 25, lat: 10.18, lng: -68.0 },
  },
  {
    id: 'VE-H',
    name: 'Cojedes',
    code: 'COJ',
    region: 'Llanos',
    capital: 'San Carlos',
    populationEstimate: 360000,
    criticalSubstations: ['S/E San Carlos 230kV', 'S/E Tinaquillo 115kV'],
    keyTransmissionLines: ['Arenosa-San Carlos 230kV'],
    coordinates: { x: 38, y: 34, lat: 9.6612, lng: -68.5828 },
  },
  {
    id: 'VE-I',
    name: 'Delta Amacuro',
    code: 'DEL',
    region: 'Oriente',
    capital: 'Tucupita',
    populationEstimate: 170000,
    criticalSubstations: ['S/E Tucupita 115kV'],
    keyTransmissionLines: ['San Félix-Tucupita 115kV'],
    coordinates: { x: 88, y: 38, lat: 9.06, lng: -62.05 },
  },
  {
    id: 'VE-J',
    name: 'Falcón',
    code: 'FAL',
    region: 'Occidental',
    capital: 'Coro',
    populationEstimate: 1050000,
    criticalSubstations: ['S/E Coro 230kV', 'S/E Punto Fijo 230kV', 'Planta Genevapca / Josefa Camejo'],
    keyTransmissionLines: ['Planta Centro-Coro 230kV', 'Yaracuy-Coro 230kV'],
    coordinates: { x: 36, y: 14, lat: 11.4045, lng: -69.6734 },
  },
  {
    id: 'VE-K',
    name: 'Guárico',
    code: 'GUA',
    region: 'Llanos',
    capital: 'San Juan de los Morros',
    populationEstimate: 850000,
    criticalSubstations: ['S/E San Gerónimo 765kV/400kV (Nodo Central SEN)', 'S/E Calabozo 230kV', 'S/E Valle de la Pascua 230kV'],
    keyTransmissionLines: ['Malena-San Gerónimo 765kV', 'San Gerónimo-La Horqueta 765kV'],
    coordinates: { x: 52, y: 40, lat: 9.9115, lng: -67.3538 },
  },
  {
    id: 'VE-L',
    name: 'Lara',
    code: 'LAR',
    region: 'Occidental',
    capital: 'Barquisimeto',
    populationEstimate: 2000000,
    criticalSubstations: ['S/E Cabudare 230kV', 'S/E Barquisimeto 230kV', 'S/E Quíbor 115kV'],
    keyTransmissionLines: ['Yaracuy-Barquisimeto 230kV', 'Arenosa-Yaracuy 400kV'],
    coordinates: { x: 32, y: 27, lat: 10.0647, lng: -69.357 },
  },
  {
    id: 'VE-M',
    name: 'Mérida',
    code: 'MER',
    region: 'Andes',
    capital: 'Mérida',
    populationEstimate: 950000,
    criticalSubstations: ['S/E Mérida II 230kV', 'S/E Vigía II 230kV', 'S/E Mucubají 115kV'],
    keyTransmissionLines: ['Uribante Caparo-Mérida 230kV', 'El Vigía-Mérida 230kV'],
    coordinates: { x: 20, y: 40, lat: 8.5983, lng: -71.145 },
  },
  {
    id: 'VE-N',
    name: 'Miranda',
    code: 'MIR',
    region: 'Capital',
    capital: 'Los Teques',
    populationEstimate: 3200000,
    criticalSubstations: ['S/E Santa Teresa 400kV/230kV', 'S/E Guarenas 230kV', 'S/E Los Teques 115kV'],
    keyTransmissionLines: ['San Gerónimo-Santa Teresa 765kV/400kV', 'Santa Teresa-Tacoa 230kV'],
    coordinates: { x: 53, y: 24, lat: 10.3444, lng: -66.5546 },
  },
  {
    id: 'VE-O',
    name: 'Monagas',
    code: 'MON',
    region: 'Oriente',
    capital: 'Maturín',
    populationEstimate: 1000000,
    criticalSubstations: ['S/E El Indio 400kV/230kV', 'S/E Furrial 230kV', 'S/E Maturín 115kV'],
    keyTransmissionLines: ['Guri-El Indio 400kV', 'El Indio-Palital 400kV'],
    coordinates: { x: 77, y: 35, lat: 9.7469, lng: -63.1832 },
  },
  {
    id: 'VE-P',
    name: 'Nueva Esparta',
    code: 'NES',
    region: 'Insular',
    capital: 'La Asunción',
    populationEstimate: 590000,
    criticalSubstations: ['S/E Luisa Cáceres de Arismendi 115kV', 'Cable Submarino Chacopata-Margarita 230kV/115kV'],
    keyTransmissionLines: ['Casablanca-Chacopata 230kV', 'Cable Submarino 115kV'],
    coordinates: { x: 73, y: 16, lat: 10.9971, lng: -63.9113 },
  },
  {
    id: 'VE-Q',
    name: 'Portuguesa',
    code: 'POR',
    region: 'Llanos',
    capital: 'Guanare',
    populationEstimate: 950000,
    criticalSubstations: ['S/E Acarigua II 230kV', 'S/E Guanare 230kV'],
    keyTransmissionLines: ['Arenosa-Acarigua 230kV', 'Acarigua-Guanare 230kV'],
    coordinates: { x: 30, y: 36, lat: 9.0418, lng: -69.2536 },
  },
  {
    id: 'VE-R',
    name: 'Sucre',
    code: 'SUC',
    region: 'Oriente',
    capital: 'Cumaná',
    populationEstimate: 1000000,
    criticalSubstations: ['S/E Manzanares 230kV', 'S/E Chacopata 230kV', 'S/E Carúpano 115kV'],
    keyTransmissionLines: ['Barbacoa-Cumaná 230kV', 'Cumaná-Chacopata 230kV'],
    coordinates: { x: 73, y: 22, lat: 10.4534, lng: -64.1826 },
  },
  {
    id: 'VE-S',
    name: 'Táchira',
    code: 'TAC',
    region: 'Andes',
    capital: 'San Cristóbal',
    populationEstimate: 1200000,
    criticalSubstations: ['S/E San Cristóbal II 230kV', 'S/E La Fría 230kV', 'Central Uribante Caparo (San Agatón)'],
    keyTransmissionLines: ['El Vigía-La Fría 230kV', 'La Fría-San Cristóbal 230kV'],
    coordinates: { x: 14, y: 48, lat: 7.7669, lng: -72.225 },
  },
  {
    id: 'VE-T',
    name: 'Trujillo',
    code: 'TRU',
    region: 'Andes',
    capital: 'Trujillo',
    populationEstimate: 800000,
    criticalSubstations: ['S/E Valera II 230kV', 'S/E Buena Vista 230kV'],
    keyTransmissionLines: ['Barquisimeto-Buena Vista 230kV', 'Buena Vista-Valera 230kV'],
    coordinates: { x: 26, y: 32, lat: 9.3667, lng: -70.4333 },
  },
  {
    id: 'VE-U',
    name: 'Yaracuy',
    code: 'YAR',
    region: 'Central',
    capital: 'San Felipe',
    populationEstimate: 700000,
    criticalSubstations: ['S/E Yaracuy 400kV/230kV (Nodo Occidente)', 'S/E San Felipe 115kV'],
    keyTransmissionLines: ['Arenosa-Yaracuy 400kV (Troncal 1 y 2)', 'Yaracuy-El Tablazo 400kV'],
    coordinates: { x: 38, y: 24, lat: 10.3399, lng: -68.7425 },
  },
  {
    id: 'VE-V',
    name: 'Zulia',
    code: 'ZUL',
    region: 'Occidental',
    capital: 'Maracaibo',
    populationEstimate: 4200000,
    criticalSubstations: ['S/E El Tablazo 400kV/230kV', 'S/E Cuatricentenario 400kV/230kV', 'S/E Las Morochas 230kV', 'Termozulia 230kV'],
    keyTransmissionLines: ['Yaracuy-El Tablazo 400kV (Línea Cruce Lago)', 'El Tablazo-Cuatricentenario 400kV'],
    coordinates: { x: 18, y: 22, lat: 10.6427, lng: -71.6125 },
  },
  {
    id: 'VE-W',
    name: 'La Guaira (Vargas)',
    code: 'LAG',
    region: 'Capital',
    capital: 'La Guaira',
    populationEstimate: 380000,
    criticalSubstations: ['S/E Tacoa 230kV/115kV', 'S/E Puerto de La Guaira 115kV'],
    keyTransmissionLines: ['Boyacá-Tacoa 230kV'],
    coordinates: { x: 51, y: 20, lat: 10.5999, lng: -66.9341 },
  },
  {
    id: 'VE-X',
    name: 'Amazonas',
    code: 'AMA',
    region: 'Guayana',
    capital: 'Puerto Ayacucho',
    populationEstimate: 190000,
    criticalSubstations: ['S/E Puerto Ayacucho 115kV', 'Generación Térmica Local'],
    keyTransmissionLines: ['San Fernando-Pto. Ayacucho 115kV'],
    coordinates: { x: 48, y: 82, lat: 4.0, lng: -66.5 },
  },
];

// Helper to generate realistic IODA time-series based on incident profile
export function generateIncidentTelemetry(
  presetType: 'NATIONAL_BLACKOUT' | 'WESTERN_TRIP' | 'CAPITAL_LOCAL' | 'NIGHT_CIRCADIAN' | 'ISOLATED_ISP'
): IodaStateDataset[] {
  // Base time: 24 hours window, interval = 15 minutes (96 points)
  // Base start timestamp: 2026-08-30 00:00 VET (which is 04:00 UTC)
  const baseStart = Math.floor(new Date('2026-08-30T04:00:00Z').getTime() / 1000);
  const stepSec = 15 * 60; // 15 mins
  const pointCount = 96;

  return VENEZUELA_ENTITIES.map((entity) => {
    const activeProbing: [number, number][] = [];
    const darknetTelescope: [number, number][] = [];
    const bgpPrefixes: [number, number][] = [];

    // Base noise seed per state
    const stateSeed = entity.name.length * 7;

    for (let i = 0; i < pointCount; i++) {
      const ts = baseStart + i * stepSec;
      const hourVET = (i * 15) / 60; // 0 to 23.75

      // Base normal diurnal curve (subtle 5% variance)
      let baseFactor = 0.95 + 0.04 * Math.sin(((hourVET - 8) / 24) * Math.PI * 2);
      // Small sensor noise
      const noise = ((Math.sin(i * 1.3 + stateSeed) + 1) / 2) * 0.04;
      baseFactor = Math.min(1.0, Math.max(0.88, baseFactor + noise));

      let activeVal = baseFactor * 100;
      let darknetVal = baseFactor * 100;
      let bgpVal = 99 - (i % 2); // BGP is very steady ~99%

      // Apply specific scenario perturbation
      if (presetType === 'NATIONAL_BLACKOUT') {
        // Incident onset at 16:45 VET (point index 67)
        // Colapso de 765kV Guri - Malena - San Gerónimo
        const onsetIndex = 67; // 16:45 VET
        const recoveryStartIndex = 84; // 21:00 VET

        if (i >= onsetIndex && i < recoveryStartIndex) {
          // Bolívar has minimal drop (it is near Guri generation), Amazonas has mixed, rest collapse
          if (entity.id === 'VE-F') {
            // Bolívar
            activeVal = activeVal * 0.45; // 55% drop (critical)
            darknetVal = darknetVal * 0.40;
            bgpVal = 70;
          } else if (entity.id === 'VE-X') {
            // Amazonas
            activeVal = activeVal * 0.60;
            darknetVal = darknetVal * 0.55;
            bgpVal = 85;
          } else {
            // General collapse (>80% drop)
            const severityFactor = 0.08 + (stateSeed % 7) * 0.015; // drops to ~8% to 15%
            activeVal = activeVal * severityFactor;
            darknetVal = darknetVal * (severityFactor * 0.85);
            bgpVal = 45 + (stateSeed % 10); // BGP drops partially
          }
        } else if (i >= recoveryStartIndex) {
          // Staggered recovery (energización escalonada de líneas de transmisión)
          // Caracas / Guayana recover first; Zulia and Andes recover slowest
          const progress = (i - recoveryStartIndex) / (pointCount - recoveryStartIndex);
          let recoveryRate = progress;

          if (entity.region === 'Capital' || entity.region === 'Guayana') {
            recoveryRate = Math.min(1, progress * 1.5);
          } else if (entity.region === 'Occidental' || entity.region === 'Andes') {
            recoveryRate = Math.min(1, progress * 0.65); // slower
          } else {
            recoveryRate = Math.min(1, progress * 1.0);
          }

          const targetLevel = 0.12 + 0.85 * recoveryRate;
          activeVal = (baseFactor * 100) * targetLevel;
          darknetVal = (baseFactor * 100) * targetLevel * 0.95;
          bgpVal = Math.min(99, 45 + 54 * recoveryRate);
        }
      } else if (presetType === 'WESTERN_TRIP') {
        // Falla en subestación Yaracuy 400kV y líneas a El Tablazo
        // Afecta Zulia, Táchira, Mérida, Trujillo, Falcón, Lara
        const onsetIndex = 52; // 13:00 VET
        const recoveryIndex = 76; // 19:00 VET

        const isWestern = ['VE-V', 'VE-S', 'VE-M', 'VE-T', 'VE-J', 'VE-L'].includes(entity.id);

        if (isWestern && i >= onsetIndex && i < recoveryIndex) {
          if (entity.id === 'VE-V') { // Zulia (88% drop)
            activeVal *= 0.12;
            darknetVal *= 0.10;
            bgpVal = 55;
          } else if (entity.id === 'VE-M' || entity.id === 'VE-S') { // Mérida / Táchira (80% drop)
            activeVal *= 0.18;
            darknetVal *= 0.15;
            bgpVal = 60;
          } else if (entity.id === 'VE-T') { // Trujillo (74% drop)
            activeVal *= 0.26;
            darknetVal *= 0.22;
            bgpVal = 68;
          } else if (entity.id === 'VE-J') { // Falcón (62% drop)
            activeVal *= 0.38;
            darknetVal *= 0.34;
            bgpVal = 75;
          } else if (entity.id === 'VE-L') { // Lara (45% drop)
            activeVal *= 0.55;
            darknetVal *= 0.52;
            bgpVal = 82;
          }
        } else if (isWestern && i >= recoveryIndex) {
          // Slow recovery
          const progress = (i - recoveryIndex) / (pointCount - recoveryIndex);
          const factor = 0.2 + 0.78 * progress;
          activeVal = (baseFactor * 100) * factor;
          darknetVal = (baseFactor * 100) * factor * 0.95;
          bgpVal = 60 + 38 * progress;
        }
      } else if (presetType === 'CAPITAL_LOCAL') {
        // Evento Sectorial Subestación Santa Teresa (Miranda / Caracas)
        // Onset at 10:30 VET (index 42), Rapid bounce recovery at 11:30 VET (index 46)
        const onset = 42;
        const restored = 46;

        if ((entity.id === 'VE-N' || entity.id === 'VE-A') && i >= onset && i < restored) {
          if (entity.id === 'VE-N') {
            // Miranda: 38% drop
            activeVal *= 0.62;
            darknetVal *= 0.60;
          } else {
            // Distrito Capital: 28% drop
            activeVal *= 0.72;
            darknetVal *= 0.70;
          }
        } else if ((entity.id === 'VE-N' || entity.id === 'VE-A') && i >= restored) {
          // Rapid bounce (restored immediately in 1-2 points)
          const bounceProgress = Math.min(1, (i - restored + 1) * 0.8);
          activeVal = activeVal * (0.7 + 0.3 * bounceProgress);
          darknetVal = darknetVal * (0.7 + 0.3 * bounceProgress);
        }
      } else if (presetType === 'NIGHT_CIRCADIAN') {
        // Madrugada normal: 02:00 - 05:30 VET (indices 8 to 22)
        // Drops ~16-20% gradually due to sleep patterns / router standby, but NO sudden drop >40%
        if (i >= 8 && i <= 22) {
          const depth = Math.sin(((i - 8) / 14) * Math.PI);
          const nightDip = 1 - 0.18 * depth; // drop max 18%
          activeVal *= nightDip;
          darknetVal *= nightDip;
          bgpVal = 99; // BGP stays completely solid 100%
        }
      } else if (presetType === 'ISOLATED_ISP') {
        // Falla aislada de 1 solo ISP en Carabobo (VE-G)
        // Darknet and BGP remain flat, active probing drops slightly (14%) for only 1 AS
        if (entity.id === 'VE-G' && i >= 36 && i < 60) {
          activeVal *= 0.84; // 16% drop only
          darknetVal = baseFactor * 100; // unaffected
          bgpVal = 99; // BGP stable
        }
      }

      activeProbing.push([ts, Math.round(activeVal * 10) / 10]);
      darknetTelescope.push([ts, Math.round(darknetVal * 10) / 10]);
      bgpPrefixes.push([ts, Math.round(bgpVal * 10) / 10]);
    }

    return {
      entityId: entity.id,
      entityName: entity.name,
      signals: {
        activeProbing,
        darknetTelescope,
        bgpPrefixes,
      },
    };
  });
}

/** IDs de las 24 entidades federales (ISO 3166-2:VE), p. ej. "VE-A" … "VE-X". */
export const VENEZUELA_ENTITY_IDS: string[] = VENEZUELA_ENTITIES.map((e) => e.id);

export const INCIDENT_PRESETS: OutageIncidentPreset[] = [
  {
    id: 'preset-national-collapse',
    title: 'Colapso Generalizado del SEN (Troncal 765kV Guri)',
    subtitle: 'Apagón total/crítico en 22 estados simultáneos con energización escalonada',
    category: 'CRITICAL_OUTAGE',
    description: 'Disparo de las líneas troncales 1, 2 y 3 de 765kV (Guri-San Gerónimo-La Arenosa). Caída masiva >85% en Active Probing y Darknet Telescope a las 16:45 VET. Proceso de arranque en negro y sincronización lenta de turbinas.',
    timeRangeDescription: '24 Horas (Ventana de análisis con inicio a las 16:45 VET y fase de recuperación)',
    dataset: generateIncidentTelemetry('NATIONAL_BLACKOUT'),
  },
  {
    id: 'preset-western-trip',
    title: 'Incidente Regional Sistema Occidental (Yaracuy - El Tablazo)',
    subtitle: 'Afectación severa en Zulia, Táchira, Mérida, Trujillo, Falcón y Lara',
    category: 'REGIONAL_TRIP',
    description: 'Falla en nodo Yaracuy 400kV y líneas hacia el cruce del Lago de Maracaibo. Drops de 45% a 88% en la región occidental, mientras la región Central y Oriental se mantienen en normalidad.',
    timeRangeDescription: '24 Horas (Evento iniciado a las 13:00 VET con 6 entidades federales afectadas)',
    dataset: generateIncidentTelemetry('WESTERN_TRIP'),
  },
  {
    id: 'preset-capital-substation',
    title: 'Evento Sectorial Subestación Santa Teresa (Miranda / Capital)',
    subtitle: 'Falla de distribución local con rebote rápido en 45 minutos',
    category: 'LOCAL_FAILURE',
    description: 'Apertura de interruptores en S/E Santa Teresa afectando circuitos de Miranda (38% drop) y Este de Caracas (28% drop). Recuperación rápida tras reconexión por protecciones locales.',
    timeRangeDescription: '24 Horas (Caída moderada a las 10:30 VET y retorno rápido a las 11:30 VET)',
    dataset: generateIncidentTelemetry('CAPITAL_LOCAL'),
  },
  {
    id: 'preset-circadian-night',
    title: 'Falso Positivo Filtrado: Ciclo Circadiano Nocturno',
    subtitle: 'Variación de madrugada (18% drop) sin colapso de red ni BGP',
    category: 'NIGHT_VARIATION',
    description: 'Descenso paulatino en el tráfico de 02:00 a 05:30 VET por desconexión de routers residenciales y ahorro energético. Cumple la restricción: drop <40% instantáneo es clasificado como NORMALIDAD.',
    timeRangeDescription: '24 Horas (Patrón diario estándar sin anomalía eléctrica)',
    dataset: generateIncidentTelemetry('NIGHT_CIRCADIAN'),
  },
  {
    id: 'preset-isolated-isp',
    title: 'Falso Positivo Filtrado: Falla de Enlace ISP Aislado',
    subtitle: 'Corte de fibra en un solo operador en Carabobo sin afectación del SEN',
    category: 'ISP_ISOLATED',
    description: 'Caída de tráfico de un proveedor menor (16% drop en Active Probing) con estabilidad total en Darknet y BGP. El filtro descarta falla eléctrica del SEN por ausencia de correlación multisensorial.',
    timeRangeDescription: '24 Horas (Falla de telecomunicaciones excluida de la alerta eléctrica)',
    dataset: generateIncidentTelemetry('ISOLATED_ISP'),
  },
];
