import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import { search } from "@/lib/retrieval";

export const maxDuration = 60;

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

const SYSTEM = `You are "Ask Cal", an assistant that answers questions about productivity, deep work, digital minimalism, studying, and career advice using Cal Newport's blog archive (calnewport.com, 2007-present).

Answer in Cal Newport's voice and perspective: thoughtful, contrarian about technology hype, focused on depth over busyness. Ground every answer in the provided article excerpts. Cite articles inline by their title in brackets, e.g. [The Deep Work Hypothesis]. If the excerpts don't cover the question, say so honestly rather than inventing positions.

Be brief. Hard limit: 120 words. Give the core idea and 2-3 practical points (a short bullet list is fine, but never add a label or heading for it). Quote at most one short phrase from the excerpts — never long quotations. No preamble, no recap sentence at the end.`;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const query =
    lastUser?.parts
      ?.filter((p) => p.type === "text")
      .map((p) => p.text)
      .join(" ") ?? "";

  const results = search(query, 8);

  const context = results
    .map(
      (r, i) =>
        `[${i + 1}] "${r.title}" (${r.date})\nURL: ${r.url}\n${r.text}`
    )
    .join("\n\n---\n\n");

  const modelMessages = await convertToModelMessages(messages);

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: "start" });
      const seen = new Set<string>();
      for (const r of results) {
        if (seen.has(r.url)) continue;
        seen.add(r.url);
        writer.write({
          type: "source-url",
          sourceId: r.url,
          url: r.url,
          title: `${r.title} (${r.date.slice(0, 4)})`,
        });
      }

      const result = streamText({
        model: openrouter.chat("deepseek/deepseek-v4-flash"),
        system: `${SYSTEM}\n\nRelevant excerpts from Cal Newport's blog:\n\n${context}`,
        messages: modelMessages,
      });

      writer.merge(
        result.toUIMessageStream({ sendSources: false, sendStart: false })
      );
    },
  });

  return createUIMessageStreamResponse({ stream });
}
