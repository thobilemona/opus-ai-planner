import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  ListChecks,
  Loader2,
  Mail,
  NotebookPen,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/app-shell";
import { TaskCard } from "@/components/app/task-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getRecommendations } from "@/lib/ai.functions";
import { formatTime, isOverdue, scheduledOn, sortTasks, stats } from "@/lib/productivity";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aura — Your AI Executive Assistant" },
      {
        name: "description",
        content:
          "One AI workspace that turns emails and meetings into prioritised tasks and a planned, conflict-free schedule.",
      },
      { property: "og:title", content: "Aura — Your AI Executive Assistant" },
      {
        property: "og:description",
        content: "Dashboard for today's schedule, priority tasks, meetings and AI recommendations.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { tasks, emails, meetings, updateTask } = useStore();
  const navigate = useNavigate();
  const run = useServerFn(getRecommendations);
  const [recs, setRecs] = useState<{ title: string; detail: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const today = useMemo(() => scheduledOn(tasks, new Date()), [tasks]);
  const priority = useMemo(
    () => sortTasks(tasks.filter((t) => t.status !== "done")).slice(0, 5),
    [tasks],
  );
  const overdue = useMemo(() => tasks.filter(isOverdue), [tasks]);
  const s = stats(tasks);

  async function loadRecs() {
    setLoading(true);
    try {
      const snapshot = JSON.stringify({
        today: today.map((t) => ({ title: t.title, at: t.scheduledStart })),
        openTasks: tasks
          .filter((t) => t.status !== "done")
          .slice(0, 20)
          .map((t) => ({ title: t.title, priority: t.priority, due: t.dueDate })),
        overdue: overdue.map((t) => t.title),
        recentMeetings: meetings.slice(0, 3).map((m) => m.title),
      });
      const res = await run({ data: { snapshot } });
      setRecs(res.recommendations ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not fetch recommendations");
    } finally {
      setLoading(false);
    }
  }

  const quickActions = [
    { label: "Generate Email", to: "/email", icon: Mail },
    { label: "Summarize Meeting", to: "/meetings", icon: NotebookPen },
    { label: "Create Task", to: "/tasks", icon: ListChecks },
    { label: "Plan My Day", to: "/schedule", icon: CalendarDays },
  ] as const;

  return (
    <AppShell
      title={`Good ${greeting()}`}
      subtitle={new Date().toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
      })}
    >
      <div className="space-y-6">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="surface-card group flex items-center gap-3 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40"
            >
              <span className="brand-gradient flex size-10 items-center justify-center rounded-lg">
                <a.icon className="size-5 text-primary-foreground" />
              </span>
              <span className="text-sm font-semibold">{a.label}</span>
            </Link>
          ))}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat icon={ListChecks} label="Open tasks" value={s.total - s.done} />
          <Stat icon={Clock} label="Focus time queued" value={`${Math.round(s.focusMins / 60)}h`} />
          <Stat icon={AlertTriangle} label="Overdue" value={s.overdue} tone="destructive" />
          <Stat icon={CheckCircle2} label="Completed" value={s.done} tone="success" />
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <Panel title="Today's schedule" action={<Link to="/schedule" className="text-xs text-primary">Open calendar</Link>}>
              {today.length ? (
                <ul className="space-y-2">
                  {today.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center gap-3 rounded-lg border border-border p-3"
                    >
                      <span className="w-14 text-xs font-semibold text-primary">
                        {formatTime(t.scheduledStart)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                      <Badge variant="secondary">{t.estimateMins}m</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty
                  text="Nothing scheduled yet."
                  cta="Plan my day"
                  onClick={() => navigate({ to: "/schedule" })}
                />
              )}
            </Panel>

            <Panel title="Priority tasks" action={<Link to="/tasks" className="text-xs text-primary">All tasks</Link>}>
              {priority.length ? (
                <div className="space-y-2">
                  {priority.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      compact
                      onToggle={() =>
                        updateTask(t.id, { status: t.status === "done" ? "todo" : "done" })
                      }
                    />
                  ))}
                </div>
              ) : (
                <Empty
                  text="No open tasks."
                  cta="Capture work"
                  onClick={() => navigate({ to: "/tasks" })}
                />
              )}
            </Panel>

            {overdue.length > 0 && (
              <Panel title="Overdue">
                <div className="space-y-2">
                  {overdue.slice(0, 4).map((t) => (
                    <TaskCard key={t.id} task={t} compact />
                  ))}
                </div>
              </Panel>
            )}
          </div>

          <div className="space-y-6">
            <Panel
              title="AI recommendations"
              action={
                <Button size="sm" variant="ghost" onClick={loadRecs} disabled={loading}>
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Refresh
                </Button>
              }
            >
              {recs.length ? (
                <ul className="space-y-3">
                  {recs.map((r, i) => (
                    <li key={i} className="rounded-lg border border-border bg-accent/30 p-3">
                      <p className="text-sm font-medium">{r.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{r.detail}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ask your assistant what deserves your attention right now.
                </p>
              )}
            </Panel>

            <Panel title="Productivity">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Completion rate</span>
                  <span className="font-semibold">{s.completion}%</span>
                </div>
                <Progress value={s.completion} />
                <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                  <MiniStat label="In progress" value={s.inProgress} />
                  <MiniStat label="Meetings" value={meetings.length} />
                  <MiniStat label="Drafts" value={emails.length} />
                </div>
              </div>
            </Panel>

            <Panel title="Recent meeting summaries" action={<Link to="/meetings" className="text-xs text-primary">Open</Link>}>
              {meetings.length ? (
                <ul className="space-y-2">
                  {meetings.slice(0, 3).map((m) => (
                    <li key={m.id} className="rounded-lg border border-border p-3">
                      <p className="truncate text-sm font-medium">{m.title}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{m.summary}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty
                  text="No summaries yet."
                  cta="Summarize a meeting"
                  onClick={() => navigate({ to: "/meetings" })}
                />
              )}
            </Panel>

            <Panel title="Recent emails" action={<Link to="/email" className="text-xs text-primary">Open</Link>}>
              {emails.length ? (
                <ul className="space-y-2">
                  {emails.slice(0, 3).map((e) => (
                    <li key={e.id} className="rounded-lg border border-border p-3">
                      <p className="truncate text-sm font-medium">{e.subject}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{e.body}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty
                  text="No drafts yet."
                  cta="Write an email"
                  onClick={() => navigate({ to: "/email" })}
                />
              )}
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: number | string;
  tone?: "destructive" | "success";
}) {
  return (
    <div className="surface-card flex items-center gap-3 p-4">
      <span
        className={
          tone === "destructive"
            ? "flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
            : tone === "success"
              ? "flex size-10 items-center justify-center rounded-lg bg-success/15 text-success"
              : "flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
        }
      >
        <Icon className="size-5" />
      </span>
      <div>
        <p className="font-display text-xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-2">
      <p className="font-display text-base font-semibold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ text, cta, onClick }: { text: string; cta: string; onClick: () => void }) {
  return (
    <div className="flex flex-col items-start gap-2 py-2">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button size="sm" variant="secondary" onClick={onClick}>
        {cta}
      </Button>
    </div>
  );
}
