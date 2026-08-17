import { generateText, Output, NoObjectGeneratedError } from "ai";
import type { z } from "zod";
import { createLovableAiGatewayProvider, AI_MODEL } from "./ai-gateway.server";

export const today = () => new Date().toISOString().slice(0, 10);

export async function runObject<T>(
  schema: z.ZodType<T>,
  system: string,
  prompt: string,
): Promise<T> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured (missing key).");
  const gateway = createLovableAiGatewayProvider(key);
  try {
    const { output } = await generateText({
      model: gateway(AI_MODEL),
      output: Output.object({ schema }),
      system,
      prompt,
    });
    return output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error) && error.text) {
      const match = error.text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = schema.safeParse(JSON.parse(match[0]));
          if (parsed.success) return parsed.data;
        } catch {
          /* fall through */
        }
      }
    }
    throw new Error(
      error instanceof Error ? `AI request failed: ${error.message}` : "AI request failed",
    );
  }
}