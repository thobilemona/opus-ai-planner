import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AiTask } from "./ai-schemas";
import type { EmailDraft, Meeting, Task } from "./types";

const KEY = "aura-workspace-v1";

interface StoreState {
  tasks: Task[];
  emails: EmailDraft[];
  meetings: Meeting[];
}

const empty: StoreState = { tasks: [], emails: [], meetings: [] };

export const uid = () => Math.random().toString(36).slice(2, 10);

export function taskFromAi(ai: AiTask, source: string): Task {
  return {
    id: uid(),
    title: ai.title,
    notes: ai.notes ?? "",
    priority: ai.priority,
    status: "todo",
    category: ai.category || "General",
    assignee: ai.assignee || "",
    dueDate: /^\d{4}-\d{2}-\d{2}$/.test(ai.dueDate) ? ai.dueDate : "",
    estimateMins: ai.estimateMins && ai.estimateMins > 0 ? Math.round(ai.estimateMins) : 30,
    subtasks: (ai.subtasks ?? []).map((t) => ({ id: uid(), title: t, done: false })),
    scheduledStart: "",
    source,
    createdAt: new Date().toISOString(),
  };
}

interface StoreApi extends StoreState {
  ready: boolean;
  addTasks: (tasks: Task[]) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;
  addEmail: (email: EmailDraft) => void;
  removeEmail: (id: string) => void;
  addMeeting: (meeting: Meeting) => void;
  removeMeeting: (id: string) => void;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(empty);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setState({ ...empty, ...(JSON.parse(raw) as StoreState) });
    } catch {
      /* ignore corrupt state */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, ready]);

  const addTasks = useCallback(
    (tasks: Task[]) => setState((s) => ({ ...s, tasks: [...tasks, ...s.tasks] })),
    [],
  );
  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) =>
      setState((s) => ({
        ...s,
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      })),
    [],
  );
  const removeTask = useCallback(
    (id: string) => setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) })),
    [],
  );
  const addEmail = useCallback(
    (email: EmailDraft) => setState((s) => ({ ...s, emails: [email, ...s.emails] })),
    [],
  );
  const removeEmail = useCallback(
    (id: string) => setState((s) => ({ ...s, emails: s.emails.filter((e) => e.id !== id) })),
    [],
  );
  const addMeeting = useCallback(
    (meeting: Meeting) => setState((s) => ({ ...s, meetings: [meeting, ...s.meetings] })),
    [],
  );
  const removeMeeting = useCallback(
    (id: string) => setState((s) => ({ ...s, meetings: s.meetings.filter((m) => m.id !== id) })),
    [],
  );

  const value = useMemo<StoreApi>(
    () => ({
      ...state,
      ready,
      addTasks,
      updateTask,
      removeTask,
      addEmail,
      removeEmail,
      addMeeting,
      removeMeeting,
    }),
    [
      state,
      ready,
      addTasks,
      updateTask,
      removeTask,
      addEmail,
      removeEmail,
      addMeeting,
      removeMeeting,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}