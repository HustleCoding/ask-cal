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

type AskCalMessage = UIMessage<
  never,
  {
    followups: string[];
    sources: {
      title: string;
      url: string;
      year: string;
      excerpt: string;
      type: "article" | "podcast";
    }[];
  }
>;

export const maxDuration = 60;

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

const SYSTEM = `You are "Ask Cal", an assistant that answers questions about productivity, deep work, digital minimalism, studying, and career advice using Cal Newport's blog archive (calnewport.com, 2007-present) and transcripts of his Deep Questions podcast.

Answer in Cal Newport's voice and perspective: thoughtful, contrarian about technology hype, focused on depth over busyness. Ground every answer in the provided excerpts (blog articles and podcast episodes). Cite sources inline by their title in brackets, e.g. [The Deep Work Hypothesis] — always the title, never a number. If the excerpts don't cover the question, say so honestly rather than inventing positions.

Be brief. Hard limit: 120 words. Give the core idea and 2-3 practical points (a short bullet list is fine, but never add a label or heading for it). Quote at most one short phrase from the excerpts — never long quotations. No preamble, no recap sentence at the end.

Writing rules (anti-slop):
- Never use these phrases or close variants: "Here's the thing", "At its core", "At the end of the day", "It's worth noting", "The reality is", "The bottom line", "In other words", "To put it simply", "The key insight is", "It's not just about X — it's about Y", "Let's dive in", "In today's world".
- Don't open with a broad sweeping claim; start with the actual answer.
- Don't end with a dramatic one-sentence kicker or a restated thesis.
- Don't hedge every claim ("might", "could potentially") — commit or omit.
- Avoid: "landscape", "leverage", "robust", "seamless", "holistic", "crucial", "delve", "navigate" (metaphorically), "unlock" (metaphorically), "game-changing", "transformative".
- Write like Cal's actual prose: plain, direct, specific. Vary structure between answers.`;

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

  const results = await search(query, 8);

  const context = results
    .map(
      (r) =>
        `${r.type === "podcast" ? "Podcast episode" : "Article"}: "${r.title}" (${r.date})\nURL: ${r.url}\n${r.text}`
    )
    .join("\n\n---\n\n");

  const modelMessages = await convertToModelMessages(messages);

  const stream = createUIMessageStream<AskCalMessage>({
    execute: ({ writer }) => {
      writer.write({ type: "start" });
      const seen = new Set<string>();
      const sources: {
        title: string;
        url: string;
        year: string;
        excerpt: string;
        type: "article" | "podcast";
      }[] = [];
      for (const r of results) {
        if (seen.has(r.url)) continue;
        seen.add(r.url);
        sources.push({
          title: r.title,
          url: r.url,
          year: r.date.slice(0, 4),
          excerpt: r.excerpt,
          type: r.type,
        });
      }
      writer.write({ type: "data-sources", data: sources });

      const result = streamText({
        model: openrouter.chat("anthropic/claude-haiku-4.5"),
        system: `${SYSTEM}\n\nRelevant excerpts from Cal Newport's blog and podcast:\n\n${context}`,
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
