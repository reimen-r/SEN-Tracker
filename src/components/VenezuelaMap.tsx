import React, { useState, useMemo } from 'react';
import { StateAnalysisResult, OutageSeverity } from '../types';
import { Radio, Zap, Cpu } from 'lucide-react';
import { SeverityBadge } from './SeverityBadge';
import { severityMapFill, severityToken, SEVERITY_ORDER } from '../design/severity';

interface VenezuelaMapProps {
  stateResults: StateAnalysisResult[];
  selectedStateId: string | null;
  onSelectState: (stateId: string) => void;
}

// Approximate SVG paths and centroids for Venezuela's 24 federal entities
// viewBox="0 0 1000 780"
interface EntityMapPath {
  id: string;
  name: string;
  cx: number;
  cy: number;
  d: string;
  labelOffset?: { dx: number; dy: number };
}

export const MAP_ENTITIES: EntityMapPath[] = [
  {
    id: 'VE-A', // Distrito Capital
    name: 'Distrito Capital',
    cx: 522,
    cy: 168,
    d: 'M 515 162 L 530 162 L 532 174 L 518 174 Z',
    labelOffset: { dx: 15, dy: -12 },
  },
  {
    id: 'VE-W', // La Guaira (Vargas)
    name: 'La Guaira',
    cx: 532,
    cy: 152,
    d: 'M 505 155 Q 535 150 560 156 L 558 164 Q 532 160 505 163 Z',
    labelOffset: { dx: 25, dy: -5 },
  },
  {
    id: 'VE-N', // Miranda
    name: 'Miranda',
    cx: 550,
    cy: 185,
    d: 'M 508 165 L 560 158 L 595 185 L 580 220 L 535 210 L 510 185 Z',
  },
  {
    id: 'VE-D', // Aragua
    name: 'Aragua',
    cx: 475,
    cy: 200,
    d: 'M 465 165 L 505 165 L 508 225 L 478 245 L 460 210 Z',
  },
  {
    id: 'VE-G', // Carabobo
    name: 'Carabobo',
    cx: 432,
    cy: 195,
    d: 'M 420 165 L 462 165 L 460 215 L 430 235 L 415 190 Z',
  },
  {
    id: 'VE-U', // Yaracuy
    name: 'Yaracuy',
    cx: 395,
    cy: 185,
    d: 'M 385 160 L 418 165 L 415 215 L 380 200 Z',
  },
  {
    id: 'VE-L', // Lara
    name: 'Lara',
    cx: 340,
    cy: 205,
    d: 'M 315 170 L 382 165 L 378 215 L 340 250 L 305 210 Z',
  },
  {
    id: 'VE-J', // Falcón
    name: 'Falcón',
    cx: 370,
    cy: 110,
    d: 'M 330 115 L 345 55 L 375 50 L 370 100 L 450 145 L 430 165 L 320 160 L 300 135 Z',
  },
  {
    id: 'VE-V', // Zulia
    name: 'Zulia',
    cx: 195,
    cy: 190,
    d: 'M 210 50 L 255 120 L 270 200 L 235 320 L 175 310 L 130 250 L 155 100 Z',
  },
  {
    id: 'VE-T', // Trujillo
    name: 'Trujillo',
    cx: 285,
    cy: 245,
    d: 'M 265 215 L 305 215 L 305 270 L 260 270 Z',
  },
  {
    id: 'VE-M', // Mérida
    name: 'Mérida',
    cx: 235,
    cy: 300,
    d: 'M 225 260 L 275 265 L 265 330 L 210 320 Z',
  },
  {
    id: 'VE-S', // Táchira
    name: 'Táchira',
    cx: 175,
    cy: 355,
    d: 'M 160 315 L 210 320 L 205 385 L 150 375 Z',
  },
  {
    id: 'VE-E', // Barinas
    name: 'Barinas',
    cx: 320,
    cy: 330,
    d: 'M 270 275 L 350 260 L 400 330 L 330 395 L 265 340 Z',
  },
  {
    id: 'VE-Q', // Portuguesa
    name: 'Portuguesa',
    cx: 355,
    cy: 265,
    d: 'M 335 240 L 380 230 L 390 280 L 335 295 Z',
  },
  {
    id: 'VE-H', // Cojedes
    name: 'Cojedes',
    cx: 415,
    cy: 265,
    d: 'M 390 225 L 440 230 L 435 305 L 385 290 Z',
  },
  {
    id: 'VE-K', // Guárico
    name: 'Guárico',
    cx: 520,
    cy: 300,
    d: 'M 445 235 L 565 220 L 610 290 L 595 380 L 480 375 L 440 300 Z',
  },
  {
    id: 'VE-B', // Anzoátegui
    name: 'Anzoátegui',
    cx: 665,
    cy: 265,
    d: 'M 605 180 L 700 170 L 725 240 L 700 365 L 615 365 L 595 240 Z',
  },
  {
    id: 'VE-R', // Sucre
    name: 'Sucre',
    cx: 740,
    cy: 160,
    d: 'M 690 165 L 795 150 L 790 185 L 705 185 Z',
  },
  {
    id: 'VE-P', // Nueva Esparta (Margarita)
    name: 'Nueva Esparta',
    cx: 735,
    cy: 115,
    d: 'M 710 115 Q 735 105 765 115 Q 745 130 710 115 Z',
    labelOffset: { dx: 0, dy: -15 },
  },
  {
    id: 'VE-O', // Monagas
    name: 'Monagas',
    cx: 760,
    cy: 260,
    d: 'M 715 185 L 790 195 L 820 280 L 755 315 L 710 240 Z',
  },
  {
    id: 'VE-I', // Delta Amacuro
    name: 'Delta Amacuro',
    cx: 860,
    cy: 280,
    d: 'M 800 205 L 885 240 L 920 330 L 840 360 L 805 285 Z',
  },
  {
    id: 'VE-C', // Apure
    name: 'Apure',
    cx: 410,
    cy: 430,
    d: 'M 215 390 L 340 395 L 485 380 L 575 425 L 530 485 L 340 450 L 225 430 Z',
  },
  {
    id: 'VE-F', // Bolívar
    name: 'Bolívar',
    cx: 730,
    cy: 480,
    d: 'M 590 380 L 720 365 L 835 360 L 880 430 L 870 560 L 750 630 L 610 560 L 575 440 Z',
  },
  {
    id: 'VE-X', // Amazonas
    name: 'Amazonas',
    cx: 520,
    cy: 620,
    d: 'M 505 470 L 585 450 L 620 570 L 590 730 L 490 740 L 450 600 Z',
  },
];

