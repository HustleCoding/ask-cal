"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ChatContainerContent,
  ChatContainerRoot,
  ChatContainerScrollAnchor,
} from "@/components/ui/chat-container";
import { Message, MessageContent } from "@/components/ui/message";
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { ScrollButton } from "@/components/ui/scroll-button";
import { Loader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/share-button";
import { linkCitations } from "@/lib/citations";
import {
  ArrowRightIcon,
  ArrowUpIcon,
  BookOpenIcon,
  LibraryIcon,
  MapIcon,
  SquareIcon,
  SquarePenIcon,
} from "lucide-react";

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

const STORAGE_KEY = "ask-cal-chat";

const SUGGESTIONS = [
  "How do I get started with deep work?",
  "Is it worth quitting social media?",
  "How should a student study for exams?",
  "What is slow productivity?",
];

export default function Home() {
  const { messages, sendMessage, status, stop, setMessages } =
    useChat<AskCalMessage>();
  const lastMessage = messages[messages.length - 1];
  const isBusy = status === "streaming" || status === "submitted";
  const [input, setInput] = useState("");

  const sharePayload = (message: AskCalMessage) => {
    const idx = messages.findIndex((m) => m.id === message.id);
    const prevUser = [...messages.slice(0, idx)]
      .reverse()
      .find((m) => m.role === "user");
    const q =
      prevUser?.parts
        ?.filter((p) => p.type === "text")
        .map((p) => p.text)
        .join(" ") ?? "";
    const a = message.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("");
    const sources = message.parts
      .filter((p) => p.type === "data-sources")
      .flatMap((p) => p.data)
      .slice(0, 4)
      .map(({ title, url, year, type }) => ({ title, url, year, type }));
    return { q, a, sources };
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      setMessages(JSON.parse(saved));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    if (messages.length === 0) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages, status]);

  const newChat = () => {
    stop();
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleSubmit = () => {
    if (isBusy) {
      stop();
      return;
    }
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col px-4 pb-4">
      <header className="flex items-center gap-3 border-b border-border/70 py-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <BookOpenIcon className="size-4.5" />
        </div>
        <div className="min-w-0">
          <h1 className="font-serif text-lg leading-tight font-semibold tracking-tight">
            Ask Cal
          </h1>
          <p className="text-muted-foreground truncate text-xs">
            1,117 essays + 400 Deep Questions episodes · 2007–present
          </p>
        </div>
        <Link
          href="/plan"
          className="text-accent-foreground bg-accent hover:bg-accent/80 ml-auto flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
        >
          <MapIcon className="size-3.5" />
          Build my system
        </Link>
        {messages.length > 0 && (
          <button
            className="text-muted-foreground hover:text-foreground hover:border-primary/40 bg-card ml-3 flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs shadow-xs transition-colors"
            onClick={newChat}
            type="button"
          >
            <SquarePenIcon className="size-3.5" />
            New chat
          </button>
        )}
      </header>

      <div className="relative flex-1 overflow-hidden">
        <ChatContainerRoot className="scrollbar-hidden h-full">
          <ChatContainerContent className="gap-8 py-6">
            {messages.length === 0 && (
              <div className="mx-auto max-w-xl pt-10 text-center">
                <p className="text-accent-foreground mb-3 text-xs font-medium tracking-[0.2em] uppercase">
                  The complete archive, 2007 → today
                </p>
                <h2 className="font-serif text-3xl leading-snug font-semibold tracking-tight text-balance sm:text-4xl">
                  What would Cal Newport say?
                </h2>
                <p className="text-muted-foreground mx-auto mt-3 max-w-md text-sm leading-relaxed">
                  Every answer is drawn from his essays and Deep Questions
                  podcast — deep work, digital minimalism, study habits, slow
                  productivity — with the original sources cited.
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      className="bg-card hover:border-primary/40 hover:text-accent-foreground rounded-full border px-4 py-1.5 text-sm shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
                      onClick={() => sendMessage({ text: s })}
                      type="button"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <Link
                  href="/plan"
                  className="group bg-card hover:border-primary/40 mx-auto mt-8 flex max-w-md items-center gap-4 rounded-2xl border px-5 py-4 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <span className="bg-accent text-accent-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
                    <MapIcon className="size-4.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="text-foreground group-hover:text-primary block font-serif text-sm font-semibold transition-colors">
                      Want more than an answer? Build my system
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                      Four questions about your situation → a personalized
                      deep work plan, grounded in Cal&apos;s frameworks.
                    </span>
                  </span>
                  <ArrowRightIcon className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-colors" />
                </Link>
              </div>
            )}

            {messages.map((message) =>
              message.role === "user" ? (
                <Message key={message.id} className="justify-end">
                  <MessageContent className="bg-primary text-primary-foreground max-w-[85%] rounded-3xl rounded-br-md px-5 py-3 shadow-sm sm:max-w-[75%]">
                    {message.parts
                      .filter((p) => p.type === "text")
                      .map((p) => p.text)
                      .join("")}
                  </MessageContent>
                </Message>
              ) : (
                <div key={message.id} className="flex flex-col gap-5">
                  {(() => {
                    const msgSources = message.parts
                      .filter((p) => p.type === "data-sources")
                      .flatMap((p) => p.data);
                    return message.parts.map((part, i) =>
                    part.type === "text" ? (
                      <Message key={`${message.id}-${i}`} className="gap-0">
                        <MessageContent
                          markdown
                          className="w-full max-w-none bg-transparent p-0 text-[0.95rem] leading-7 [&>h1]:font-serif [&>h2]:font-serif [&>h3]:font-serif [&>h2]:mt-6 [&>h2]:mb-2 [&>h3]:mt-5 [&>h3]:mb-1.5 [&>p]:my-3 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&>ul]:my-3 [&>ul]:list-disc [&>ul]:space-y-2 [&>ul]:pl-5 [&>ol]:my-3 [&>ol]:list-decimal [&>ol]:space-y-2 [&>ol]:pl-5 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:italic"
                        >
                          {linkCitations(part.text, msgSources) +
                            (status === "streaming" &&
                            message.id === lastMessage?.id &&
                            i === message.parts.length - 1
                              ? " ▍"
                              : "")}
                        </MessageContent>
                      </Message>
                    ) : null
                    );
                  })()}

                  {message.parts.map((part, i) =>
                    part.type === "data-sources" && part.data.length > 0 ? (
                      <div key={`${message.id}-srcs-${i}`}>
                        <p className="text-muted-foreground mb-2.5 flex items-center gap-1.5 text-xs font-medium tracking-[0.14em] uppercase">
                          <LibraryIcon className="size-3.5" />
                          From the archive & podcast
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {part.data.slice(0, 4).map((s) => (
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
                              <span className="text-muted-foreground mt-1 line-clamp-2 block text-xs leading-relaxed">
                                “{s.excerpt}”
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
                    ) : null
                  )}

                  {(status === "ready" || message.id !== lastMessage?.id) && (
                    <div className="-mt-2 flex">
                      <ShareButton getPayload={() => sharePayload(message)} />
                    </div>
                  )}

                  {message.id === lastMessage?.id &&
                    status === "ready" &&
                    message.parts.map((part, i) =>
                      part.type === "data-followups" ? (
                        <div
                          className="flex flex-wrap gap-2"
                          key={`${message.id}-fu-${i}`}
                        >
                          {part.data.map((q) => (
                            <button
                              key={q}
                              className="text-muted-foreground hover:border-primary/40 hover:text-accent-foreground bg-card rounded-full border px-3.5 py-1.5 text-xs shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
                              onClick={() => sendMessage({ text: q })}
                              type="button"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      ) : null
                    )}
                </div>
              )
            )}

            {status === "submitted" && (
              <div className="text-muted-foreground flex items-center gap-2.5 text-sm">
                <Loader variant="typing" size="sm" />
                Searching the archive…
              </div>
            )}
            <ChatContainerScrollAnchor />
          </ChatContainerContent>
          <div className="absolute right-0 bottom-3 left-0 flex justify-center">
            <ScrollButton className="bg-card shadow-md" />
          </div>
        </ChatContainerRoot>
      </div>

      <PromptInput
        value={input}
        onValueChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isBusy}
        className="bg-card mt-2 rounded-3xl border shadow-md shadow-black/5 transition-shadow focus-within:shadow-lg focus-within:shadow-black/10"
      >
        <PromptInputTextarea placeholder="Ask about deep work, focus, studying..." />
        <PromptInputActions className="justify-end pt-1">
          <PromptInputAction
            tooltip={isBusy ? "Stop generating" : "Send"}
          >
            <Button
              size="icon"
              className="size-9 rounded-full shadow-sm"
              disabled={!isBusy && !input.trim()}
              onClick={handleSubmit}
              aria-label={isBusy ? "Stop generating" : "Send"}
            >
              {isBusy ? (
                <SquareIcon className="size-4 fill-current" />
              ) : (
                <ArrowUpIcon className="size-4.5" />
              )}
            </Button>
          </PromptInputAction>
        </PromptInputActions>
      </PromptInput>
    </div>
  );
}
