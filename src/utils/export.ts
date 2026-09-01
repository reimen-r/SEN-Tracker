/**
 * Utilidades de exportación (CSV, JSON, PNG). El CSV incluye BOM UTF-8 para
 * que Excel en español respete los acentos, y protege contra inyección de
 * fórmulas (celdas que empiezan con = + - @ se prefijan con ').
 */

// Empieza con =, +, @ siempre peligroso; con "-" solo si NO va seguido de un
// dígito (un "-80" es un valor numérico legítimo, "-cmd" o "--" no lo son).
const CSV_INJECTION_RE = /^[=+@]|^-(?![0-9])/;
const CSV_NEEDS_QUOTING_RE = /[",\n\r]/;

/** Escapa una celda CSV (inyección + comillas + separadores). */
export function escapeCell(value: string | number): string {
  let s = String(value);
  if (CSV_INJECTION_RE.test(s)) s = `'${s}`;
  if (CSV_NEEDS_QUOTING_RE.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Serializa filas a texto CSV (sin BOM; el BOM se añade al descargar). */
export function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(escapeCell).join(',')).join('\n');
}

export function downloadBlob(filename: string, content: BlobPart[], type: string): void {
  const blob = new Blob(content, { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Descarga filas como CSV con BOM UTF-8. */
export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  downloadBlob(filename, [`\uFEFF${toCsv(rows)}`], 'text/csv;charset=utf-8');
}

export function downloadJson(filename: string, data: unknown): void {
  downloadBlob(filename, [JSON.stringify(data, null, 2)], 'application/json');
}

/**
 * Exporta un elemento SVG del DOM a PNG (canvas), respetando fuentes cargadas
 * y escalando a 2x por defecto para buena nitidez en pantallas retina.
 */
export async function svgToPng(
  svg: SVGSVGElement,
  opts: { filename?: string; scale?: number; background?: string } = {}
): Promise<void> {
  const scale = opts.scale ?? 2;
  const filename = opts.filename ?? 'grafico.png';
  const background = opts.background ?? '#0c0e12';

  await document.fonts.ready;

  const rect = svg.getBoundingClientRect();
  const width = rect.width || 720;
  const height = rect.height || 300;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('viewBox', svg.getAttribute('viewBox') || `0 0 ${width} ${height}`);

  const source = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(
    new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
  );

  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () =>
        reject(new Error('No se pudo cargar el SVG para exportar la imagen.'));
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D no disponible para la exportación.');

    ctx.scale(scale, scale);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    URL.revokeObjectURL(url);
  }
}