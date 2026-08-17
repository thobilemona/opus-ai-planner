import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/app-shell";
import { TaskCard } from "@/components/app/task-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { planSchedule } from "@/lib/ai.functions";
import { dateKey, formatTime, priorityClass, scheduledOn, sortTasks } from "@/lib/productivity";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Intelligent Schedule — Aura AI Assistant" },
      {
        name: "description",
        content:
          "Let AI place your tasks and deadlines into a conflict-free daily, weekly or monthly schedule.",
      },
      { property: "og:title", content: "Intelligent Schedule — Aura AI Assistant" },
      {
        property: "og:description",
        content: "Drag-and-drop planning with AI time-slot suggestions and reminders.",
      },
    ],
  }),
  component: SchedulePage,
});

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 - 20:00

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function SchedulePage() {
  const { tasks, updateTask } = useStore();
  const run = useServerFn(planSchedule);
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState("");
  const notified = useRef<Set<string>>(new Set());

  const unscheduled = useMemo(
    () => sortTasks(tasks.filter((t) => !t.scheduledStart && t.status !== "done")),
    [tasks],
  );

  useEffect(() => {
    const check = () => {
      const now = Date.now();
      tasks.forEach((t) => {
        if (!t.scheduledStart || t.status === "done" || notified.current.has(t.id)) return;
        const diff = new Date(t.scheduledStart).getTime() - now;
        if (diff > 0 && diff < 30 * 60 * 1000) {
          notified.current.add(t.id);
          toast(`Starting soon: ${t.title}`, { description: formatTime(t.scheduledStart) });
        }
      });
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [tasks]);

  function move(dir: number) {
    const next = new Date(cursor);
    if (view === "day") next.setDate(next.getDate() + dir);
    else if (view === "week") next.setDate(next.getDate() + dir * 7);
    else next.setMonth(next.getMonth() + dir);
    setCursor(next);
  }

  function dropOn(day: Date, hour: number, id: string) {
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    const iso = `${dateKey(start)}T${String(hour).padStart(2, "0")}:00:00`;
    const clash = tasks.find(
      (t) => t.id !== id && t.scheduledStart === iso && t.status !== "done",
    );
    if (clash) {
      toast.error(`That slot clashes with "${clash.title}"`);
      return;
    }
    updateTask(id, { scheduledStart: iso });
  }

  async function planDay() {
    const target = dateKey(cursor);
    const pool = unscheduled.slice(0, 12).map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      dueDate: t.dueDate,
      estimateMins: t.estimateMins,
    }));
    if (!pool.length) {
      toast.error("Nothing left to schedule — add some tasks first.");
      return;
    }
    const busy = scheduledOn(tasks, cursor)
      .map((t) => `${formatTime(t.scheduledStart)} ${t.title} (${t.estimateMins}m)`)
      .join("; ");
    setLoading(true);
    try {
      const res = await run({
        data: { date: target, workingHours: "09:00-17:30", tasks: JSON.stringify(pool), busy },
      });
      let placed = 0;
      (res.blocks ?? []).forEach((b) => {
        const task = tasks.find((t) => t.id === b.taskId);
        if (!task || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(b.start)) return;
        updateTask(task.id, {
          scheduledStart: b.start.slice(0, 19),
          estimateMins: b.durationMins || task.estimateMins,
        });
        placed += 1;
      });
      setAdvice(res.advice ?? "");
      toast.success(placed ? `${placed} tasks scheduled for ${target}` : "No changes suggested");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Planning failed");
    } finally {
      setLoading(false);
    }
  }

  const weekStart = startOfWeek(cursor);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const days = view === "day" ? [cursor] : weekDays;

  const label =
    view === "month"
      ? cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })
      : view === "day"
        ? cursor.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })
        : `${weekDays[0]!.toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${weekDays[6]!.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;

  return (
    <AppShell
      title="Schedule"
      subtitle="Drag tasks onto a slot, or let the assistant plan the day for you"
      actions={
        <Button size="sm" onClick={planDay} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Plan my day
        </Button>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => move(-1)} aria-label="Previous">
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => move(1)} aria-label="Next">
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <p className="font-display text-base font-semibold">{label}</p>
            <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
              Today
            </Button>
            <Tabs
              value={view}
              onValueChange={(v) => setView(v as typeof view)}
              className="ml-auto"
            >
              <TabsList>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {advice && (
            <div className="surface-card border-primary/30 bg-accent/40 p-4 text-sm">{advice}</div>
          )}

          {view === "month" ? (
            <MonthGrid cursor={cursor} tasks={tasks} onPick={(d) => { setCursor(d); setView("day"); }} />
          ) : (
            <div className="surface-card overflow-x-auto p-2">
              <div
                className="grid min-w-[560px]"
                style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0,1fr))` }}
              >
                <div />
                {days.map((d) => (
                  <div key={d.toISOString()} className="px-2 pb-2 text-center">
                    <p className="text-xs uppercase text-muted-foreground">
                      {d.toLocaleDateString(undefined, { weekday: "short" })}
                    </p>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        dateKey(d) === dateKey(new Date()) && "text-primary",
                      )}
                    >
                      {d.getDate()}
                    </p>
                  </div>
                ))}
                {HOURS.map((hour) => (
                  <div key={hour} className="contents">
                    <div className="border-t border-border px-2 py-1 text-right text-[11px] text-muted-foreground">
                      {String(hour).padStart(2, "0")}:00
                    </div>
                    {days.map((d) => {
                      const slotTasks = scheduledOn(tasks, d).filter(
                        (t) => new Date(t.scheduledStart).getHours() === hour,
                      );
                      return (
                        <div
                          key={`${d.toISOString()}-${hour}`}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            const id = e.dataTransfer.getData("text/plain");
                            if (id) dropOn(d, hour, id);
                          }}
                          className="min-h-12 border-l border-t border-border p-1 transition-colors hover:bg-accent/30"
                        >
                          {slotTasks.map((t) => (
                            <div
                              key={t.id}
                              draggable
                              onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                              onDoubleClick={() => updateTask(t.id, { scheduledStart: "" })}
                              title="Double-click to unschedule"
                              className={cn(
                                "mb-1 cursor-grab rounded-md border px-2 py-1 text-[11px] leading-tight",
                                priorityClass(t.priority),
                              )}
                            >
                              <p className="line-clamp-2 font-medium">{t.title}</p>
                              <p className="opacity-70">{t.estimateMins}m</p>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Unscheduled</h2>
            <Badge variant="secondary">{unscheduled.length}</Badge>
          </div>
          {unscheduled.map((t) => (
            <TaskCard key={t.id} task={t} draggable compact />
          ))}
          {!unscheduled.length && (
            <p className="text-sm text-muted-foreground">Everything is scheduled. Nice work.</p>
          )}
        </aside>
      </div>
    </AppShell>
  );
}

function MonthGrid({
  cursor,
  tasks,
  onPick,
}: {
  cursor: Date;
  tasks: Task[];
  onPick: (d: Date) => void;
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
  return (
    <div className="surface-card grid grid-cols-7 gap-px overflow-hidden p-0">
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
        <div key={d} className="bg-muted/50 py-2 text-center text-xs text-muted-foreground">
          {d}
        </div>
      ))}
      {cells.map((d) => {
        const items = scheduledOn(tasks, d);
        const due = tasks.filter((t) => t.dueDate === dateKey(d) && t.status !== "done");
        return (
          <button
            key={d.toISOString()}
            onClick={() => onPick(d)}
            className={cn(
              "min-h-24 border-t border-l border-border p-2 text-left transition-colors hover:bg-accent/30",
              d.getMonth() !== cursor.getMonth() && "opacity-40",
            )}
          >
            <span
              className={cn(
                "text-xs font-semibold",
                dateKey(d) === dateKey(new Date()) && "text-primary",
              )}
            >
              {d.getDate()}
            </span>
            <div className="mt-1 space-y-1">
              {items.slice(0, 2).map((t) => (
                <p key={t.id} className="truncate text-[10px] text-muted-foreground">
                  {formatTime(t.scheduledStart)} {t.title}
                </p>
              ))}
              {items.length > 2 && (
                <p className="text-[10px] text-muted-foreground">+{items.length - 2} more</p>
              )}
              {due.length > 0 && (
                <p className="text-[10px] font-medium text-destructive">{due.length} due</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
