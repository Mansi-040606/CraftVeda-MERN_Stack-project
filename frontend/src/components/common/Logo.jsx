import { useId } from 'react';

/* CraftVeda brand mark — interlocking infinity ribbon.
   Two closed lobes share a crossing point; the right lobe is painted last so
   it weaves over the left one. Geometry is mirrored in public/favicon.svg;
   keep the two in sync. */
export const BRAND = {
  terracotta: '#C1573A',
  green: '#1E4630',
  gold: '#D9A44F',
  gap: '#FFFFFF',
  lightGreen: '#E4EFE5',
  lightTerra: '#E89A6B',
};

const LEFT_LOBE = 'M120 70C95 20 25 20 25 70C25 120 95 120 120 70Z';
const RIGHT_LOBE = 'M120 70C145 20 215 20 215 70C215 120 145 120 120 70Z';

/* Concentric strokes, widest first: each narrower stroke carves the strand
   beneath it, leaving parallel strands separated by the gap colour. */
const LEFT_BANDS = [
  [34, BRAND.terracotta],
  [26, BRAND.gap],
  [18, BRAND.terracotta],
  [12, BRAND.green],
];
const RIGHT_BANDS = [
  [34, BRAND.green],
  [26, BRAND.gap],
  [18, BRAND.terracotta],
  [10, BRAND.gap],
  [4, BRAND.gold],
];

function Ribbon({ d, bands }) {
  return (
    <>
      {bands.map(([width, color]) => (
        <path
          key={`${width}-${color}`}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </>
  );
}

export function LogoMark({ className = '', decorative = false }) {
  useId();

  return (
    <svg
      viewBox="4 11 232 118"
      className={className}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={decorative ? undefined : 'CraftVeda'}
      focusable="false"
    >
      <Ribbon d={LEFT_LOBE} bands={LEFT_BANDS} />
      <Ribbon d={RIGHT_LOBE} bands={RIGHT_BANDS} />
    </svg>
  );
}

export function Wordmark({ className = '', tone = 'dark' }) {
  const craft = tone === 'dark' ? BRAND.green : BRAND.lightGreen;
  const veda = tone === 'dark' ? BRAND.terracotta : BRAND.lightTerra;

  return (
    <span className={`font-display font-bold tracking-tight ${className}`}>
      <span style={{ color: craft }}>Craft</span>
      <span style={{ color: veda }}>Veda</span>
    </span>
  );
}

export function LotusRule({ className = '', color = BRAND.gold }) {
  const petal = 'M0-9C3.5-5 3.5-1 0 3C-3.5-1-3.5-5 0-9Z';

  return (
    <span className={`flex items-center gap-3 ${className}`} aria-hidden="true">
      <span className="h-px flex-1" style={{ background: color }} />
      <svg viewBox="-12 -12 24 24" className="h-4 w-4 shrink-0" focusable="false">
        <g fill={color}>
          <path d={petal} />
          <path d={petal} transform="rotate(-45)" />
          <path d={petal} transform="rotate(45)" />
        </g>
      </svg>
      <span className="h-px flex-1" style={{ background: color }} />
    </span>
  );
}
