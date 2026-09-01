import React, { useMemo, useRef, useState, useEffect } from 'react';
import { StateAnalysisResult } from '../types';
import { Activity, Zap, Info, FileDown, Image as ImageIcon } from 'lucide-react';
import { downloadCsv, svgToPng } from '../utils/export';

interface TelemetryChartProps {
  selectedState: StateAnalysisResult;
  allStates: StateAnalysisResult[];
  onSelectState: (stateId: string) => void;
}

// Lightweight SVG line chart (replaces recharts, ~200KB saved)

interface SeriesDef {
  key: 'activeProbing' | 'darknetTelescope' | 'bgpPrefixes' | 'compositeScore' | 'compareComposite';
  name: string;
  color: string;
  width: number;
  dash?: string;
}

interface TooltipState {
  x: number;
  label: string;
  rows: { name: string; value: number; color: string }[];
}

const WIDTH = 720;
const HEIGHT = 300;
const PAD = { top: 15, right: 20, bottom: 30, left: 40 };

function buildPath(
  points: { x: number; y: number }[],
  width: number,
  height: number
): string {
  if (points.length < 2) return '';
  const stepX = (width - PAD.left - PAD.right) / Math.max(1, points.length - 1);
  let d = '';
  points.forEach((p, i) => {
    const x = PAD.left + i * stepX;
    const y = PAD.top + ((100 - p.y) / 105) * (height - PAD.top - PAD.bottom);
    d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
  });
  return d;
}

