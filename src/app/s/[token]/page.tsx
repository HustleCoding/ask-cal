import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BookOpenIcon, LibraryIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { decodeShare } from "@/lib/share";
import { linkCitations } from "@/lib/citations";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const shared = decodeShare(token);
  if (!shared) return { title: "Ask Cal" };
  return {
    title: `${shared.q} — Ask Cal`,
    description: shared.a.slice(0, 160),
    openGraph: {
      title: shared.q,
      description: shared.a.slice(0, 160),
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function SharedAnswerPage({ params }: Props) {
  const { token } = await params;
  const shared = decodeShare(token);
  if (!shared) notFound();

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
            Ask Cal
          </h1>
          <p className="text-muted-foreground truncate text-xs">
            A shared answer from Cal Newport&apos;s archive
          </p>
        </div>
        <Link
          href="/"
          className="bg-primary text-primary-foreground hover:bg-primary/90 ml-auto shrink-0 rounded-full px-4 py-1.5 text-xs font-medium shadow-sm transition-colors"
        >
          Ask your own
        </Link>
      </header>

      <div className="flex flex-col gap-6 py-8">
        <p className="text-accent-foreground text-xs font-medium tracking-[0.2em] uppercase">
          Someone asked
        </p>
        <h2 className="-mt-4 font-serif text-2xl leading-snug font-semibold tracking-tight text-balance sm:text-3xl">
          {shared.q}
        </h2>

        <div className="prose-sm w-full max-w-none text-[0.95rem] leading-7 [&>h2]:font-serif [&>h3]:font-serif [&>p]:my-3 [&>ul]:my-3 [&>ul]:list-disc [&>ul]:space-y-2 [&>ul]:pl-5 [&>ol]:my-3 [&>ol]:list-decimal [&>ol]:space-y-2 [&>ol]:pl-5 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline">
          <ReactMarkdown>{linkCitations(shared.a, shared.sources)}</ReactMarkdown>
        </div>

        {shared.sources.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-2.5 flex items-center gap-1.5 text-xs font-medium tracking-[0.14em] uppercase">
              <LibraryIcon className="size-3.5" />
              From the archive & podcast
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {shared.sources.map((s) => (
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

        <div className="bg-card mt-2 rounded-2xl border px-5 py-4 text-center shadow-xs">
          <p className="text-sm">
            Every answer is grounded in 1,117 essays and 400+ Deep Questions
            episodes.
          </p>
          <Link
            href="/"
            className="text-primary mt-1 inline-block text-sm font-medium underline underline-offset-2"
          >
            Ask Cal your own question →
          </Link>
        </div>
      </div>
    </div>
  );
}
