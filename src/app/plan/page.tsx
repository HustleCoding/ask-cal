"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpenIcon,
  DownloadIcon,
  LibraryIcon,
  MapIcon,
  RotateCcwIcon,
} from "lucide-react";
import { Message, MessageContent } from "@/components/ui/message";
import { Loader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/share-button";
import { linkCitations } from "@/lib/citations";

type Source = {
  title: string;
  url: string;
  year: string;
  excerpt: string;
  type: "article" | "podcast";
};

const SCHEDULES = [
  "Standard 9-to-5",
  "Flexible / remote",
  "Student",
  "Shift work / irregular",
  "Parent with young kids",
];

export default function PlanPage() {
  const [role, setRole] = useState("");
  const [schedule, setSchedule] = useState(SCHEDULES[0]);
  const [struggle, setStruggle] = useState("");
  const [goal, setGoal] = useState("");
  const [plan, setPlan] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [phase, setPhase] = useState<"form" | "loading" | "streaming" | "done">(
    "form"
  );

  const generate = async () => {
    if (!role.trim() || !struggle.trim()) return;
    setPhase("loading");
    setPlan("");
    setSources([]);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, schedule, struggle, goal }),
      });
      if (!res.ok || !res.body) throw new Error("Request failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") continue;
          try {
            const event = JSON.parse(raw);
            if (event.type === "text-delta") {
              text += event.delta;
              setPlan(text);
              setPhase("streaming");
            } else if (event.type === "data-sources") {
              setSources(event.data);
            }
          } catch {
            // ignore malformed events
          }
        }
      }
      setPhase("done");
    } catch {
      setPhase("form");
    }
  };

  const download = () => {
    const md = `# My deep work system\n\nBuilt with Ask Cal from Cal Newport's archive.\n\n${plan}\n\n## Sources\n\n${sources
      .slice(0, 6)
      .map(
        (s) =>
          `- [${s.title}](${s.url}) (${s.type === "podcast" ? "Deep Questions podcast" : "calnewport.com"}, ${s.year})`
      )
      .join("\n")}\n`;
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "my-deep-work-system.md";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const showResult =
    phase === "loading" || phase === "streaming" || phase === "done";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-10">
      <header className="flex items-center gap-3 border-b border-border/70 py-4">
        <Link
          href="/"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"
        >
          <BookOpenIcon className="size-4.5" />
        </Link>
        <div className="min-w-0">
          <h1 className="font-serif text-lg leading-tight font-semibold tracking-tight">
            Build my system
          </h1>
          <p className="text-muted-foreground truncate text-xs">
            A personal plan from Cal Newport&apos;s frameworks
          </p>
        </div>
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground hover:border-primary/40 bg-card ml-auto shrink-0 rounded-full border px-3 py-1.5 text-xs shadow-xs transition-colors"
        >
          ← Back to chat
        </Link>
      </header>

      {!showResult && (
        <div className="mx-auto w-full max-w-xl pt-10">
          <p className="text-accent-foreground mb-3 text-center text-xs font-medium tracking-[0.2em] uppercase">
            Five minutes, one system
          </p>
          <h2 className="text-center font-serif text-3xl leading-snug font-semibold tracking-tight text-balance">
            Describe your situation. Get Cal&apos;s plan.
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-md text-center text-sm leading-relaxed">
            Answer four questions and get a personalized deep work system —
            time-block template, rituals, and first steps — grounded in his
            essays and podcast.
          </p>

          <div className="mt-8 flex flex-col gap-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">What do you do?</span>
              <input
                className="bg-card focus:border-primary/50 rounded-xl border px-4 py-2.5 text-sm shadow-xs outline-none"
                placeholder="e.g. software engineer, PhD student, marketing lead..."
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Your schedule</span>
              <select
                className="bg-card focus:border-primary/50 rounded-xl border px-4 py-2.5 text-sm shadow-xs outline-none"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
              >
                {SCHEDULES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">
                What&apos;s your biggest struggle right now?
              </span>
              <textarea
                className="bg-card focus:border-primary/50 min-h-24 resize-none rounded-xl border px-4 py-2.5 text-sm shadow-xs outline-none"
                placeholder="e.g. I'm in meetings all day and my real work happens at night; I can't stop checking Slack..."
                value={struggle}
                onChange={(e) => setStruggle(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">
                What would success look like? (optional)
              </span>
              <input
                className="bg-card focus:border-primary/50 rounded-xl border px-4 py-2.5 text-sm shadow-xs outline-none"
                placeholder="e.g. finish my thesis, ship the project, evenings free..."
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </label>

            <Button
              className="mt-1 h-11 rounded-xl text-sm font-medium shadow-sm"
              disabled={!role.trim() || !struggle.trim()}
              onClick={generate}
            >
              <span className="flex items-center gap-2">
                <MapIcon className="size-4" />
                Build my plan
              </span>
            </Button>
          </div>
        </div>
      )}

      {showResult && (
        <div className="flex flex-col gap-6 py-8">
          {sources.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium tracking-[0.14em] uppercase">
                <LibraryIcon className="size-3.5" />
                Drawing from
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sources.slice(0, 6).map((s) => (
                  <a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:border-primary/40 hover:text-accent-foreground bg-card max-w-full truncate rounded-full border px-3 py-1 text-xs shadow-xs transition-colors"
                  >
                    {s.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          {phase === "loading" && (
            <div className="text-muted-foreground flex items-center gap-2.5 pt-2 text-sm">
              <Loader variant="typing" size="sm" />
              Searching 15,784 excerpts from the essays and podcast…
            </div>
          )}
          {phase === "streaming" && plan.length === 0 && (
            <div className="text-muted-foreground flex items-center gap-2.5 pt-2 text-sm">
              <Loader variant="typing" size="sm" />
              Writing your plan…
            </div>
          )}

          <Message className="gap-0">
            <MessageContent
              markdown
              className="w-full max-w-none bg-transparent p-0 text-[0.95rem] leading-7 [&>h1]:font-serif [&>h2]:font-serif [&>h3]:font-serif [&>h2]:mt-6 [&>h2]:mb-2 [&>h3]:mt-5 [&>h3]:mb-1.5 [&>p]:my-3 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&>ul]:my-3 [&>ul]:list-disc [&>ul]:space-y-2 [&>ul]:pl-5 [&>ol]:my-3 [&>ol]:list-decimal [&>ol]:space-y-2 [&>ol]:pl-5 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_table]:my-3 [&_table]:w-full [&_th]:border-b [&_th]:py-1.5 [&_th]:text-left [&_td]:border-b [&_td]:border-border/50 [&_td]:py-1.5"
            >
              {linkCitations(plan, sources) +
                (phase === "streaming" ? " ▍" : "")}
            </MessageContent>
          </Message>

          {phase === "done" && (
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="rounded-full text-xs shadow-xs"
                  onClick={download}
                >
                  <DownloadIcon className="size-3.5" />
                  Download as markdown
                </Button>
                <ShareButton
                  getPayload={() => ({
                    q: `A deep work system for a ${role.trim()}`,
                    a: plan,
                    sources: sources
                      .slice(0, 4)
                      .map(({ title, url, year, type }) => ({
                        title,
                        url,
                        year,
                        type,
                      })),
                  })}
                  className="text-muted-foreground hover:border-primary/40 hover:text-accent-foreground bg-card border-input flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs shadow-xs transition-all duration-200"
                />
                <Button
                  variant="outline"
                  className="rounded-full text-xs shadow-xs"
                  onClick={() => {
                    setPhase("form");
                    setPlan("");
                    setSources([]);
                  }}
                >
                  <RotateCcwIcon className="size-3.5" />
                  Start over
                </Button>
              </div>

              {sources.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-2.5 flex items-center gap-1.5 text-xs font-medium tracking-[0.14em] uppercase">
                    <LibraryIcon className="size-3.5" />
                    From the archive & podcast
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {sources.slice(0, 6).map((s) => (
                      <a
                        key={s.url}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group bg-card hover:border-primary/40 block rounded-xl border px-4 py-3 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
                      >
                        <span className="text-foreground group-hover:text-primary block font-serif text-sm font-semibold transition-colors">
                          {s.title}
                        </span>
                        <span className="text-muted-foreground/80 mt-1.5 block text-[11px]">
                          {s.type === "podcast"
                            ? "Deep Questions podcast"
                            : "calnewport.com"}{" "}
                          · {s.year}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
