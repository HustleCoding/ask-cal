import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import { search } from "@/lib/retrieval";

type PlanMessage = UIMessage<
  never,
  {
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

const SYSTEM = `You are "Ask Cal", a planning assistant that builds personalized productivity systems using Cal Newport's frameworks, grounded in his blog archive (calnewport.com, 2007-present) and Deep Questions podcast transcripts.

Given a reader's situation, produce a concrete, personal plan in markdown. Use exactly this structure:

## Diagnosis
2-3 sentences naming the underlying problem in Cal's terms, specific to their situation.

## Core principles
2-3 of Cal's frameworks that apply, each one sentence with an inline citation by source title in brackets, e.g. [The Deep Work Hypothesis].

## Your daily template
A realistic time-block schedule for THEIR stated schedule, as a short table or list with times. Adapt to their constraints — don't prescribe a 5am routine to a night-shift worker.

## Rituals
2-3 specific rituals (shutdown ritual, depth ritual, weekly review...) with one-line instructions, cited where possible.

## This week
3 concrete first actions they can take in the next 7 days.

Rules: ground everything in the provided excerpts and cite by title in brackets. Be specific to their role, schedule, and struggle — no generic advice. Plain, direct prose in Cal's voice. No preamble before "## Diagnosis", no closing pep talk. Total under 450 words.`;

export async function POST(req: Request) {
  const {
    role,
    schedule,
    struggle,
    goal,
  }: { role: string; schedule: string; struggle: string; goal: string } =
    await req.json();

  const query = [struggle, struggle, goal, role].filter(Boolean).join(" ");
  const results = await search(query, 12);

  const context = results
    .map(
      (r) =>
        `${r.type === "podcast" ? "Podcast episode" : "Article"}: "${r.title}" (${r.date})\nURL: ${r.url}\n${r.text}`
    )
    .join("\n\n---\n\n");

  const stream = createUIMessageStream<PlanMessage>({
    execute: ({ writer }) => {
      writer.write({ type: "start" });

      const seen = new Set<string>();
      const sourceList: {
        title: string;
        url: string;
        year: string;
        excerpt: string;
        type: "article" | "podcast";
      }[] = [];
      for (const r of results) {
        if (seen.has(r.url)) continue;
        seen.add(r.url);
        sourceList.push({
          title: r.title,
          url: r.url,
          year: r.date.slice(0, 4),
          excerpt: r.excerpt,
          type: r.type,
        });
      }
      writer.write({ type: "data-sources", data: sourceList });

      const result = streamText({
        model: openrouter.chat("anthropic/claude-haiku-4.5"),
        system: `${SYSTEM}\n\nRelevant excerpts from Cal Newport's blog and podcast:\n\n${context}`,
        prompt: `Reader's situation:\n- Role/work: ${role}\n- Schedule: ${schedule}\n- Biggest struggle: ${struggle}\n- What they want: ${goal}\n\nBuild their plan.`,
      });

      writer.merge(
        result.toUIMessageStream({ sendSources: false, sendStart: false })
      );
    },
  });

  return createUIMessageStreamResponse({ stream });
}
