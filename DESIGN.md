# Design System

<!-- impeccable:design-schema 1 -->

Tokens reales. Todos los valores viven en el bloque `@theme` de `src/index.css`;
este documento explica qué significa cada uno y por qué existe. Si cambia el
sistema, se actualiza aquí y en `src/design/severity.ts`.

Verdad de producto: `PRODUCT.md`.

## Platform

web — React 19, Vite 8, Tailwind v4 (`@theme`, sin `tailwind.config.js`), Express 5.

## Modo de la superficie

**Operate.** El usuario es un analista u operador de red en sala de control,
en turnos. Escaneabilidad, consistencia y la escena real de uso por encima de
la expresión. La marca vive en el detalle preciso, no en la página siguiente.

Consecuencias que se notan en el sistema:

- **Densidad sobre aire.** Una fila de métricas de 20px, no de 40px. El espacio
  se gasta en información, no en aire.
- **Sin movimiento decorativo.** Un pulso de estado y un spinner son todo lo que
  se mueve. Una sala de control no necesita coreografía.
- **La alarma es cara.** Cuando algo se pone rojo, significa algo. El color se
  gana con pocas Reservadas.
- **Todo alcanzable por teclado.** Un operador no suelta el teclado.

## Tipografía

| Rol | Cara | Notas |
|---|---|---|
| Cuerpo | **Fira Sans** | Humanista y más estrecha que Inter; diseñada para contextos técnicos. |
| Datos y mediciones | **Fira Code** | Misma familia que el cuerpo, así que el mono se lee como pariente y no como pegado. |
| Display | **Chakra Petch** | Voz de marca del incumbent. Angular, técnica, "chamfered". |

Las tres viven en `index.html` vía Google Fonts.

**Por qué Fira y no Inter.** El detector mecánico marcó Inter como
sobreusado, y la base de datos de `ui-ux-pro-max` sugiere para este tipo de
producto "Dashboard Data: Fira Code + Fira Sans". Se adoptó el criterio de
cohesión de familia y **se descartó la recomendación de Orbitron** que la base
de datos también ofrecía: su propio descriptor de ánimo es "gaming companion
apps, cyberpunk narrative games", que es un cambio de tono, no una mejora, para
una herramienta de infraestructura eléctrica nacional.

**Frontera mono/sans.** El monoespaciado es para datos, medidas y
identificadores — horas, porcentajes, códigos de entidad, puntajes. La prosa va
siempre en Fira Sans. Antes el proyecto tenía que añadir `font-sans` en varios
lugares para *deshacer* un `font-mono` heredado; ahora no hace falta.

**Escala.** Tokens, no valores sueltos. Piso en 12px.

| Token | Tamaño | Uso |
|---|---|---|
| `--text-label-sm` | 12px | Etiquetas, chips, celdas de tabla, ejes |
| `--text-label` | 12px | Igual; alias explícito para texto no-etiqueta |
| `--text-body` | 14px | Cuerpo de lectura, botones, valores |
| `--text-metric` | 30px | Cifras de lectura rápida |

Las cifras usan `tabular-nums` (global en `table`/`time`/`.tabular`) para que
las columnas de números alineen.

## Color

### Superficies

Tres valores, herencia del incumbent, ampliados a escala.

| Token | Valor | Rol |
|---|---|---|
| `--color-canvas` | `#0c0e12` | Fondo de la app; también el interior de las tarjetas |
| `--color-surface` | `#161b22` | Paneles, tarjetas, cabeceras de tabla |
| `--color-surface-raised` | `#1c2128` | Estados seleccionados, hover, filas activas |

Bordes: `--color-line` (`#242e3b`) y `--color-line-strong` (`#364152`), ambos
sólidos. Antes eran `slate-700/50`, un alfa que se apilaba según el fondo.

### Texto

Todos ≥ 4.5:1 sobre las tres superficies.

| Token | Valor | Sobre `surface` |
|---|---|---|
| `--color-fg` | `#e6edf3` | 14.64:1 |
| `--color-fg-muted` | `#9fb0c0` | 7.78:1 |
| `--color-fg-subtle` | `#8496a8` | 5.69:1 |

`--color-fg-subtle` reemplaza al `slate-500` del incumbent, que daba
**3.63:1** y fallaba AA. Ese color se usaba en el denominador `/24`, en el pie
y en "Sin retorno".

### Severidad

Un solo eje, con una fuente única en `src/design/severity.ts`. Antes vivía en
cuatro sitios (`SeverityBadge.BADGE_CONFIG`, `getSeverityFillColor`, un
ternario en `ReportView` y el strip del KPI) y las tres cadenas de recuperación
en tres archivos que no coincidían.

| Nivel | Texto | Superficie de chip | Relleno de mapa |
|---|---|---|---|
| `APAGON_GENERAL` | `#f87171` | `#311c22` | `#dc2626` |
| `CRITICO` | `#fb923c` | `#33231e` | `#ea580c` |
| `MODERADO` | `#fbbf24` | `#31271e` | `#d97706` |
| `NORMALIDAD` | `#34d399` | `#132c2b` | `#059669` |

`--color-info` (`#60a5fa`) cubre lo informativo: hora de inicio, umbral,
selección.

**El color nunca va solo.** Cada nivel lleva además glifo (`!! ! ~ =`), etiqueta
textual y umbral numérico, en el chip, en la leyenda del mapa, en la
metodología y en el panel de distribución. Es un requisito de lectura, no
decoración.

**Las superficies de chip son sólidas, no alfa.** `bg-red-500/10` sobre un panel
oscuro dependía del fondo; el token sólido no.

