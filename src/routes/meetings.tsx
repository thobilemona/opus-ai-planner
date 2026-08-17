import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, CheckCircle2, Loader2, Sparkles, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { summarizeMeeting } from "@/lib/ai.functions";
import { taskFromAi, uid, useStore } from "@/lib/store";
import type { Meeting } from "@/lib/types";

export const Route = createFileRoute("/meetings")({
  head: () => ({
    meta: [
      { title: "Meeting Summaries — Aura AI Assistant" },
      {
        name: "description",
        content:
          "Paste or upload meeting notes and get a summary, decisions, owners, deadlines and next steps in seconds.",
      },
      { property: "og:title", content: "Meeting Summaries — Aura AI Assistant" },
      {
        property: "og:description",
        content: "Turn transcripts into summaries, action items and scheduled tasks.",
      },
    ],
  }),
  component: MeetingsPage,
});

function MeetingsPage() {
  const { meetings, addMeeting, removeMeeting, addTasks } = useStore();
  const run = useServerFn(summarizeMeeting);
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<Meeting | null>(null);

  async function handleFile(file: File) {
    if (file.size > 2_000_000) {
      toast.error("File is too large — keep it under 2MB of text.");
      return;
    }
    const text = await file.text();
    setNotes(text);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
    toast.success("Transcript loaded");
  }

  async function handleSummarize() {
    if (!notes.trim()) {
      toast.error("Paste or upload your meeting notes first.");
      return;
    }
    setLoading(true);
    try {
      const res = await run({ data: { notes, title } });
      const meeting: Meeting = {
        id: uid(),
        title: title || res.title || "Untitled meeting",
        summary: res.summary,
        keyPoints: res.keyPoints ?? [],
        decisions: res.decisions ?? [],
        actionItems: (res.actionItems ?? []).map((a) => ({
          title: a.title,
          assignee: a.assignee,
          dueDate: a.dueDate,
          priority: a.priority,
          estimateMins: a.estimateMins,
        })),
        deadlines: res.deadlines ?? [],
        nextSteps: res.nextSteps ?? [],
        notes,
        createdAt: new Date().toISOString(),
        scheduledAt: "",
      };
      addMeeting(meeting);
      setActive(meeting);
      const created = (res.actionItems ?? []).map((a) =>
        taskFromAi(a, `Meeting: ${meeting.title}`),
      );
      if (created.length) {
        addTasks(created);
        toast.success(`Summary ready · ${created.length} action items added to your planner`);
      } else {
        toast.success("Summary ready");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Summarization failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="Meeting Workspace"
      subtitle="Notes in, decisions and action items out — automatically planned"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="surface-card space-y-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="mtitle">Meeting title</Label>
            <Input
              id="mtitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Q3 roadmap sync"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes or transcript</Label>
            <Textarea
              id="notes"
              rows={16}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Paste the full transcript or your rough notes here…"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSummarize} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Summarize &amp; plan
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" /> Upload transcript
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.vtt,.srt,.csv,text/plain"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Recordings: export the transcript from your meeting tool (.txt, .vtt or .srt) and upload
            it here.
          </p>
        </section>

        <section className="space-y-4">
          {active ? (
            <div className="surface-card space-y-5 p-5">
              <div>
                <h2 className="text-lg font-semibold">{active.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{active.summary}</p>
              </div>
              <Block title="Key discussion points" items={active.keyPoints} />
              <Block title="Decisions" items={active.decisions} />
              {active.actionItems.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Action items</h3>
                  <ul className="space-y-2">
                    {active.actionItems.map((a, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm"
                      >
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                        <div>
                          <p className="font-medium">{a.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.assignee || "Unassigned"} · {a.priority}
                            {a.dueDate && ` · due ${a.dueDate}`}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {active.deadlines.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Important dates</h3>
                  <div className="flex flex-wrap gap-2">
                    {active.deadlines.map((d, i) => (
                      <Badge key={i} variant="outline" className="gap-1">
                        <CalendarClock className="size-3" /> {d.label} · {d.date}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <Block title="Next steps" items={active.nextSteps} ordered />
            </div>
          ) : (
            <div className="surface-card flex min-h-52 items-center justify-center p-8 text-center text-sm text-muted-foreground">
              Your summary, decisions, owners and next steps will appear here.
            </div>
          )}

          {meetings.length > 0 && (
            <div className="surface-card space-y-2 p-5">
              <h2 className="text-sm font-semibold">Recent summaries</h2>
              {meetings.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm"
                >
                  <button className="min-w-0 flex-1 text-left" onClick={() => setActive(m)}>
                    <p className="truncate font-medium">{m.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.summary}</p>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      removeMeeting(m.id);
                      if (active?.id === m.id) setActive(null);
                    }}
                    aria-label="Delete summary"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Block({
  title,
  items,
  ordered,
}: {
  title: string;
  items: string[];
  ordered?: boolean;
}) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-primary">{ordered ? `${i + 1}.` : "•"}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
