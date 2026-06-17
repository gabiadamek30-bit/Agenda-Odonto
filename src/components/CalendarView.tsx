import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const HOUR_HEIGHT = 56;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time?: string;
  endTime?: string;
  kind: string;
  tab: string;
};

export const CATEGORY_CONFIG: Record<string, { bg: string; light: string; text: string }> = {
  Clínica:     { bg: "bg-pink-500",    light: "bg-pink-100",    text: "text-pink-700" },
  Laboratório: { bg: "bg-violet-500",  light: "bg-violet-100",  text: "text-violet-700" },
  Matéria:     { bg: "bg-blue-500",    light: "bg-blue-100",    text: "text-blue-700" },
  Estágio:     { bg: "bg-emerald-500", light: "bg-emerald-100", text: "text-emerald-700" },
  Prova:       { bg: "bg-red-500",     light: "bg-red-100",     text: "text-red-700" },
  TBL:         { bg: "bg-amber-500",   light: "bg-amber-100",   text: "text-amber-700" },
  Trabalho:    { bg: "bg-cyan-600",    light: "bg-cyan-100",    text: "text-cyan-700" },
  IC:          { bg: "bg-indigo-500",  light: "bg-indigo-100",  text: "text-indigo-700" },
  Pessoal:     { bg: "bg-fuchsia-500", light: "bg-fuchsia-100", text: "text-fuchsia-700" },
  Tarefa:      { bg: "bg-slate-500",   light: "bg-slate-100",   text: "text-slate-600" },
};

