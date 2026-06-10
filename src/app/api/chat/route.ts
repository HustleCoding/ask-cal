import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  streamText,
  type UIMessage,
} from "ai";
import { search } from "@/lib/retrieval";

type AskCalMessage = UIMessage<never, { followups: string[] }>;

export const maxDuration = 60;

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

const SYSTEM = `You are "Ask Cal", an assistant that answers questions about productivity, deep work, digital minimalism, studying, and career advice using Cal Newport's blog archive (calnewport.com, 2007-present).

Answer in Cal Newport's voice and perspective: thoughtful, contrarian about technology hype, focused on depth over busyness. Ground every answer in the provided article excerpts. Cite articles inline by their title in brackets, e.g. [The Deep Work Hypothesis] — always the title, never a number. If the excerpts don't cover the question, say so honestly rather than inventing positions.

Be brief. Hard limit: 120 words. Give the core idea and 2-3 practical points (a short bullet list is fine, but never add a label or heading for it). Quote at most one short phrase from the excerpts — never long quotations. No preamble, no recap sentence at the end.`;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const textOf = (m: UIMessage) =>
    m.parts
      ?.filter((p) => p.type === "text")
      .map((p) => p.text)
      .join(" ") ?? "";

  const userMessages = messages.filter((m) => m.role === "user");
  const lastQuestion = textOf(userMessages[userMessages.length - 1] ?? messages[messages.length - 1]);
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  // Follow-ups like "how do I apply that?" carry little lexical signal on
  // their own, so blend in recent conversation context for retrieval.
  const query = [
    lastQuestion,
    lastQuestion,
    textOf(userMessages[userMessages.length - 2] ?? ({ parts: [] } as unknown as UIMessage)),
    lastAssistant ? textOf(lastAssistant).slice(0, 400) : "",
  ]
    .filter(Boolean)
    .join(" ");

  const results = search(query, 8);

  const context = results
    .map(
      (r) => `Article: "${r.title}" (${r.date})\nURL: ${r.url}\n${r.text}`
    )
    .join("\n\n---\n\n");

  const modelMessages = await convertToModelMessages(messages);

  const stream = createUIMessageStream<AskCalMessage>({
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

      const followups = generateText({
        model: openrouter.chat("deepseek/deepseek-v4-flash"),
        prompt: `A reader asked Cal Newport's archive: "${lastQuestion}"\n\nBased on these article excerpts, suggest 3 natural follow-up questions the reader might ask next. Each under 9 words. Return exactly 3 questions, one per line, no numbering or bullets.\n\n${context.slice(0, 4000)}`,
      })
        .then((r) =>
          r.text
            .split("\n")
            .map((s) => s.replace(/^[\s\d.\-•*]+/, "").trim())
            .filter((s) => s.length > 4)
            .slice(0, 3)
        )
        .catch(() => [] as string[]);

      return (async () => {
        const qs = await followups;
        await Promise.resolve(result.text).catch(() => "");
        if (qs.length) {
          writer.write({ type: "data-followups", data: qs });
        }
      })();
    },
  });

  return createUIMessageStreamResponse({ stream });
}