// Key transmission corridors
const TRANSMISSION_LINES = [
  // Troncal 765 kV (Guri -> Malena -> San Gerónimo -> La Horqueta -> La Arenosa)
  {
    name: 'Troncal 765kV Guri - San Gerónimo - Arenosa',
    voltage: '765 kV',
    color: 'var(--color-grid-765)',
    width: 3.5,
    dash: '',
    path: 'M 745 440 L 640 380 L 540 310 L 475 220 L 432 205',
  },
  // Troncal 400 kV (La Arenosa -> Yaracuy -> El Tablazo)
  {
    name: 'Troncal 400kV Centro - Occidente (Yaracuy - El Tablazo)',
    voltage: '400 kV',
    color: 'var(--color-grid-400)',
    width: 2.5,
    dash: '6,3',
    path: 'M 432 205 L 395 190 L 320 185 L 230 190',
  },
  // Troncal 400 kV (San Gerónimo -> Santa Teresa -> Caracas)
  {
    name: 'Troncal 400kV/230kV Capital (San Gerónimo - Santa Teresa - Caracas)',
    voltage: '400/230 kV',
    color: 'var(--color-grid-400)',
    width: 2.5,
    dash: '4,3',
    path: 'M 540 310 L 550 205 L 522 170',
  },
  // Troncal 400 kV Oriente (Guri -> El Tigre -> Barbacoa)
  {
    name: 'Troncal 400kV Oriente (Guri - El Tigre - Barcelona)',
    voltage: '400 kV',
    color: 'var(--color-grid-400)',
    width: 2,
    dash: '4,4',
    path: 'M 745 440 L 680 320 L 665 210 L 735 165',
  },
  // Troncal 230 kV Andes (Arenosa -> Barinas -> Uribante Caparo -> Táchira / Mérida)
  {
    name: 'Troncal 230kV Andes (Arenosa - Barinas - Uribante - San Cristóbal)',
    voltage: '230 kV',
    color: 'var(--color-grid-230)',
    width: 2,
    dash: '3,3',
    path: 'M 432 205 L 355 270 L 320 330 L 220 360 L 175 365',
  },
];