export function CalendarView({
  events,
  onEventClick,
}: {
  events: CalendarEvent[];
  onEventClick?: (tab: string) => void;
}) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [activeKinds, setActiveKinds] = useState<Set<string>>(
    () => new Set(Object.keys(CATEGORY_CONFIG)),
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    const now = new Date();
    const top = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT - 120;
    scrollRef.current.scrollTop = Math.max(0, top);
  }, []);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const filteredEvents = useMemo(
    () => events.filter((e) => activeKinds.has(e.kind) && e.date),
    [events, activeKinds],
  );

  const byDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    filteredEvents.forEach((e) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [filteredEvents]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const isCurrentWeek = toDateStr(weekStart) === toDateStr(getWeekStart(new Date()));
  const nowTop = (new Date().getHours() + new Date().getMinutes() / 60) * HOUR_HEIGHT;

  const toggleKind = (k: string) =>
    setActiveKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const weekLabel = `${weekStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${addDays(weekStart, 6).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`;

  const hasAllDay = weekDays.some((d) =>
    (byDate[toDateStr(d)] || []).some((e) => !e.time),
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Week navigation */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-pink-200"
          onClick={() => setWeekStart(getWeekStart(new Date()))}
        >
          Hoje
        </Button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[180px] text-center text-sm font-medium">{weekLabel}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekStart((w) => addDays(w, 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="w-16" />
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(CATEGORY_CONFIG).map(([kind, cfg]) => (
          <button
            key={kind}
            onClick={() => toggleKind(kind)}
            className={`rounded-full border px-3 py-0.5 text-xs font-medium transition-all ${
              activeKinds.has(kind)
                ? `${cfg.bg} border-transparent text-white`
                : `bg-white ${cfg.text} border-current opacity-60 hover:opacity-100`
            }`}
          >
            {kind}
          </button>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="overflow-hidden rounded-xl border border-pink-100 bg-white shadow-sm">
        {/* Sticky day header */}
        <div className="sticky top-0 z-10 flex border-b border-pink-100 bg-white">
          <div className="w-12 shrink-0 border-r border-pink-100" />
          {weekDays.map((day, i) => {
            const isToday = day.getTime() === today.getTime();
            return (
              <div
                key={i}
                className="flex min-w-0 flex-1 flex-col items-center border-r border-pink-100 py-2 last:border-r-0"
              >
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {DAY_LABELS[i]}
                </span>
                <span
                  className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                    isToday ? "bg-pink-600 text-white" : "text-foreground"
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>
            );
          })}
        </div>

        {/* All-day strip */}
        {hasAllDay && (
          <div className="flex border-b border-pink-100">
            <div className="flex w-12 shrink-0 items-center justify-end border-r border-pink-100 pr-1.5">
              <span className="text-[9px] leading-tight text-muted-foreground">dia{"\n"}todo</span>
            </div>
            {weekDays.map((day, i) => {
              const allDay = (byDate[toDateStr(day)] || []).filter((e) => !e.time);
              return (
                <div
                  key={i}
                  className="flex min-h-[28px] flex-1 flex-col gap-0.5 border-r border-pink-100 p-0.5 last:border-r-0"
                >
                  {allDay.map((e) => {
                    const cfg = CATEGORY_CONFIG[e.kind] ?? CATEGORY_CONFIG["Clínica"];
                    return (
                      <button
                        key={e.id}
                        onClick={() => onEventClick?.(e.tab)}
                        title={e.title}
                        className={`${cfg.bg} w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium text-white hover:opacity-80`}
                      >
                        {e.title}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Scrollable 24h grid */}
        <div
          ref={scrollRef}
          className="overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 360px)", minHeight: "400px" }}
        >
          <div className="relative flex" style={{ height: `${HOUR_HEIGHT * 24}px` }}>
            {/* Hour labels */}
            <div className="w-12 shrink-0 border-r border-pink-100">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="relative border-b border-pink-50"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                >
                  {h > 0 && (
                    <span className="absolute -top-2.5 right-1.5 text-[10px] tabular-nums text-muted-foreground">
                      {String(h).padStart(2, "0")}h
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day, i) => {
              const dateStr = toDateStr(day);
              const timedEvents = (byDate[dateStr] || []).filter((e) => !!e.time);
              const isToday = day.getTime() === today.getTime();

              return (
                <div
                  key={i}
                  className={`relative flex-1 border-r border-pink-100 last:border-r-0 ${
                    isToday ? "bg-pink-50/40" : ""
                  }`}
                >
                  {/* Hour lines */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute w-full border-b border-pink-50"
                      style={{ top: `${h * HOUR_HEIGHT}px` }}
                    />
                  ))}

                  {/* Current time indicator */}
                  {isToday && isCurrentWeek && (
                    <div
                      className="absolute z-10 w-full"
                      style={{ top: `${nowTop}px` }}
                    >
                      <div className="flex items-center">
                        <div className="h-2 w-2 shrink-0 rounded-full bg-pink-600" style={{ marginLeft: "-4px" }} />
                        <div className="h-px w-full bg-pink-600" />
                      </div>
                    </div>
                  )}

                  {/* Timed events */}
                  {timedEvents.map((e) => {
                    const [hh, mm] = (e.time || "00:00").split(":").map(Number);
                    const top = (hh + mm / 60) * HOUR_HEIGHT;
                    let height = 28;
                    if (e.endTime) {
                      const [eh, em] = e.endTime.split(":").map(Number);
                      height = Math.max(28, (eh + em / 60 - hh - mm / 60) * HOUR_HEIGHT);
                    }
                    const cfg = CATEGORY_CONFIG[e.kind] ?? CATEGORY_CONFIG["Clínica"];
                    return (
                      <button
                        key={e.id}
                        onClick={() => onEventClick?.(e.tab)}
                        title={`${e.title} · ${e.time}${e.endTime ? "–" + e.endTime : ""}`}
                        className={`absolute inset-x-0.5 overflow-hidden rounded px-1.5 py-0.5 text-left shadow-sm transition hover:opacity-80 ${cfg.bg}`}
                        style={{ top: `${top}px`, height: `${height}px` }}
                      >
                        <div className="truncate text-[10px] font-semibold leading-tight text-white">
                          {e.title}
                        </div>
                        <div className="text-[9px] text-white/80">
                          {e.time}{e.endTime ? `–${e.endTime}` : ""}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