function buildSmoothPath(
  points: { x: number; y: number }[],
  width: number,
  height: number
): string {
  if (points.length < 3) return buildPath(points, width, height);
  const stepX = (width - PAD.left - PAD.right) / Math.max(1, points.length - 1);
  const coords = points.map((p, i) => ({
    x: PAD.left + i * stepX,
    y: PAD.top + ((100 - p.y) / 105) * (height - PAD.top - PAD.bottom),
  }));
  let d = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length - 1; i++) {
    const cur = coords[i];
    const next = coords[i + 1];
    const mx = (cur.x + next.x) / 2;
    const my = (cur.y + next.y) / 2;
    d += ` C ${cur.x} ${cur.y}, ${mx} ${my}, ${mx} ${my}`;
  }
  const last = coords[coords.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  selectedState,
  allStates,
  onSelectState,
}) => {
  const [compareStateId, setCompareStateId] = useState<string>('');
  const [showActiveProbing, setShowActiveProbing] = useState<boolean>(true);
  const [showDarknet, setShowDarknet] = useState<boolean>(true);
  const [showBgp, setShowBgp] = useState<boolean>(true);
  const [showComposite, setShowComposite] = useState<boolean>(true);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewW, setViewW] = useState<number>(WIDTH);

  const flashExportMsg = (msg: string) => {
    setExportMsg(msg);
    window.setTimeout(() => setExportMsg(null), 2500);
  };

  const handleExportCsv = () => {
    const rows: (string | number)[][] = [
      ['timestamp', 'horaVET', 'activeProbing', 'darknetTelescope', 'bgpPrefixes', 'indiceSEN'],
      ...selectedState.timeSeries.map((p) => [
        p.timestamp,
        p.vetTime,
        p.activeProbing,
        p.darknetTelescope,
        p.bgpPrefixes,
        p.compositeScore,
      ]),
    ];
    downloadCsv(`telemetria_${selectedState.entity.code}_SEN.csv`, rows);
    flashExportMsg('CSV exportado');
  };

  const handleExportPng = async () => {
    if (!svgRef.current) return;
    try {
      await svgToPng(svgRef.current, {
        filename: `telemetria_${selectedState.entity.code}_SEN.png`,
      });
      flashExportMsg('PNG exportado');
    } catch (err) {
      flashExportMsg(err instanceof Error ? err.message : 'Error al exportar PNG');
    }
  };

  const compareState = compareStateId ? allStates.find((s) => s.entity.id === compareStateId) : null;

  // Responsive width tracking
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setViewW(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const chartData = useMemo(() => {
    return selectedState.timeSeries.map((pt, idx) => {
      const compPoint = compareState?.timeSeries[idx];
      return {
        vetTime: pt.vetTime,
        timestamp: pt.timestamp,
        activeProbing: pt.activeProbing,
        darknetTelescope: pt.darknetTelescope,
        bgpPrefixes: pt.bgpPrefixes,
        compositeScore: pt.compositeScore,
        compareComposite: compPoint ? compPoint.compositeScore : null,
      };
    });
  }, [selectedState, compareState]);

  const series: SeriesDef[] = [];
  if (showActiveProbing) series.push({ key: 'activeProbing', name: 'Active Probing (/24s)', color: '#38bdf8', width: 2 });
  if (showDarknet) series.push({ key: 'darknetTelescope', name: 'Darknet Telescope', color: '#c084fc', width: 1.8 });
  if (showBgp) series.push({ key: 'bgpPrefixes', name: 'BGP Prefix Visibility', color: '#34d399', width: 1.5, dash: '4 2' });
  if (showComposite) series.push({ key: 'compositeScore', name: `Índice SEN (${selectedState.entity.code})`, color: '#fbbf24', width: 2.8 });
  if (compareState) series.push({ key: 'compareComposite', name: `Índice (${compareState.entity.code})`, color: '#f472b6', width: 2, dash: '5 3' });

  const plotW = viewW - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const stepX = chartData.length > 1 ? plotW / (chartData.length - 1) : plotW;

  const xFor = (i: number) => PAD.left + i * stepX;
  const yFor = (v: number) => PAD.top + ((100 - v) / 105) * plotH;

  // Ticks: ~8 x labels, ~6 y labels
  const xTicks = useMemo(() => {
    const count = 8;
    const step = Math.max(1, Math.floor(chartData.length / count));
    const plotW = viewW - PAD.left - PAD.right;
    const st = chartData.length > 1 ? plotW / (chartData.length - 1) : plotW;
    const ticks: { x: number; label: string }[] = [];
    for (let i = 0; i < chartData.length; i += step) {
      ticks.push({ x: PAD.left + i * st, label: chartData[i].vetTime });
    }
    return ticks;
  }, [chartData, viewW]);

  const yTicks = [0, 25, 50, 75, 100];

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (chartData.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * viewW;
    const idx = Math.round((mx - PAD.left) / stepX);
    if (idx < 0 || idx >= chartData.length) return;
    const pt = chartData[idx];
    const rows = series
      .map((s) => ({ name: s.name, value: pt[s.key] ?? 0, color: s.color }))
      .filter((r) => r.value !== null && r.value !== undefined);
    setTooltip({ x: xFor(idx), label: pt.vetTime, rows });
  };

  const lines = series.map((s) => {
    const pts = chartData
      .map((d, i) => ({ x: xFor(i), y: d[s.key] ?? 0 }))
      .filter((p) => p.y !== null);
    const path = buildSmoothPath(pts, viewW, HEIGHT);
    return { s, path };
  });

  return (
    <div className="flex flex-col h-full bg-[#161b22] border border-slate-700/50 rounded overflow-hidden shadow-lg">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#161b22] border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded bg-blue-500/20 border border-blue-500/40 text-blue-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                Telemetría // {selectedState.entity.name}
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#0c0e12] text-blue-400 border border-slate-700/50">
                {selectedState.entity.code}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0c0e12] text-slate-400 border border-slate-700/50">
                Región {selectedState.entity.region}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Series de tiempo: Active Probing (/24s), Darknet / Telescope (ucsd-nt) y BGP
            </p>
          </div>
        </div>

        {/* State Switcher & Comparison */}
        <div className="flex flex-wrap items-center gap-2 font-mono">
          <select
            value={selectedState.entity.id}
            onChange={(e) => onSelectState(e.target.value)}
            className="bg-[#0c0e12] border border-slate-700/50 text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
          >
            {allStates.map((s) => (
              <option key={s.entity.id} value={s.entity.id}>
                {s.entity.name} ({s.dropPercentage}% drop)
              </option>
            ))}
          </select>

          <select
            value={compareStateId}
            onChange={(e) => setCompareStateId(e.target.value)}
            className="bg-[#0c0e12] border border-slate-700/50 text-xs text-slate-400 rounded px-2 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="">Comparar entidad...</option>
            {allStates
              .filter((s) => s.entity.id !== selectedState.entity.id)
              .map((s) => (
                <option key={s.entity.id} value={s.entity.id}>
                  vs. {s.entity.name} ({s.dropPercentage}%)
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Signal Toggles & Quick Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-[#0c0e12] border-b border-slate-700/50 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-mono text-[10px] uppercase">CANALES:</span>
          <button
            type="button"
            onClick={() => setShowActiveProbing(!showActiveProbing)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
              showActiveProbing
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                : 'bg-[#161b22] text-slate-500 border border-slate-700/50'
            }`}
          >
            ● Active Probing
          </button>
          <button
            type="button"
            onClick={() => setShowDarknet(!showDarknet)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
              showDarknet
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                : 'bg-[#161b22] text-slate-500 border border-slate-700/50'
            }`}
          >
            ● Darknet Telescope
          </button>
          <button
            type="button"
            onClick={() => setShowBgp(!showBgp)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
              showBgp
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                : 'bg-[#161b22] text-slate-500 border border-slate-700/50'
            }`}
          >
            ● BGP Prefix
          </button>
          <button
            type="button"
            onClick={() => setShowComposite(!showComposite)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
              showComposite
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'bg-[#161b22] text-slate-500 border border-slate-700/50'
            }`}
          >
            ● Índice SEN
          </button>
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px]">
          <div className="text-slate-300">
            Caída Max: <span className="font-bold text-red-400">{selectedState.dropPercentage}%</span>
          </div>
          <div className="text-slate-400">
            Punto Mín: <span className="text-white">{selectedState.minimumScore}%</span>
          </div>
          {selectedState.anomalyStartVET && (
            <div className="text-slate-400">
              Inicio: <span className="text-blue-400">{selectedState.anomalyStartVET}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {exportMsg && (
            <span className="text-[10px] text-emerald-400 font-mono">{exportMsg}</span>
          )}
          <button
            type="button"
            onClick={handleExportCsv}
            title="Exportar serie temporal a CSV"
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#0c0e12] border border-slate-700/50 text-[10px] font-mono text-slate-300 hover:bg-[#1c2128] hover:border-slate-500 transition-all"
          >
            <FileDown className="w-3 h-3 text-blue-400" /> CSV
          </button>
          <button
            type="button"
            onClick={handleExportPng}
            title="Exportar gráfico a PNG"
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#0c0e12] border border-slate-700/50 text-[10px] font-mono text-slate-300 hover:bg-[#1c2128] hover:border-slate-500 transition-all"
          >
            <ImageIcon className="w-3 h-3 text-amber-400" /> PNG
          </button>
        </div>
      </div>

      {/* Main Chart Area */}
      <div ref={containerRef} className="flex-1 p-3 min-h-[340px] w-full bg-[#0c0e12]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Grid */}
          {yTicks.map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={yFor(v)}
                y2={yFor(v)}
                stroke="#1e293b"
                strokeWidth={0.5}
                strokeDasharray="3 3"
              />
              <text
                x={PAD.left - 6}
                y={yFor(v) + 3}
                fill="#64748b"
                fontSize={10}
                textAnchor="end"
                fontFamily="monospace"
              >
                {v}%
              </text>
            </g>
          ))}

          {/* X ticks */}
          {xTicks.map((t, i) => (
            <text
              key={i}
              x={t.x}
              y={HEIGHT - 10}
              fill="#64748b"
              fontSize={10}
              textAnchor="middle"
              fontFamily="monospace"
            >
              {t.label}
            </text>
          ))}

          {/* Threshold Reference Lines */}
          <line x1={PAD.left} x2={WIDTH - PAD.right} y1={yFor(90)} y2={yFor(90)} stroke="#10b981" strokeWidth={0.5} strokeDasharray="3 3" opacity={0.3} />
          <text x={WIDTH - PAD.right} y={yFor(90) - 3} fill="#10b981" fontSize={9} textAnchor="end" fontFamily="monospace">
            Normalidad 90%
          </text>
          <line x1={PAD.left} x2={WIDTH - PAD.right} y1={yFor(50)} y2={yFor(50)} stroke="#f59e0b" strokeWidth={0.5} strokeDasharray="3 3" opacity={0.3} />
          <text x={WIDTH - PAD.right} y={yFor(50) - 3} fill="#f59e0b" fontSize={9} textAnchor="end" fontFamily="monospace">
            Moderado (50%)
          </text>
          <line x1={PAD.left} x2={WIDTH - PAD.right} y1={yFor(20)} y2={yFor(20)} stroke="#ef4444" strokeWidth={0.5} strokeDasharray="3 3" opacity={0.4} />
          <text x={WIDTH - PAD.right} y={yFor(20) - 3} fill="#ef4444" fontSize={9} textAnchor="end" fontFamily="monospace">
            Apagón (&gt;80%)
          </text>

          {/* Series lines */}
          {lines.map(({ s, path }) => (
            <path
              key={s.key}
              d={path}
              fill="none"
              stroke={s.color}
              strokeWidth={s.width}
              strokeDasharray={s.dash || ''}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Hover crosshair */}
          {tooltip && (
            <line
              x1={tooltip.x}
              x2={tooltip.x}
              y1={PAD.top}
              y2={HEIGHT - PAD.bottom}
              stroke="#64748b"
              strokeWidth={0.5}
              strokeDasharray="2 2"
            />
          )}
        </svg>

        {/* Tooltip overlay */}
        {tooltip && (
          <div
            className="pointer-events-none absolute bg-[#161b22] border border-slate-700/80 rounded p-3 shadow-2xl font-mono text-xs z-10"
            style={{
              left: Math.min(tooltip.x - 20, viewW - 200),
              top: 20,
            }}
          >
            <div className="text-blue-400 font-bold mb-1 border-b border-slate-700/50 pb-1">
              Hora: {tooltip.label} (VET UTC-4)
            </div>
            <div className="space-y-1">
              {tooltip.rows.map((r, i) => (
                <div key={i} className="flex justify-between gap-4" style={{ color: r.color }}>
                  <span>{r.name}:</span>
                  <span className="font-bold">{r.value}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Substation & Grid context card */}
      <div className="p-3 bg-[#161b22] border-t border-slate-700/50 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-white font-mono text-[11px] font-bold uppercase">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Infraestructura Eléctrica ({selectedState.entity.name}):
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            <strong className="text-slate-300">Subestaciones:</strong>{' '}
            {selectedState.entity.criticalSubstations.join(', ')}
          </p>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            <strong className="text-slate-300">Líneas Troncales:</strong>{' '}
            {selectedState.entity.keyTransmissionLines.join(', ')}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-white font-mono text-[11px] font-bold uppercase">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            Diagnóstico de Red:
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed font-mono">
            {selectedState.recoveryType === 'REBOTE_RAPIDO' ? (
              <span className="text-emerald-400">
                ⚡ Reconexión Rápida: Despeje de falla local o recierre de protecciones.
              </span>
            ) : selectedState.recoveryType === 'RECUPERACION_LENTA_ESCALONADA' ? (
              <span className="text-amber-400">
                ⏳ Recuperación Escalonada: Energización progresiva de líneas 765kV/400kV.
              </span>
            ) : selectedState.recoveryType === 'EN_CURSO' ? (
              <span className="text-blue-400">
                🔄 Restitución en Curso: Telemetría activa en ascenso en últimos registros.
              </span>
            ) : (
              <span className="text-red-400">
                ❌ Sin Restitución: Entidad con interrupción eléctrica prolongada.
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};