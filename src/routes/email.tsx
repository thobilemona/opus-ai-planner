import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Loader2, Save, Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { generateEmail, generateToneVariants } from "@/lib/ai.functions";
import { taskFromAi, uid, useStore } from "@/lib/store";
import type { AiTask } from "@/lib/ai-schemas";
import type { Tone } from "@/lib/types";

export const Route = createFileRoute("/email")({
  head: () => ({
    meta: [
      { title: "Email Studio — Aura AI Assistant" },
      {
        name: "description",
        content:
          "Draft, reply, rewrite, shorten and improve professional emails in any tone, then turn them into tasks.",
      },
      { property: "og:title", content: "Email Studio — Aura AI Assistant" },
      {
        property: "og:description",
        content: "AI email generation with tone control and automatic task extraction.",
      },
    ],
  }),
  component: EmailPage,
});

const TONES: Tone[] = ["formal", "casual", "friendly", "business", "persuasive"];
const MODES = ["compose", "reply", "rewrite", "shorten", "expand", "improve"] as const;

function EmailPage() {
  const { addEmail, addTasks, emails, removeEmail } = useStore();
  const run = useServerFn(generateEmail);
  const runVariants = useServerFn(generateToneVariants);

  const [instruction, setInstruction] = useState("");
  const [existing, setExisting] = useState("");
  const [tone, setTone] = useState<Tone>("business");
  const [mode, setMode] = useState<(typeof MODES)[number]>("compose");
  const [loading, setLoading] = useState(false);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [purpose, setPurpose] = useState("");
  const [detectedTone, setDetectedTone] = useState("");
  const [tasks, setTasks] = useState<AiTask[]>([]);
  const [variants, setVariants] = useState<{ tone: string; subject: string; body: string }[]>([]);

  async function handleGenerate() {
    if (!instruction.trim() && !existing.trim()) {
      toast.error("Tell the assistant what the email should say.");
      return;
    }
    setLoading(true);
    setVariants([]);
    try {
      const res = await run({
        data: { instruction: instruction || "Handle this email appropriately", tone, mode, existing },
      });
      setSubject(res.subject);
      setBody(res.body);
      setPurpose(res.purpose);
      setDetectedTone(res.detectedTone);
      setTasks(res.tasks ?? []);
      toast.success("Email ready");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleVariants() {
    if (!body) return;
    setVariantsLoading(true);
    try {
      const res = await runVariants({ data: { subject, body } });
      setVariants(res.variants ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create tone options");
    } finally {
      setVariantsLoading(false);
    }
  }

  function saveDraft() {
    if (!body) return;
    addEmail({
      id: uid(),
      subject: subject || "(no subject)",
      body,
      tone,
      purpose,
      instruction,
      createdAt: new Date().toISOString(),
    });
    toast.success("Draft saved");
  }

  function createTasks() {
    if (!tasks.length) return;
    addTasks(tasks.map((t) => taskFromAi(t, `Email: ${subject || "draft"}`)));
    toast.success(`${tasks.length} task${tasks.length > 1 ? "s" : ""} added to your planner`);
    setTasks([]);
  }

  return (
    <AppShell
      title="Email Studio"
      subtitle="Write, reply and refine — the assistant captures the follow-ups too"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="surface-card space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>What do you need?</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODES.map((m) => (
                    <SelectItem key={m} value={m} className="capitalize">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="instruction">Instruction</Label>
            <Textarea
              id="instruction"
              rows={4}
              placeholder="Ask the client for the signed contract and propose a call on Thursday"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="existing">Existing email / thread (optional)</Label>
            <Textarea
              id="existing"
              rows={6}
              placeholder="Paste the email you're replying to or want to improve"
              value={existing}
              onChange={(e) => setExisting(e.target.value)}
            />
          </div>

          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Generate email
          </Button>
        </section>

        <section className="space-y-4">
          <div className="surface-card space-y-3 p-5">
            {(purpose || detectedTone) && (
              <div className="flex flex-wrap gap-2">
                {purpose && <Badge variant="secondary">Purpose: {purpose}</Badge>}
                {detectedTone && <Badge variant="outline">Tone: {detectedTone}</Badge>}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Your subject line appears here"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="body">Email</Label>
              <Textarea
                id="body"
                rows={16}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Your generated email appears here and stays fully editable."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={saveDraft} disabled={!body}>
                <Save className="size-4" /> Save draft
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
                  toast.success("Copied to clipboard");
                }}
                disabled={!body}
              >
                <Copy className="size-4" /> Copy
              </Button>
              <Button variant="outline" onClick={handleVariants} disabled={!body || variantsLoading}>
                {variantsLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Wand2 className="size-4" />
                )}
                Tone options
              </Button>
            </div>
          </div>

          {tasks.length > 0 && (
            <div className="surface-card space-y-3 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Follow-ups detected</h2>
                <Button size="sm" onClick={createTasks}>
                  Add {tasks.length} to planner
                </Button>
              </div>
              <ul className="space-y-2">
                {tasks.map((t, i) => (
                  <li key={i} className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                    <p className="font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.priority} · {t.category || "General"} {t.dueDate && `· due ${t.dueDate}`}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {variants.length > 0 && (
            <div className="surface-card space-y-3 p-5">
              <h2 className="text-sm font-semibold">Choose a tone before sending</h2>
              <div className="grid gap-3 md:grid-cols-3">
                {variants.map((v, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setSubject(v.subject);
                      setBody(v.body);
                      toast.success(`Switched to ${v.tone} tone`);
                    }}
                    className="rounded-lg border border-border bg-muted/40 p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/40"
                  >
                    <p className="text-xs font-semibold capitalize text-primary">{v.tone}</p>
                    <p className="mt-1 line-clamp-6 text-xs text-muted-foreground">{v.body}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {emails.length > 0 && (
            <div className="surface-card space-y-2 p-5">
              <h2 className="text-sm font-semibold">Saved drafts</h2>
              {emails.slice(0, 6).map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm"
                >
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      setSubject(e.subject);
                      setBody(e.body);
                    }}
                  >
                    <p className="truncate font-medium">{e.subject}</p>
                    <p className="truncate text-xs text-muted-foreground">{e.body}</p>
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => removeEmail(e.id)}>
                    Remove
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
