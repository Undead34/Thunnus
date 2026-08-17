import type { PhishingUser } from "@/types";
import { useState } from "react";

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

interface HourPoint {
  label: string;
  date: Date;
  total: number;
}

function buildHourlyTimeline(users: PhishingUser[], hours = 48): HourPoint[] {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const points: HourPoint[] = [];
  for (let i = hours - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(d.getHours() - i);
    points.push({
      label: d.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      date: d,
      total: 0,
    });
  }

  const idx = new Map<string, number>();
  points.forEach((p, i) => idx.set(p.date.getTime(), i));

  for (const user of users) {
    const events = user.events ?? [];
    for (const ev of events) {
      const d = parseTs(ev.timestamp as any);
      if (!d) continue;
      const h = new Date(d);
      h.setMinutes(0, 0, 0);
      const i = idx.get(h.getTime());
      if (i === undefined) continue;
      points[i].total++;
    }
  }
  return points;
}

// Matriz 7 días × 24 horas con el total de interacciones
function buildHeatmap(users: PhishingUser[], days = 7): { day: string; hours: number[] }[] {
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const grid = Array.from({ length: days }, () => Array(24).fill(0) as number[]);
  const now = new Date();
  const nowStart = startOfDay(now);

  for (const user of users) {
    const events = user.events ?? [];
    for (const ev of events) {
      const d = parseTs(ev.timestamp as any);
      if (!d) continue;
      const start = startOfDay(d);
      const dayDiff = Math.floor((nowStart.getTime() - start.getTime()) / 86400000);
      if (dayDiff < 0 || dayDiff >= days) continue;
      grid[dayDiff][d.getHours()]++;
    }
  }

  return grid.map((hours, i) => {
    const dayDate = new Date(nowStart);
    dayDate.setDate(dayDate.getDate() - (days - 1 - i));
    return { day: dayNames[dayDate.getDay()], hours };
  });
}

