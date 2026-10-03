import React, { useMemo, useRef, useState, useEffect } from 'react';
import { StateAnalysisResult } from '../types';
import { Activity, Zap, Info, FileDown, Image as ImageIcon } from 'lucide-react';
import { downloadCsv, svgToPng } from '../utils/export';
import { RecoveryNote } from './RecoveryNote';
import {
  SEVERITY_THRESHOLD_LINES,
  severityToken,
  tokenColor,
} from '../design/severity';

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

/** Ancho nominal. Sirve como estado inicial del viewBox; en
 *  runtime lo manda el ResizeObserver (`viewW`), y TODO el dibujo —series,
 *  rejilla, guías y ejes— usa esa misma medida. */
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

  /* Las tres fuentes comparten familia fría; el índice compuesto es el héroe
     y la comparación cede. Los tonos de severidad quedan libres para los
     umbrales, de modo que una curva nunca se confunde con un umbral. */
  const series: SeriesDef[] = [];
  if (showActiveProbing)
    series.push({ key: 'activeProbing', name: 'Active Probing (/24s)', color: 'var(--color-series-probing)', width: 1.8 });
  if (showDarknet)
    series.push({ key: 'darknetTelescope', name: 'Darknet Telescope', color: 'var(--color-series-darknet)', width: 1.6 });
  if (showBgp)
    series.push({ key: 'bgpPrefixes', name: 'BGP Prefix Visibility', color: 'var(--color-series-bgp)', width: 1.4, dash: '4 2' });
  if (showComposite)
    series.push({ key: 'compositeScore', name: `Índice SEN (${selectedState.entity.code})`, color: 'var(--color-series-composite)', width: 2.6 });
  if (compareState)
    series.push({ key: 'compareComposite', name: `Índice (${compareState.entity.code})`, color: 'var(--color-series-compare)', width: 1.8, dash: '5 3' });

  const plotW = viewW - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const stepX = chartData.length > 1 ? plotW / (chartData.length - 1) : plotW;

  const xFor = (i: number) => PAD.left + i * stepX;
  const yFor = (v: number) => PAD.top + ((100 - v) / 105) * plotH;

  // Ticks: ~8 x labels, ~6 y labels
  const xTicks = useMemo(() => {
    const count = 6;
    const step = Math.max(1, Math.floor(chartData.length / count));
    const plotW = viewW - PAD.left - PAD.right;
    const st = chartData.length > 1 ? plotW / (chartData.length - 1) : plotW;
    const ticks: { x: number; label: string }[] = [];
    for (let i = 0; i < chartData.length; i += step) {
      ticks.push({ x: PAD.left + i * st, label: chartData[i].vetTime.replace(/\s*VET$/, '') });
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
    <div className="flex flex-col h-full bg-surface border border-line rounded-card overflow-hidden shadow-raised">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-surface border-b border-line">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-control border border-info bg-info-surface text-info">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-label font-bold text-fg uppercase font-mono tracking-wider flex items-center gap-2">
                Telemetría // {selectedState.entity.name}
              </h3>
              <span className="text-label-sm font-mono font-bold px-2 py-0.5 rounded-control bg-canvas text-info border border-line">
                {selectedState.entity.code}
              </span>
              <span className="text-label-sm font-mono px-2 py-0.5 rounded-control bg-canvas text-fg-muted border border-line">
                Región {selectedState.entity.region}
              </span>
            </div>
            <p className="text-label text-fg-muted font-mono">
              Series de tiempo: Active Probing (/24s), Darknet / Telescope (ucsd-nt) y BGP
            </p>
          </div>
        </div>

        {/* State Switcher & Comparison */}
        <div className="flex flex-wrap items-center gap-2 font-mono">
          <select
            value={selectedState.entity.id}
            onChange={(e) => onSelectState(e.target.value)}
            className="bg-canvas border border-line text-label text-fg rounded-control px-2.5 py-1.5 cursor-pointer"
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
            className="bg-canvas border border-line text-label text-fg-muted rounded-control px-2 py-1.5 cursor-pointer"
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
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-canvas border-b border-line text-label">
        <div className="flex items-center gap-2">
          <span
            id="series-toggles-label"
            className="text-fg-subtle font-mono text-label-sm uppercase"
          >
            Canales
          </span>
          {/* El swatch toma el color real de la serie desde la misma fuente
              que la curva, así que el toggle y la línea no pueden
              desincronizarse. `aria-pressed` expone el estado. */}
          {(
            [
              ['activeProbing', 'Active Probing', showActiveProbing, setShowActiveProbing],
              ['darknetTelescope', 'Darknet Telescope', showDarknet, setShowDarknet],
              ['bgpPrefixes', 'BGP Prefijo', showBgp, setShowBgp],
              ['compositeScore', 'Índice SEN', showComposite, setShowComposite],
            ] as const
          ).map(([key, label, on, toggle]) => {
            const def = series.find((s) => s.key === key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(!on)}
                aria-pressed={on}
                className={`inline-flex items-center gap-1.5 rounded-control border px-2 py-1 text-label-sm font-mono transition-colors duration-150 ${
                  on
                    ? 'bg-surface-raised text-fg border-line-strong'
                    : 'bg-canvas text-fg-subtle border-line hover:text-fg-muted'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="w-2.5 h-0.5 rounded-full transition-opacity duration-150"
                  style={{
                    backgroundColor: def?.color ?? 'currentColor',
                    opacity: on ? 1 : 0.35,
                  }}
                />
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 font-mono text-label-sm">
          <div className="text-fg-muted">
            Caída Max: <span className="font-bold text-sev-blackout">{selectedState.dropPercentage}%</span>
          </div>
          <div className="text-fg-muted">
            Punto Mín: <span className="text-fg">{selectedState.minimumScore}%</span>
          </div>
          {selectedState.anomalyStartVET && (
            <div className="text-fg-muted">
              Inicio: <span className="text-info">{selectedState.anomalyStartVET}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {exportMsg && (
            <span className="text-label-sm text-sev-normal font-mono">{exportMsg}</span>
          )}
          <button
            type="button"
            onClick={handleExportCsv}
            title="Exportar serie temporal a CSV"
            className="flex items-center gap-1 px-2 py-1 rounded-control bg-canvas border border-line text-label-sm font-mono text-fg-muted hover:bg-surface-raised hover:border-line-strong transition-colors duration-150"
          >
            <FileDown className="w-3 h-3 text-info" /> CSV
          </button>
          <button
            type="button"
            onClick={handleExportPng}
            title="Exportar gráfico a PNG"
            className="flex items-center gap-1 px-2 py-1 rounded-control bg-canvas border border-line text-label-sm font-mono text-fg-muted hover:bg-surface-raised hover:border-line-strong transition-colors duration-150"
          >
            <ImageIcon className="w-3 h-3 text-sev-moderate" /> PNG
          </button>
        </div>
      </div>

      {/* Main Chart Area */}
      <div ref={containerRef} className="flex-1 p-3 min-h-[340px] w-full bg-canvas overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${viewW} ${HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full min-w-[480px] select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Grid */}
          {yTicks.map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                x2={viewW - PAD.right}
                y1={yFor(v)}
                y2={yFor(v)}
                stroke="var(--color-axis-rule)"
                strokeWidth={0.5}
                strokeDasharray="3 3"
              />
              <text
                x={PAD.left - 6}
                y={yFor(v) + 3}
                fill="var(--color-axis)"
                fontSize={12}
                textAnchor="end"
                fontFamily="var(--font-mono)"
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
              fill="var(--color-axis)"
              fontSize={12}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
            >
              {t.label}
            </text>
          ))}

          {/* Umbrales de severidad. El eje Y es puntaje de conectividad (0-100),
              así que cada umbral se dibuja en su espacio de puntaje: el
              límite de una severidad es el mismo valor donde el_clasificador
              cambia de nivel. Se derivan de `design/severity` para que el
              gráfico y el clasificador no puedan divergir. Antes la línea de
              50 decía "Moderado" cuando ese es el umbral de Crítico, y
              faltaba el de 25% de caída por completo. */}
          {SEVERITY_THRESHOLD_LINES.map(({ score, severity }) => {
            const token = severityToken(severity);
            return (
              <g key={severity}>
                <line
                  x1={PAD.left}
                  x2={viewW - PAD.right}
                  y1={yFor(score)}
                  y2={yFor(score)}
                  stroke={tokenColor(severity)}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={0.45}
                />
                <text
                  x={PAD.left + 4}
                  y={yFor(score) - 4}
                  fill={tokenColor(severity)}
                  fontSize={12}
                  textAnchor="start"
                  fontFamily="var(--font-mono)"
                  stroke="var(--color-canvas)"
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {token.labelWithThreshold}
                </text>
              </g>
            );
          })}

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
              stroke="var(--color-axis)"
              strokeWidth={0.5}
              strokeDasharray="2 2"
            />
          )}
        </svg>

        {/* Tooltip overlay */}
        {tooltip && (
          <div
            className="pointer-events-none absolute bg-surface border border-line-strong rounded-control p-3 shadow-overlay font-mono text-label z-10"
            style={{
              left: Math.min(tooltip.x - 20, viewW - 200),
              top: 20,
            }}
          >
            <div className="text-info font-bold mb-1 border-b border-line pb-1">
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
      <div className="p-3 bg-surface border-t border-line grid grid-cols-1 md:grid-cols-2 gap-3 text-label">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-fg font-mono text-label font-bold uppercase">
            <Zap className="w-3.5 h-3.5 text-sev-moderate" />
            Infraestructura Eléctrica ({selectedState.entity.name}):
          </div>
          <p className="text-fg-muted text-label leading-relaxed">
            <strong className="text-fg-muted">Subestaciones:</strong>{' '}
            {selectedState.entity.criticalSubstations.join(', ')}
          </p>
          <p className="text-fg-muted text-label leading-relaxed">
            <strong className="text-fg-muted">Líneas Troncales:</strong>{' '}
            {selectedState.entity.keyTransmissionLines.join(', ')}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-fg font-mono text-label font-bold uppercase">
            <Info className="w-3.5 h-3.5 text-info" />
            Diagnóstico de Red:
          </div>
          <p className="text-fg-muted text-label leading-relaxed">
            <RecoveryNote recoveryType={selectedState.recoveryType} />
          </p>
        </div>
      </div>
    </div>
  );
};