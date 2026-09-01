import React, { useState, useMemo } from 'react';
import { StateAnalysisResult, OutageSeverity } from '../types';
import { Radio, Zap, Cpu } from 'lucide-react';
import { SeverityBadge, getSeverityFillColor } from './SeverityBadge';

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
    color: '#ef4444',
    width: 3.5,
    dash: '',
    path: 'M 745 440 L 640 380 L 540 310 L 475 220 L 432 205',
  },
  // Troncal 400 kV (La Arenosa -> Yaracuy -> El Tablazo)
  {
    name: 'Troncal 400kV Centro - Occidente (Yaracuy - El Tablazo)',
    voltage: '400 kV',
    color: '#f97316',
    width: 2.5,
    dash: '6,3',
    path: 'M 432 205 L 395 190 L 320 185 L 230 190',
  },
  // Troncal 400 kV (San Gerónimo -> Santa Teresa -> Caracas)
  {
    name: 'Troncal 400kV/230kV Capital (San Gerónimo - Santa Teresa - Caracas)',
    voltage: '400/230 kV',
    color: '#eab308',
    width: 2.5,
    dash: '4,3',
    path: 'M 540 310 L 550 205 L 522 170',
  },
  // Troncal 400 kV Oriente (Guri -> El Tigre -> Barbacoa)
  {
    name: 'Troncal 400kV Oriente (Guri - El Tigre - Barcelona)',
    voltage: '400 kV',
    color: '#3b82f6',
    width: 2,
    dash: '4,4',
    path: 'M 745 440 L 680 320 L 665 210 L 735 165',
  },
  // Troncal 230 kV Andes (Arenosa -> Barinas -> Uribante Caparo -> Táchira / Mérida)
  {
    name: 'Troncal 230kV Andes (Arenosa - Barinas - Uribante - San Cristóbal)',
    voltage: '230 kV',
    color: '#a855f7',
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
    return getSeverityFillColor(severity);
  };

  return (
    <div className="relative flex flex-col h-full bg-[#161b22] border border-slate-700/50 rounded overflow-hidden shadow-lg">
      {/* Top Map Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-[#161b22] border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-blue-500/20 border border-blue-500/40 text-blue-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              Cartografía Telemétrica // Red SEN
              <span className="text-[10px] font-mono font-normal text-slate-400 bg-[#0c0e12] border border-slate-700/50 px-2 py-0.5 rounded">
                24 Entidades
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Active Probing (/24s) + Darknet Telescope por estado
            </p>
          </div>
        </div>

        {/* Toggle Layers */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={() => setShowGridOverlay(!showGridOverlay)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-all ${
              showGridOverlay
                ? 'bg-red-500/20 text-red-300 border-red-500/50'
                : 'bg-[#0c0e12] text-slate-400 border-slate-700/50 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Líneas 765kV/400kV
          </button>
          <button
            type="button"
            onClick={() => setShowGenerationNodes(!showGenerationNodes)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-all ${
              showGenerationNodes
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-[#0c0e12] text-slate-400 border-slate-700/50 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Nodos & Guri
          </button>
        </div>
      </div>

      {/* SVG Container */}
      <div className="relative flex-1 min-h-[420px] w-full flex items-center justify-center p-2 bg-[#0c0e12] overflow-hidden">
        <svg
          viewBox="100 20 850 740"
          className="w-full h-full max-h-[560px] select-none filter drop-shadow-md"
        >
          <defs>
            <linearGradient id="gridGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.8" />
            </linearGradient>
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background subtle telemetry grid */}
          <pattern id="dotGrid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.75" fill="#334155" opacity="0.3" />
          </pattern>
          <rect x="0" y="0" width="1000" height="800" fill="url(#dotGrid)" />

          {/* Caribbean Sea boundary label */}
          <text x="500" y="70" fill="#475569" fontSize="12" fontFamily="monospace" letterSpacing="4" textAnchor="middle" opacity="0.6">
            MAR CARIBE
          </text>
          <text x="830" y="520" fill="#334155" fontSize="11" fontFamily="monospace" letterSpacing="3" textAnchor="middle" opacity="0.4">
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
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => onSelectState(entityPath.id)}
                  onMouseEnter={() => analysis && setHoveredState(analysis)}
                  onMouseLeave={() => setHoveredState(null)}
                >
                  <path
                    d={entityPath.d}
                    fill={fill}
                    fillOpacity={isSelected ? 0.95 : isHovered ? 0.85 : 0.65}
                    stroke={isSelected ? '#38bdf8' : isHovered ? '#f8fafc' : '#334155'}
                    strokeWidth={isSelected ? 2.5 : isHovered ? 1.8 : 1.2}
                    className="transition-all duration-150 hover:filter hover:brightness-125"
                  />
                  {/* Entity label */}
                  <text
                    x={entityPath.cx + (entityPath.labelOffset?.dx || 0)}
                    y={entityPath.cy + (entityPath.labelOffset?.dy || 0)}
                    fill={isSelected ? '#ffffff' : '#e2e8f0'}
                    fontSize={entityPath.id === 'VE-A' || entityPath.id === 'VE-W' ? '9' : '11'}
                    fontWeight={isSelected ? 'bold' : '600'}
                    fontFamily="sans-serif"
                    textAnchor="middle"
                    className="pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                  >
                    {analysis?.entity.code || entityPath.name.slice(0, 3).toUpperCase()}
                  </text>
                  {/* Percentage Drop Pill below code */}
                  {analysis && analysis.dropPercentage >= 25 && (
                    <text
                      x={entityPath.cx + (entityPath.labelOffset?.dx || 0)}
                      y={entityPath.cy + (entityPath.labelOffset?.dy || 0) + 12}
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                    >
                      -{Math.round(analysis.dropPercentage)}%
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
                  {/* Node marker pulse */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.isHydro ? 8 : node.isSubstation ? 6 : 5}
                    fill={node.isHydro ? '#0284c7' : node.isSubstation ? '#e11d48' : '#eab308'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    filter="url(#neonGlow)"
                  />
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.isHydro ? 14 : 10}
                    fill="none"
                    stroke={node.isHydro ? '#38bdf8' : '#fb7185'}
                    strokeWidth="1"
                    strokeDasharray="2,2"
                    opacity="0.7"
                  />
                  <text
                    x={node.x + 10}
                    y={node.y + 3}
                    fill="#f1f5f9"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
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
            className="absolute bottom-4 left-4 max-w-xs bg-[#161b22] border border-slate-700/80 rounded p-3 shadow-2xl backdrop-blur-md z-30 pointer-events-none transition-all"
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="font-semibold text-white text-sm flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                {hoveredState.entity.name} ({hoveredState.entity.code})
              </span>
              <SeverityBadge severity={hoveredState.severity} size="md" />
            </div>

            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span>Caída telemétrica:</span>
                <span className="font-bold text-red-400">
                  {hoveredState.dropPercentage}% drop
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Puntaje mínimo:</span>
                <span>{hoveredState.minimumScore} / 100</span>
              </div>
              {hoveredState.anomalyStartVET && (
                <div className="flex justify-between text-slate-400">
                  <span>Hora de inicio:</span>
                  <span className="text-blue-400">{hoveredState.anomalyStartVET}</span>
                </div>
              )}
              <p className="text-[11px] text-slate-300 pt-1.5 border-t border-slate-700/50 leading-tight font-sans">
                {hoveredState.interpretation}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Map Legend Footer */}
      <div className="px-4 py-2.5 bg-[#161b22] border-t border-slate-700/50 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-slate-500 font-mono text-[10px] uppercase tracking-wider">SEVERIDAD IODA:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 border border-emerald-400/40" />
            <span className="text-slate-300 text-[10px] font-mono">Normal (0-24%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-600 border border-amber-400/40" />
            <span className="text-slate-300 text-[10px] font-mono">Moderado (25-50%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-orange-600 border border-orange-400/40" />
            <span className="text-slate-300 text-[10px] font-mono">Crítico (51-80%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-600 border border-red-400/40" />
            <span className="text-slate-300 text-[10px] font-mono">Apagón (&gt;80%)</span>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 font-mono">
          Click en una entidad para telemetría
        </div>
      </div>
    </div>
  );
};
