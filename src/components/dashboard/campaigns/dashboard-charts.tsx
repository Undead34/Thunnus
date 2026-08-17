import type { PhishingUser } from "@/types";

interface Props {
  users: PhishingUser[];
}

interface TimelinePoint {
  label: string;
  date: Date;
  sent: number;
  opened: number;
  clicked: number;
  submitted: number;
}

const COLORS = {
  sent: "#3b82f6",
  opened: "#f59e0b",
  clicked: "#f97316",
  submitted: "#ef4444",
};

function parseTs(
  ts: string | { seconds: number; _seconds?: number } | { _seconds: number } | undefined | null
): Date | null {
  if (!ts) return null;
  if (typeof ts === "string") {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof ts === "object") {
    const secs = (ts as any).seconds ?? (ts as any)._seconds;
    if (typeof secs === "number") {
      const d = new Date(secs * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function buildTimeline(users: PhishingUser[], days = 14): TimelinePoint[] {
  const now = startOfDay(new Date());
  const points: TimelinePoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    points.push({
      label: d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }),
      date: d,
      sent: 0,
      opened: 0,
      clicked: 0,
      submitted: 0,
    });
  }

  const idx = new Map<string, number>();
  points.forEach((p, i) => idx.set(p.date.toISOString(), i));

  for (const user of users) {
    const events = user.events ?? [];
    for (const ev of events) {
      const d = parseTs(ev.timestamp as any);
      if (!d) continue;
      const key = startOfDay(d).toISOString();
      const i = idx.get(key);
      if (i === undefined) continue;
      const type = (ev.type || "").toUpperCase();
      if (type === "EMAIL_SENT" || type === "SENT") points[i].sent++;
      else if (type === "EMAIL_OPENED" || type === "OPENED") points[i].opened++;
      else if (type === "CLICKED") points[i].clicked++;
      else if (type === "SUBMIT" || type === "SUBMITTED") points[i].submitted++;
    }
  }
  return points;
}

function FunnelChart({ users }: Props) {
  const total = users.length;
  const opened = users.filter((u) => u.status?.emailOpened).length;
  const clicked = users.filter((u) => u.status?.linkClicked).length;
  const submitted = users.filter((u) => u.status?.formSubmitted).length;

  const rows = [
    { key: "Enviados", value: total, color: COLORS.sent },
    { key: "Abiertos", value: opened, color: COLORS.opened },
    { key: "Clics", value: clicked, color: COLORS.clicked },
    { key: "Datos enviados", value: submitted, color: COLORS.submitted },
  ];
  const max = Math.max(total, 1);

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.key}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: row.color }}
              />
              {row.key}
            </span>
            <span className="font-medium tabular-nums">{row.value}</span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded bg-muted/40">
            <div
              className="h-full rounded transition-all"
              style={{
                width: `${(row.value / max) * 100}%`,
                backgroundColor: row.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineChart({ users }: Props) {
  const points = buildTimeline(users);
  const width = 560;
  const height = 180;
  const pad = { top: 12, right: 8, bottom: 24, left: 32 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const maxVal = Math.max(...points.map((p) => p.sent + p.opened + p.clicked + p.submitted), 1);
  const n = Math.max(points.length, 1);
  const slot = innerW / n;
  const barW = Math.max(6, slot * 0.55);

  const y = (v: number) => pad.top + innerH - (v / maxVal) * innerH;
  const series: { key: keyof TimelinePoint; color: string }[] = [
    { key: "sent", color: COLORS.sent },
    { key: "opened", color: COLORS.opened },
    { key: "clicked", color: COLORS.clicked },
    { key: "submitted", color: COLORS.submitted },
  ];

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Actividad por día"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const yy = pad.top + innerH * t;
          return (
            <g key={t}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={yy}
                y2={yy}
                stroke="currentColor"
                strokeOpacity={0.12}
              />
              <text
                x={pad.left - 6}
                y={yy + 3}
                textAnchor="end"
                fontSize="9"
                fill="currentColor"
                fillOpacity={0.5}
              >
                {Math.round(maxVal * (1 - t))}
              </text>
            </g>
          );
        })}

        {points.map((p, i) => {
          let cum = 0;
          const bars = series.map((s) => {
            const v = p[s.key] as number;
            const el = (
              <rect
                key={s.key}
                x={pad.left + i * slot + (slot - barW) / 2}
                y={y(cum + v)}
                width={barW}
                height={Math.max(0, (v / maxVal) * innerH)}
                fill={s.color}
                rx={2}
              />
            );
            cum += v;
            return el;
          });
          return <g key={i}>{bars}</g>;
        })}

        {points.map((p, i) => (
          <text
            key={i}
            x={pad.left + i * slot + slot / 2}
            y={height - 6}
            textAnchor="middle"
            fontSize="9"
            fill="currentColor"
            fillOpacity={0.6}
          >
            {p.label}
          </text>
        ))}
      </svg>

      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            {s.key[0].toUpperCase() + s.key.slice(1)}
          </span>
        ))}
      </div>
    </div>
  );
}

function CountryChart({ users }: Props) {
  const counts = new Map<string, number>();
  for (const user of users) {
    const evs = user.events ?? [];
    let country: string | undefined;
    for (const ev of evs) {
      if ((ev.type || "").toUpperCase() === "CLICKED") {
        country = (ev.data as any)?.geolocation?.country;
        if (country) break;
      }
    }
    if (!country) country = (user.metadata?.geolocation as any)?.country;
    if (!country || country === "unknown" || country === "Local Network") continue;
    counts.set(country, (counts.get(country) ?? 0) + 1);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = Math.max(...sorted.map(([, v]) => v), 1);

  if (sorted.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Sin datos de geolocalización todavía.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map(([country, value]) => (
        <div key={country}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="truncate">{country}</span>
            <span className="ml-2 shrink-0 font-medium tabular-nums">{value}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded bg-muted/40">
            <div
              className="h-full rounded bg-gradient-to-r from-emerald-500 to-teal-400"
              style={{ width: `${(value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardCharts({ users }: Props) {
  const totals = {
    total: users.length,
    opened: users.filter((u) => u.status?.emailOpened).length,
    clicked: users.filter((u) => u.status?.linkClicked).length,
    submitted: users.filter((u) => u.status?.formSubmitted).length,
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Total usuarios</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{totals.total}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {(totals.total ? (totals.clicked / totals.total) * 100 : 0).toFixed(1)}% clickeó
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Clics</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{totals.clicked}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {(totals.total ? (totals.opened / totals.total) * 100 : 0).toFixed(1)}% de apertura
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Datos capturados</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{totals.submitted}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {(totals.total ? (totals.submitted / totals.total) * 100 : 0).toFixed(1)}% del total
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-medium">Embudo de conversión</h3>
          <FunnelChart users={users} />
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-medium">Países con más actividad</h3>
          <CountryChart users={users} />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-medium">Actividad por día (últimos 14 días)</h3>
        <TimelineChart users={users} />
      </div>
    </div>
  );
}