### Acciones

Un eje separado de la severidad, porque un control no es un estado.

| Token | Uso | Contraste de tinta |
|---|---|---|
| `--color-action-live` | "Datos en vivo" | 7.30:1 con `--color-action-live-ink` |
| `--color-action-primary` | "Analista IA", acción principal | 5.24:1 con `--color-action-primary-ink` |

Antes los botones primarios usaban la rampa de severidad: "Datos en Vivo" se
leía como "estado normal" y "Analista IA" como "estado crítico".

### Series de telemetría

Familia fría, deliberadamente separada de la severidad.

| Serie | Color |
|---|---|
| Active Probing | `#38bdf8` |
| Darknet Telescope | `#a78bfa` |
| BGP Prefix | `#22d3ee` |
| Índice SEN (compuesto) | `#e6edf3` — el héroe |
| Índice de comparación | `#8496a8` — cede |

Antes la serie BGP usaba el mismo verde que "normalidad" y la compuesta el
mismo ámbar que "moderado", así que una curva podía leerse como un umbral. Los
tonos cálidos quedan reservados para las guías de severidad.

### Topología del SEN

| Token | Significado |
|---|---|
| `--color-grid-765` / `-400` / `-230` | Nivel de tensión del corredor |
| `--color-node-hydro` / `-substation` / `-thermal` | Tipo de nodo de generación |

El tono del corredor **codifica el voltaje**, no una distinción arbitraria: dos
líneas de 400 kV tenían tonos distintos antes, así que el color no significaba
nada. El grosor lo confirma.

## Radios y elevación

`--radius-card: 14px` para tarjetas y paneles; `--radius-control: 8px` para
botones, campos, chips y selects; `rounded-full` sólo para puntos y píldoras.

El incumbent usaba `rounded` pelado (4px) 103 veces. El craft-floor pide
12–16px en tarjetas.

`--shadow-raised` y `--shadow-overlay`, ambos con offset y desenfoque. Se
eliminaron los halos de color sin offset (`shadow-sm shadow-red-500`) — eso es
decoración, no profundidad — y las sombras arbitrarias `sm/md/lg/2xl`.

## Movimiento

Contenido, no envuelto en una sección aparte, porque es un presupuesto:

- `transition-colors duration-150` para cambio de estado de control.
- `transition-[stroke-width,filter]` en los polígonos del mapa.
- `motion-safe:animate-pulse` en el punto vivo, en Vigilancia y en el badge de
  apagón general. `motion-safe:` para que el guard global de movimiento
  reducido sea explícito y no dependa sólo de la media query.
- Cero `transition-all`.

Un resguardo global en `index.css` reduce las animaciones bajo
`prefers-reduced-motion: reduce`, con `animation-duration: 0.01ms` para que
los estados finales sigan siendo los correctos.

## Superficies del navegador

Las partes que nadie dibuja también llevan el diseño:

- `::selection` mezclado desde el tono de severidad.
- `caret-color` en ámbar de severidad.
- `accent-color` en controles nativos.
- `tabular-nums` en tablas.
- Scrollbar teñido, con borde del color del canvas para separar el pulgar.
- `scroll-padding-top: 5.5rem` — sin esto el header `sticky` tapa el foco del
  teclado.

## Foco

Un único `:focus-visible` global: 2px solid `--color-info`, `outline-offset`
2px. Nunca `outline-none` sin sustituto — el proyecto tenía cinco
`focus:outline-none focus:ring-1`, con 1px por debajo del mínimo y sin anillo
por defecto del navegador.

En SVG, `outline` sobre un `<g>` no genera caja: el mapa marca el trazo del
`<path>` hijo con `group-focus-visible:stroke-*`.

## Modales

`src/components/useModalDialog.ts`: `role="dialog"`, `aria-modal`, foco al
abrir, trampa de Tab, cierre con Escape, y devolución del foco al elemento de
origen. `onClose` se guarda en un ref porque el padre pasa flechas inline y
depender de su identidad re-ejecutaba el efecto —y con él el foco— en cada
render.

## Impresión

`@media print` **reescrito contra custom properties**, no contra clases
arbitrarias literales. La versión anterior seleccionaba `main .bg-\[\#0c0e12\]`:
al tokenizar los colores esos selectores dejaron de coincidir y el botón
"Imprimir" habría exportado tarjetas oscuras a papel sin avisar.

En impresión los tokens de superficie, texto, borde y severidad se re-declaran
en `:root` con valores claros. Lo que no se re-declara son los rellenos del
mapa y las series del gráfico, pero ambos componentes son `no-print`.

`SeverityDistribution` es `no-print` a propósito: "Imprimir" significa imprimir
el reporte, no la vista de trabajo.

## Reglas de contribución

1. **Ningún hex en `.tsx`.** Si hace falta un color, es un token.
2. **Ningún `text-[Npx]`.** La escala existe.
3. **Ningún emoji como icono.** `lucide-react` está instalado y se usa un solo
   peso de trazo. Los glifos de severidad son texto, no iconos.
4. **La severidad se lee de `src/design/severity.ts`.** Ni badge, ni mapa, ni
   tabla, ni panel calculan su propio color o su propio umbral.
5. **Verificar el print.** Cualquier token nuevo usado dentro de `main` necesita
   su equivalente en el bloque de impresión, o la exportación a PDF se rompe en
   silencio.
6. **El SVG exportado a PNG no ve los tokens.** `inlineCssVars()` los resuelve
   antes de serializar; un SVG dentro de un `<img>` corre sin cascada.