import { z } from "zod";

export const prioritySchema = z.enum(["urgent", "high", "medium", "low"]);

export const aiTaskSchema = z.object({
  title: z.string(),
  notes: z.string(),
  priority: prioritySchema,
  category: z.string(),
  assignee: z.string(),
  dueDate: z.string(),
  estimateMins: z.number(),
  subtasks: z.array(z.string()),
});

export type AiTask = z.infer<typeof aiTaskSchema>;

export const emailResultSchema = z.object({
  subject: z.string(),
  body: z.string(),
  purpose: z.string(),
  detectedTone: z.string(),
  tasks: z.array(aiTaskSchema),
});

export const toneVariantsSchema = z.object({
  variants: z.array(z.object({ tone: z.string(), subject: z.string(), body: z.string() })),
});

export const meetingSchema = z.object({
  title: z.string(),
  summary: z.string(),
  keyPoints: z.array(z.string()),
  decisions: z.array(z.string()),
  actionItems: z.array(aiTaskSchema),
  deadlines: z.array(z.object({ label: z.string(), date: z.string() })),
  nextSteps: z.array(z.string()),
});

export const tasksSchema = z.object({ tasks: z.array(aiTaskSchema) });

export const planDaySchema = z.object({
  advice: z.string(),
  blocks: z.array(
    z.object({
      taskId: z.string(),
      start: z.string(),
      durationMins: z.number(),
      reason: z.string(),
    }),
  ),
});

export const recSchema = z.object({
  recommendations: z.array(z.object({ title: z.string(), detail: z.string() })),
});

export const emailInputSchema = z.object({
  instruction: z.string().min(1),
  tone: z.string(),
  mode: z.enum(["compose", "reply", "rewrite", "shorten", "expand", "improve"]),
  existing: z.string().default(""),
});

export const meetingInputSchema = z.object({
  notes: z.string().min(1),
  title: z.string().default(""),
});

export const tasksInputSchema = z.object({
  text: z.string().min(1),
  context: z.string().default(""),
});

export const scheduleInputSchema = z.object({
  date: z.string(),
  workingHours: z.string().default("09:00-17:00"),
  tasks: z.string(),
  busy: z.string().default(""),
});

export const MODE_INSTRUCTION: Record<string, string> = {
  compose: "Write a brand new email.",
  reply: "Write a reply to the email provided below.",
  rewrite: "Rewrite the email below, keeping its meaning.",
  shorten: "Shorten the email below significantly while keeping every essential point.",
  expand: "Expand the email below with more helpful detail and context.",
  improve: "Improve the clarity, structure and impact of the email below.",
};