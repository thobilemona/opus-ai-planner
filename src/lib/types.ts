export type Priority = "urgent" | "high" | "medium" | "low";
export type TaskStatus = "todo" | "in_progress" | "done";
export type Tone = "formal" | "casual" | "friendly" | "business" | "persuasive";

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  priority: Priority;
  status: TaskStatus;
  category: string;
  assignee: string;
  dueDate: string; // yyyy-MM-dd or ""
  estimateMins: number;
  subtasks: Subtask[];
  scheduledStart: string; // ISO datetime or ""
  source: string;
  createdAt: string;
}

export interface EmailDraft {
  id: string;
  subject: string;
  body: string;
  tone: Tone;
  purpose: string;
  instruction: string;
  createdAt: string;
}

export interface ActionItem {
  title: string;
  assignee: string;
  dueDate: string;
  priority: Priority;
  estimateMins: number;
}

export interface Meeting {
  id: string;
  title: string;
  summary: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: ActionItem[];
  deadlines: { label: string; date: string }[];
  nextSteps: string[];
  notes: string;
  createdAt: string;
  scheduledAt: string;
}

export const PRIORITY_WEIGHT: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};