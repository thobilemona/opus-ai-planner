import { Calendar, Clock, GripVertical, Trash2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { isOverdue, priorityClass } from "@/lib/productivity";
import type { Task } from "@/lib/types";

export function TaskCard({
  task,
  onToggle,
  onDelete,
  onOpen,
  draggable,
  compact,
}: {
  task: Task;
  onToggle?: () => void;
  onDelete?: () => void;
  onOpen?: () => void;
  draggable?: boolean;
  compact?: boolean;
}) {
  const overdue = isOverdue(task);
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
      className={cn(
        "surface-card group p-3 transition-all duration-200 hover:-translate-y-0.5",
        draggable && "cursor-grab active:cursor-grabbing",
        overdue && "border-destructive/40",
      )}
    >
      <div className="flex items-start gap-2">
        {draggable && <GripVertical className="mt-1 size-4 shrink-0 text-muted-foreground/60" />}
        {onToggle && (
          <Checkbox
            checked={task.status === "done"}
            onCheckedChange={onToggle}
            className="mt-1"
            aria-label="Complete task"
          />
        )}
        <button className="min-w-0 flex-1 text-left" onClick={onOpen} type="button">
          <p
            className={cn(
              "text-sm font-medium leading-snug",
              task.status === "done" && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </p>
          {!compact && task.notes && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.notes}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={cn("text-[11px]", priorityClass(task.priority))}>
              {task.priority}
            </Badge>
            {task.category && (
              <Badge variant="secondary" className="text-[11px]">
                {task.category}
              </Badge>
            )}
            {task.dueDate && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[11px]",
                  overdue ? "text-destructive" : "text-muted-foreground",
                )}
              >
                <Calendar className="size-3" />
                {task.dueDate}
              </span>
            )}
            {task.estimateMins > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="size-3" />
                {task.estimateMins}m
              </span>
            )}
            {task.assignee && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <User className="size-3" />
                {task.assignee}
              </span>
            )}
          </div>
          {task.subtasks.length > 0 && !compact && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length} subtasks
            </p>
          )}
        </button>
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={onDelete}
            aria-label="Delete task"
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}