function HeatmapChart({ users }: Props) {
  const [days, setDays] = useState(7);
  const grid = buildHeatmap(users, days);
  const max = Math.max(...grid.flatMap((g) => g.hours), 1);

  const colorFor = (v: number) => {
    const t = v / max;
    if (t === 0) return "var(--muted-foreground, #94a3b8)";
    const alpha = 0.15 + t * 0.85;
    return `rgba(239, 68, 68, ${alpha})`;
  };

  const cellW = 16;
  const cellH = 16;
  const gap = 3;
  const width = 24 * (cellW + gap) - gap + 40;
  const height = days * (cellH + gap) - gap;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex overflow-hidden rounded border text-xs">
          {[7, 14, 30].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setDays(n)}
              className={`px-3 py-1.5 transition-colors ${
                days === n
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted"
              }`}
            >
              {n}d
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          Intensidad de interacciones por día y hora
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-[360px]"
          role="img"
          aria-label="Heatmap de actividad por día y hora"
        >
          {grid.map((row, di) => (
            <g key={di}>
              <text
                x={36}
                y={di * (cellH + gap) + 12}
                textAnchor="end"
                fontSize="10"
                fill="currentColor"
                fillOpacity={0.7}
              >
                {row.day}
              </text>
              {row.hours.map((v, hi) => (
                <rect
                  key={hi}
                  x={40 + hi * (cellW + gap)}
                  y={di * (cellH + gap)}
                  width={cellW}
                  height={cellH}
                  rx={3}
                  fill={colorFor(v)}
                >
                  <title>{`${row.day} ${String(hi).padStart(2, "0")}:00 — ${v} interacciones`}</title>
                </rect>
              ))}
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-2 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
        <span>Menos</span>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <span
            key={t}
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: colorFor(t * max) }}
          />
        ))}
        <span>Más</span>
      </div>
    </div>
  );
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
  const [mode, setMode] = useState<"daily" | "hourly">("daily");
  const points = buildTimeline(users);
  const hourly = buildHourlyTimeline(users);
  const active = mode === "daily" ? points : hourly;

  const width = 560;
  const height = 180;
  const pad = { top: 12, right: 8, bottom: 24, left: 32 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const isDaily = mode === "daily";
  const maxVal = Math.max(
    ...(isDaily
      ? active.map((p) => (p as TimelinePoint).sent + (p as TimelinePoint).opened + (p as TimelinePoint).clicked + (p as TimelinePoint).submitted)
      : active.map((p) => (p as HourPoint).total)),
    1
  );
  const n = Math.max(active.length, 1);
  const slot = innerW / n;
  const barW = Math.max(2, slot * 0.6);

  const y = (v: number) => pad.top + innerH - (v / maxVal) * innerH;
  const series: { key: keyof TimelinePoint; color: string }[] = [
    { key: "sent", color: COLORS.sent },
    { key: "opened", color: COLORS.opened },
    { key: "clicked", color: COLORS.clicked },
    { key: "submitted", color: COLORS.submitted },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex overflow-hidden rounded border text-xs">
          <button
            type="button"
            onClick={() => setMode("daily")}
            className={`px-3 py-1.5 transition-colors ${
              mode === "daily"
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted"
            }`}
          >
            Días (14)
          </button>
          <button
            type="button"
            onClick={() => setMode("hourly")}
            className={`px-3 py-1.5 transition-colors ${
              mode === "hourly"
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted"
            }`}
          >
            Horas (48)
          </button>
        </div>
        <span className="text-xs text-muted-foreground">
          {isDaily
            ? "Interacciones apiladas por día"
            : "Total de interacciones por hora"}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Actividad por día o por hora"
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

        {active.map((p, i) => {
          if (isDaily) {
            let cum = 0;
            const bars = series.map((s) => {
              const v = (p as TimelinePoint)[s.key] as number;
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
          }
          const v = (p as HourPoint).total;
          return (
            <rect
              key={i}
              x={pad.left + i * slot + (slot - barW) / 2}
              y={y(v)}
              width={barW}
              height={Math.max(0, (v / maxVal) * innerH)}
              fill={COLORS.opened}
              rx={2}
            >
              <title>{`${p.label} — ${v} interacciones`}</title>
            </rect>
          );
        })}

        {active.map((p, i) => {
          const showEvery = isDaily ? 1 : Math.ceil(n / 24);
          if (i % showEvery !== 0) return null;
          return (
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
          );
        })}
      </svg>

      {isDaily && (
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
      )}
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

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

function fmtDuration(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "-";
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) {
    const m = Math.floor(sec / 60);
    return `${m}m ${Math.round(sec % 60)}s`;
  }
  const h = Math.floor(sec / 3600);
  return `${h}h ${Math.round((sec % 3600) / 60)}m`;
}

interface StageStats {
  label: string;
  p50: number;
  p90: number;
  p99: number;
  count: number;
}

function computeStageStats(users: PhishingUser[]): StageStats[] {
  // For each user, collect the first timestamp of each event stage
  const firstTs = new Map<string, Map<string, number>>();

  for (const user of users) {
    const userMap = new Map<string, number>();
    const events = user.events ?? [];
    for (const ev of events) {
      const t = parseTs(ev.timestamp as any);
      if (!t) continue;
      const type = (ev.type || "").toUpperCase();
      let stage: string | null = null;
      if (type === "EMAIL_SENT" || type === "SENT") stage = "sent";
      else if (type === "EMAIL_OPENED" || type === "OPENED") stage = "opened";
      else if (type === "CLICKED") stage = "clicked";
      else if (type === "SUBMIT" || type === "SUBMITTED") stage = "submitted";
      if (!stage) continue;
      const ms = t.getTime();
      if (!userMap.has(stage) || ms < userMap.get(stage)!) {
        userMap.set(stage, ms);
      }
    }
    if (userMap.size > 1) {
      firstTs.set(user.id, userMap);
    }
  }

  const pairs: [string, string][] = [
    ["sent", "opened"],
    ["opened", "clicked"],
    ["clicked", "submitted"],
    ["sent", "submitted"],
  ];
  const labels: Record<string, string> = {
    "sent|opened": "Envío → Apertura",
    "opened|clicked": "Apertura → Clic",
    "clicked|submitted": "Clic → Datos",
    "sent|submitted": "Envío → Datos (total)",
  };

  const stages: StageStats[] = [];

  for (const [a, b] of pairs) {
    const deltas: number[] = [];
    for (const userMap of firstTs.values()) {
      const ta = userMap.get(a);
      const tb = userMap.get(b);
      if (ta === undefined || tb === undefined) continue;
      const deltaSec = (tb - ta) / 1000;
      if (deltaSec < 0) continue;
      deltas.push(deltaSec);
    }
    deltas.sort((x, y) => x - y);
    stages.push({
      label: labels[`${a}|${b}`],
      p50: percentile(deltas, 50),
      p90: percentile(deltas, 90),
      p99: percentile(deltas, 99),
      count: deltas.length,
    });
  }

  return stages;
}

function InteractionPercentiles({ users }: Props) {
  const stages = computeStageStats(users);

  const colWidths = "w-[200px]";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className={`${colWidths} py-2 pr-4 font-medium`}>Interacción</th>
            <th className="py-2 pr-4 text-right font-medium">p50</th>
            <th className="py-2 pr-4 text-right font-medium">p90</th>
            <th className="py-2 text-right font-medium">p99</th>
            <th className="py-2 pl-4 text-right font-medium">N</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((s) => (
            <tr key={s.label} className="border-b last:border-0">
              <td className={`${colWidths} py-2.5 pr-4 font-medium`}>{s.label}</td>
              <td className="py-2.5 pr-4 text-right tabular-nums">
                {fmtDuration(s.p50)}
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums">
                <span className="text-amber-600 dark:text-amber-400">
                  {fmtDuration(s.p90)}
                </span>
              </td>
              <td className="py-2.5 text-right font-semibold tabular-nums">
                <span className="text-red-600 dark:text-red-400">
                  {fmtDuration(s.p99)}
                </span>
              </td>
              <td className="py-2.5 pl-4 text-right text-muted-foreground tabular-nums">
                {s.count}
              </td>
            </tr>
          ))}
          {stages.every((s) => s.count === 0) && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-muted-foreground">
                Aún no hay suficientes eventos para calcular percentiles.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-muted-foreground">
        p50 = mediana · p90 = 90% lo hace en menos · p99 = casos más lentos. Basado en el primer
        evento de cada etapa por usuario.
      </p>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-medium">Actividad por día (últimos 14 días)</h3>
          <TimelineChart users={users} />
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-medium">Heatmap de actividad (día × hora)</h3>
          <HeatmapChart users={users} />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-medium">
          Latencia de interacciones (percentiles)
        </h3>
        <InteractionPercentiles users={users} />
      </div>
    </div>
  );
}
