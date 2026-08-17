import { PRIORITY_WEIGHT, type Task } from "./types";

export const todayStr = () => new Date().toISOString().slice(0, 10);

export function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isOverdue(task: Task) {
  if (task.status === "done" || !task.dueDate) return false;
  return task.dueDate < todayStr();
}

export function sortTasks(tasks: Task[]) {
  return [...tasks].sort((a, b) => {
    const p = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (p !== 0) return p;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });
}

export function scheduledOn(tasks: Task[], day: Date) {
  const key = dateKey(day);
  return tasks
    .filter((t) => t.scheduledStart && t.scheduledStart.slice(0, 10) === key)
    .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
}

export function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function stats(tasks: Task[]) {
  const done = tasks.filter((t) => t.status === "done").length;
  const overdue = tasks.filter(isOverdue).length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const focusMins = tasks
    .filter((t) => t.status !== "done")
    .reduce((sum, t) => sum + (t.estimateMins || 0), 0);
  return {
    total: tasks.length,
    done,
    overdue,
    inProgress,
    focusMins,
    completion: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
  };
}

export function priorityClass(priority: Task["priority"]) {
  switch (priority) {
    case "urgent":
      return "bg-destructive/15 text-destructive border-destructive/30";
    case "high":
      return "bg-warning/20 text-warning-foreground border-warning/40 dark:text-warning";
    case "medium":
      return "bg-primary/12 text-primary border-primary/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}