// Major generation centers
const GENERATION_NODES = [
  { name: 'C.H. Simón Bolívar (Guri)', type: 'Hidroeléctrica (10.000 MW)', x: 745, y: 440, isHydro: true },
  { name: 'C.H. Caruachi & Macagua', type: 'Hidroeléctrica (5.300 MW)', x: 765, y: 410, isHydro: true },
  { name: 'Termoeléctrica Planta Centro', type: 'Termoeléctrica (2.000 MW)', x: 428, y: 172, isHydro: false },
  { name: 'Termozulia (El Tablazo)', type: 'Termoeléctrica (1.300 MW)', x: 220, y: 175, isHydro: false },
  { name: 'S/E San Gerónimo (Nodo Central)', type: 'Subestación 765/400kV', x: 540, y: 310, isSubstation: true },
  { name: 'S/E La Arenosa (Nodo Carabobo)', type: 'Subestación 765/400kV', x: 432, y: 205, isSubstation: true },
  { name: 'S/E Yaracuy (Nodo Occidente)', type: 'Subestación 400/230kV', x: 395, y: 190, isSubstation: true },
];

export const VenezuelaMap: React.FC<VenezuelaMapProps> = ({
  stateResults,
  selectedStateId,
  onSelectState,
}) => {
  const [showGridOverlay, setShowGridOverlay] = useState<boolean>(true);
  const [showGenerationNodes, setShowGenerationNodes] = useState<boolean>(true);
  const [hoveredState, setHoveredState] = useState<StateAnalysisResult | null>(null);

  // Map result lookups (memoized to avoid re-creating on every render)
  const resultMap = useMemo(() => {
    const map = new Map<string, StateAnalysisResult>();
    stateResults.forEach((r) => map.set(r.entity.id, r));
    return map;
  }, [stateResults]);

  const getFillColor = (severity?: OutageSeverity) => {
    return severityMapFill(severity);
  };

  return (
    <div className="relative flex flex-col h-full bg-surface border border-line rounded-card overflow-hidden shadow-raised">
      {/* Top Map Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-surface border-b border-line">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-control border border-info bg-info-surface text-info">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-label font-bold text-fg font-mono uppercase tracking-wider flex items-center gap-2">
              Cartografía Telemétrica // Red SEN
              <span className="text-label-sm font-mono font-normal text-fg-muted bg-canvas border border-line px-2 py-0.5 rounded-control">
                24 Entidades
              </span>
            </h3>
            <p className="text-label text-fg-muted font-mono">
              Active Probing (/24s) + Darknet Telescope por estado
            </p>
          </div>
        </div>

        {/* Toggle Layers */}
        <div className="flex items-center gap-2 text-label font-mono">
          <button
            type="button"
            onClick={() => setShowGridOverlay(!showGridOverlay)}
            aria-pressed={showGridOverlay}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-control border transition-colors duration-150 ${ showGridOverlay ? 'bg-sev-blackout-surface text-sev-blackout border-sev-blackout' : 'bg-canvas text-fg-muted border-line hover:text-fg' }`}
          >
            <Zap className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            Corredores 765/400/230 kV
          </button>
          <button
            type="button"
            onClick={() => setShowGenerationNodes(!showGenerationNodes)}
            aria-pressed={showGenerationNodes}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-control border transition-colors duration-150 ${ showGenerationNodes ? 'bg-sev-moderate-surface text-sev-moderate border-sev-moderate' : 'bg-canvas text-fg-muted border-line hover:text-fg' }`}
          >
            <Cpu className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            Nodos de generación
          </button>
        </div>
      </div>

      {/* SVG Container */}
      <div className="relative flex-1 min-h-[420px] w-full flex items-center justify-center p-2 bg-canvas overflow-hidden">
        <svg
          viewBox="100 20 850 740"
          className="w-full h-full max-h-[560px] select-none filter drop-"
        >
          {/* Background subtle telemetry grid */}
          <pattern id="dotGrid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.75" fill="var(--color-line-strong)" opacity="0.3" />
          </pattern>
          <rect x="0" y="0" width="1000" height="800" fill="url(#dotGrid)" />

          {/* Caribbean Sea boundary label */}
          <text x="500" y="70" fill="var(--color-fg-subtle)" fontSize="12" fontFamily="var(--font-mono)" letterSpacing="4" textAnchor="middle" opacity="0.6">
            MAR CARIBE
          </text>
          <text x="830" y="520" fill="var(--color-line-strong)" fontSize="14" fontFamily="var(--font-mono)" letterSpacing="3" textAnchor="middle" opacity="0.4">
            CUENCA DEL ORINOCO
          </text>

          {/* Entity Paths */}
          <g id="venezuela-states">
            {MAP_ENTITIES.map((entityPath) => {
              const analysis = resultMap.get(entityPath.id);
              const severity = analysis?.severity || 'NORMALIDAD';
              const isSelected = selectedStateId === entityPath.id;
              const isHovered = hoveredState?.entity.id === entityPath.id;
              const fill = getFillColor(severity);

              return (
                <g
                  key={entityPath.id}
                  className="group cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={`${analysis?.entity.name ?? entityPath.name}: ${severityToken(severity).label}, caída ${Math.round(analysis?.dropPercentage ?? 0)} por ciento`}
                  aria-checked={isSelected}
                  onClick={() => onSelectState(entityPath.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectState(entityPath.id);
                    }
                  }}
                  onMouseEnter={() => analysis && setHoveredState(analysis)}
                  onMouseLeave={() => setHoveredState(null)}
                >
                  {/* El foco entra por el <g>, y `outline` sobre un <g> de
                      SVG no genera caja: hay que pintar el trazo del <path>
                      hijo con el patrón group-focus-visible. */}
                  <path
                    d={entityPath.d}
                    fill={fill}
                    fillOpacity={isSelected ? 0.95 : isHovered ? 0.85 : 0.65}
                    stroke={isSelected ? 'var(--color-info)' : isHovered ? 'var(--color-fg)' : 'var(--color-canvas)'}
                    strokeWidth={isSelected ? 3 : isHovered ? 2.4 : 1.6}
                    className="transition-[stroke-width,filter] duration-150 hover:brightness-125 group-focus-visible:stroke-info group-focus-visible:stroke-[3px]"
                  />
                  {/* Entity label */}
                  <text
                    x={entityPath.cx + (entityPath.labelOffset?.dx || 0)}
                    y={entityPath.cy + (entityPath.labelOffset?.dy || 0)}
                    fill="var(--color-fg)"
                    fontSize="11"
                    fontWeight={isSelected ? 'bold' : '600'}
                    fontFamily="var(--font-mono)"
                    textAnchor="middle"
                    stroke="var(--color-canvas)"
                    strokeWidth={2.5}
                    paintOrder="stroke"
                    className="pointer-events-none"
                  >
                    {analysis?.entity.code || entityPath.name.slice(0, 3).toUpperCase()}
                  </text>
                  {/* Porcentaje de caída. El glifo de severidad no se
                      repite aquí: con 24 entidades afectadas el mapa se
                      volvía ilegible, y la leyenda y el badge ya dan el
                      nivel por nombre además de por color. */}
                  {analysis && analysis.dropPercentage >= 25 && (
                    <text
                      x={entityPath.cx + (entityPath.labelOffset?.dx || 0)}
                      y={entityPath.cy + (entityPath.labelOffset?.dy || 0) + 11}
                      fill="var(--color-fg)"
                      fontSize="13"
                      fontWeight="600"
                      fontFamily="var(--font-mono)"
                      textAnchor="middle"
                      stroke="var(--color-canvas)"
                      strokeWidth={2.5}
                      paintOrder="stroke"
                      className="pointer-events-none"
                    >
                      −{Math.round(analysis.dropPercentage)}%
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* Transmission Lines Overlay */}
          {showGridOverlay && (
            <g id="transmission-corridors" className="pointer-events-none">
              {TRANSMISSION_LINES.map((line, idx) => (
                <g key={idx}>
                  {/* Glow layer */}
                  <path
                    d={line.path}
                    fill="none"
                    stroke={line.color}
                    strokeWidth={line.width * 2}
                    strokeOpacity={0.25}
                    strokeDasharray={line.dash}
                  />
                  {/* Main stroke */}
                  <path
                    d={line.path}
                    fill="none"
                    stroke={line.color}
                    strokeWidth={line.width}
                    strokeDasharray={line.dash}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              ))}
            </g>
          )}

          {/* Key Generation & Substation Nodes */}
          {showGenerationNodes && (
            <g id="grid-nodes" className="pointer-events-none">
              {GENERATION_NODES.map((node, idx) => (
                <g key={idx}>
                  {/* Marcador de nodo. Se distingue por radio además de
                      por color: hidroeléctrica > subestación > térmica. */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.isHydro ? 8 : node.isSubstation ? 6 : 5}
                    fill={node.isHydro
                      ? 'var(--color-node-hydro)'
                      : node.isSubstation
                      ? 'var(--color-node-substation)'
                      : 'var(--color-node-thermal)'}
                    stroke="var(--color-fg)"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.isHydro ? 14 : 10}
                    fill="none"
                    stroke={node.isHydro ? 'var(--color-info)' : 'var(--color-sev-blackout)'}
                    strokeWidth="1"
                    strokeDasharray="2,2"
                    opacity="0.7"
                  />
                  <text
                    x={node.x + 10}
                    y={node.y + 3}
                    fill="var(--color-fg)"
                    fontSize="12"
                    fontWeight="bold"
                    fontFamily="var(--font-mono)"
                    className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                  >
                    {node.name.split(' (')[0]}
                  </text>
                </g>
              ))}
            </g>
          )}
        </svg>

        {/* Live Hover Tooltip */}
        {hoveredState && (
          <div
            className="absolute bottom-4 left-4 max-w-xs bg-surface border border-line-strong rounded-control p-3 shadow-overlay backdrop-blur-md z-30 pointer-events-none transition-opacity duration-150"
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="font-semibold text-fg text-sm flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-info" />
                {hoveredState.entity.name} ({hoveredState.entity.code})
              </span>
              <SeverityBadge severity={hoveredState.severity} size="md" />
            </div>

            <div className="space-y-1 text-label font-mono">
              <div className="flex justify-between text-fg-muted">
                <span>Caída telemétrica:</span>
                <span className="font-bold text-sev-blackout">
                  {hoveredState.dropPercentage}% drop
                </span>
              </div>
              <div className="flex justify-between text-fg-muted">
                <span>Puntaje mínimo:</span>
                <span>{hoveredState.minimumScore} / 100</span>
              </div>
              {hoveredState.anomalyStartVET && (
                <div className="flex justify-between text-fg-muted">
                  <span>Hora de inicio:</span>
                  <span className="text-info">{hoveredState.anomalyStartVET}</span>
                </div>
              )}
              <p className="text-label text-fg-muted pt-1.5 border-t border-line leading-tight font-sans">
                {hoveredState.interpretation}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Leyenda del mapa. La severidad se codifica con relleno + glifo, y
          los corredores con tono = nivel de tensión: dos señales, no una. */}
      <div className="px-4 py-3 bg-surface border-t border-line flex flex-wrap items-center gap-x-6 gap-y-3 text-label">
        <fieldset className="flex items-center gap-3 flex-wrap">
          <legend className="sr-only">Leyenda de severidad por estado</legend>
          {SEVERITY_ORDER.map((sev) => {
            const token = severityToken(sev);
            return (
              <span key={sev} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="w-3 h-3 rounded-[3px] border"
                  style={{ backgroundColor: token.mapFill, borderColor: token.mapFill }}
                />
                <span className="text-fg-muted text-label-sm font-mono">
                  <span className="font-semibold">{token.glyph}</span> {token.labelWithThreshold}
                </span>
              </span>
            );
          })}
        </fieldset>

        <fieldset className="flex items-center gap-3 flex-wrap">
          <legend className="sr-only">Leyenda de corredores por nivel de tensión</legend>
          <span className="text-fg-subtle font-mono text-label-sm uppercase tracking-wider">
            Corredores
          </span>
          {(
            [
              ['765 kV', 'var(--color-grid-765)', 3.5],
              ['400 kV', 'var(--color-grid-400)', 2.5],
              ['230 kV', 'var(--color-grid-230)', 2],
            ] as const
          ).map(([label, color, w]) => (
            <span key={label} className="flex items-center gap-1.5">
              <svg width="26" height="8" aria-hidden="true" className="shrink-0">
                <line
                  x1="0"
                  y1="4"
                  x2="26"
                  y2="4"
                  stroke={color}
                  strokeWidth={w}
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-fg-muted text-label-sm font-mono">{label}</span>
            </span>
          ))}
        </fieldset>

        <p className="text-label-sm text-fg-subtle ml-auto">
          Selecciona una entidad para su telemetría
        </p>
      </div>
    </div>
  );
};
