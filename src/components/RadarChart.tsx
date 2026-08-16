export interface RadarAxis {
  label: string;
  value: number; // 0..max (normalizado)
  max: number;
  display: string; // valor real + unidad (tooltip / leyenda)
}

export function RadarChart({ axes, color = 'var(--primary)', size = 300 }: { axes: RadarAxis[]; color?: string; size?: number }) {
  if (axes.length < 3) {
    return (
      <div className="text-sm text-muted-foreground text-center py-6">
        Se necesitan al menos 3 pruebas con objetivo para mostrar la araña.
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.36;
  const n = axes.length;

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, r: number) => {
    const a = angle(i);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };

  const rings = [0.25, 0.5, 0.75, 1];
  const valuePoints = axes.map((ax, i) => point(i, radius * (ax.value / ax.max)));
  const valuePolygon = valuePoints.map(p => p.x + ',' + p.y).join(' ');

  return (
    <svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size} className="mx-auto">
      {rings.map((rr, idx) => {
        const pts = axes.map((_, i) => point(i, radius * rr));
        return <polygon key={idx} points={pts.map(p => p.x + ',' + p.y).join(' ')} fill="none" stroke="var(--border)" strokeWidth={1} />;
      })}
      {axes.map((_, i) => {
        const p = point(i, radius);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth={1} />;
      })}
      <polygon points={valuePolygon} fill={color} fillOpacity={0.22} stroke={color} strokeWidth={2} />
      {valuePoints.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={5} fill={color} />
          <title>{axes[i].display}</title>
        </g>
      ))}
      {axes.map((ax, i) => {
        const p = point(i, radius + 20);
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize={9.5} fill="var(--muted-foreground)">
            {ax.label}
          </text>
        );
      })}
    </svg>
  );
}
