import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  emailInputSchema,
  emailResultSchema,
  meetingInputSchema,
  meetingSchema,
  planDaySchema,
  recSchema,
  scheduleInputSchema,
  tasksInputSchema,
  tasksSchema,
  toneVariantsSchema,
  MODE_INSTRUCTION,
} from "./ai-schemas";

export const generateEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => emailInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { runObject, today } = await import("./ai-run.server");
    return runObject(
      emailResultSchema,
      `You are an expert executive assistant writing emails. Today is ${today()}.
Write in a ${data.tone} tone. Return a compelling subject line and a complete, ready-to-send email body with greeting and sign-off (use "[Your name]" if unknown).
Also detect the underlying purpose and tone, and extract any concrete follow-up tasks for the sender (empty array if none). Dates must be yyyy-MM-dd or an empty string.`,
      `${MODE_INSTRUCTION[data.mode]}\n\nUser instruction: ${data.instruction}\n\nExisting email context:\n${data.existing || "(none)"}`,
    );
  });

export const generateToneVariants = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ subject: z.string(), body: z.string() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { runObject } = await import("./ai-run.server");
    return runObject(
      toneVariantsSchema,
      "You rewrite emails into alternative tones. Produce exactly three variants with tones: formal, friendly, persuasive. Keep the same core message and include a subject line for each.",
      `Subject: ${data.subject}\n\n${data.body}`,
    );
  });

export const summarizeMeeting = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => meetingInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { runObject, today } = await import("./ai-run.server");
    return runObject(
      meetingSchema,
      `You are an expert meeting analyst. Today is ${today()}.
Summarize the meeting concisely, list key discussion points, explicit decisions, action items (assign the named owner when a name appears, otherwise empty string), detected deadlines with resolved calendar dates, and a short "next steps" list.
All dates must be yyyy-MM-dd or an empty string. Estimate realistic completion times in minutes.`,
      `Meeting title hint: ${data.title || "(none)"}\n\nNotes/transcript:\n${data.notes}`,
    );
  });

export const planTasks = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => tasksInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { runObject, today } = await import("./ai-run.server");
    return runObject(
      tasksSchema,
      `You turn messy input into a clean, prioritised task list. Today is ${today()}.
Break large work into subtasks, set priority by urgency and impact, add a category label, a realistic minute estimate, and a due date (yyyy-MM-dd) when one can be inferred, otherwise empty string.`,
      `Context: ${data.context || "(none)"}\n\nInput:\n${data.text}`,
    );
  });

export const planSchedule = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => scheduleInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { runObject, today } = await import("./ai-run.server");
    return runObject(
      planDaySchema,
      `You are an intelligent schedule manager. Today is ${today()}.
Place the given tasks into time blocks on the target date inside the working hours, never overlapping each other or the busy blocks. Put urgent and high-impact deep work early. Leave short gaps between blocks.
"start" must be a full ISO datetime (e.g. 2026-08-17T09:30:00) on the target date. Only use taskIds that were provided. Give one short paragraph of coaching advice.`,
      `Target date: ${data.date}\nWorking hours: ${data.workingHours}\nBusy blocks: ${data.busy || "(none)"}\n\nTasks (JSON):\n${data.tasks}`,
    );
  });

export const getRecommendations = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ snapshot: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const { runObject, today } = await import("./ai-run.server");
    return runObject(
      recSchema,
      `You are a personal AI chief of staff. Today is ${today()}. Give 3 to 4 short, specific, actionable recommendations based on the user's workload snapshot. Be concrete about what to do next and why.`,
      data.snapshot,
    );
  });
