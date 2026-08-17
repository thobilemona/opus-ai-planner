import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/app-shell";
import { TaskCard } from "@/components/app/task-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { planTasks } from "@/lib/ai.functions";
import { isOverdue, sortTasks } from "@/lib/productivity";
import { taskFromAi, uid, useStore } from "@/lib/store";
import type { Priority, Task, TaskStatus } from "@/lib/types";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "AI Task Planner — Aura AI Assistant" },
      {
        name: "description",
        content:
          "Capture anything and let AI break it into prioritised tasks with subtasks, deadlines and estimates.",
      },
      { property: "og:title", content: "AI Task Planner — Aura AI Assistant" },
      {
        property: "og:description",
        content: "A prioritised task board that builds itself from your emails and meetings.",
      },
    ],
  }),
  component: TasksPage,
});

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "To Do" },
  { status: "in_progress", label: "In Progress" },
  { status: "done", label: "Completed" },
];

function TasksPage() {
  const { tasks, addTasks, updateTask, removeTask } = useStore();
  const run = useServerFn(planTasks);
  const [capture, setCapture] = useState("");
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | Priority | "overdue">("all");
  const [editing, setEditing] = useState<Task | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return sortTasks(
      tasks.filter((t) => {
        const matches =
          !q ||
          t.title.toLowerCase().includes(q) ||
          t.notes.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q);
        const passes =
          filter === "all" ? true : filter === "overdue" ? isOverdue(t) : t.priority === filter;
        return matches && passes;
      }),
    );
  }, [tasks, query, filter]);

  async function handlePlan() {
    if (!capture.trim()) return;
    setLoading(true);
    try {
      const res = await run({ data: { text: capture, context: "Personal work planning" } });
      const created = (res.tasks ?? []).map((t) => taskFromAi(t, "AI capture"));
      if (!created.length) {
        toast.error("No tasks found in that input.");
        return;
      }
      addTasks(created);
      setCapture("");
      toast.success(`${created.length} tasks created and prioritised`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Planning failed");
    } finally {
      setLoading(false);
    }
  }

  function quickAdd() {
    const task: Task = {
      id: uid(),
      title: "New task",
      notes: "",
      priority: "medium",
      status: "todo",
      category: "General",
      assignee: "",
      dueDate: "",
      estimateMins: 30,
      subtasks: [],
      scheduledStart: "",
      source: "Manual",
      createdAt: new Date().toISOString(),
    };
    addTasks([task]);
    setEditing(task);
  }

  return (
    <AppShell
      title="Task Planner"
      subtitle="Prioritised automatically by urgency and impact"
      actions={
        <Button size="sm" onClick={quickAdd}>
          <Plus className="size-4" /> New task
        </Button>
      }
    >
      <div className="space-y-6">
        <section className="surface-card space-y-3 p-5">
          <Label htmlFor="capture">Capture anything</Label>
          <Textarea
            id="capture"
            rows={3}
            placeholder="Prepare the investor update, chase the design review, and ship the billing fix before Friday…"
            value={capture}
            onChange={(e) => setCapture(e.target.value)}
          />
          <Button onClick={handlePlan} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Turn into tasks
          </Button>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-52 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search tasks"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="overdue">Overdue only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {COLUMNS.map((col) => {
            const items = filtered.filter((t) => t.status === col.status);
            return (
              <div
                key={col.status}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) updateTask(id, { status: col.status });
                }}
                className="rounded-xl border border-dashed border-border bg-muted/30 p-3"
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold">{col.label}</h2>
                  <Badge variant="secondary">{items.length}</Badge>
                </div>
                <div className="space-y-3">
                  {items.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      draggable
                      onToggle={() =>
                        updateTask(task.id, {
                          status: task.status === "done" ? "todo" : "done",
                        })
                      }
                      onDelete={() => removeTask(task.id)}
                      onOpen={() => setEditing(task)}
                    />
                  ))}
                  {!items.length && (
                    <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                      Drag tasks here
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <TaskDialog
        task={editing}
        onClose={() => setEditing(null)}
        onSave={(patch) => {
          if (editing) updateTask(editing.id, patch);
          setEditing(null);
          toast.success("Task updated");
        }}
        onToggleSubtask={(subtaskId) => {
          if (!editing) return;
          const subtasks = editing.subtasks.map((s) =>
            s.id === subtaskId ? { ...s, done: !s.done } : s,
          );
          updateTask(editing.id, { subtasks });
          setEditing({ ...editing, subtasks });
        }}
      />
    </AppShell>
  );
}

function TaskDialog({
  task,
  onClose,
  onSave,
  onToggleSubtask,
}: {
  task: Task | null;
  onClose: () => void;
  onSave: (patch: Partial<Task>) => void;
  onToggleSubtask: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Task | null>(task);
  if (task && draft?.id !== task.id) setDraft(task);
  if (!task || !draft) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={draft.priority}
                onValueChange={(v) => setDraft({ ...draft, priority: v as Priority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["urgent", "high", "medium", "low"].map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={draft.status}
                onValueChange={(v) => setDraft({ ...draft, status: v as TaskStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Input
                type="date"
                value={draft.dueDate}
                onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Estimate (mins)</Label>
              <Input
                type="number"
                min={5}
                step={5}
                value={draft.estimateMins}
                onChange={(e) => setDraft({ ...draft, estimateMins: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Assignee</Label>
              <Input
                value={draft.assignee}
                onChange={(e) => setDraft({ ...draft, assignee: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Scheduled start</Label>
            <Input
              type="datetime-local"
              value={draft.scheduledStart ? draft.scheduledStart.slice(0, 16) : ""}
              onChange={(e) =>
                setDraft({ ...draft, scheduledStart: e.target.value ? `${e.target.value}:00` : "" })
              }
            />
          </div>
          {task.subtasks.length > 0 && (
            <div className="space-y-2">
              <Label>Subtasks</Label>
              {task.subtasks.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={s.done} onCheckedChange={() => onToggleSubtask(s.id)} />
                  <span className={s.done ? "text-muted-foreground line-through" : ""}>
                    {s.title}
                  </span>
                </label>
              ))}
            </div>
          )}
          {task.source && (
            <p className="text-xs text-muted-foreground">Captured from: {task.source}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(draft)}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
