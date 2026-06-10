"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useEffect, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import {
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import { Streamdown } from "streamdown";
import { Spinner } from "@/components/ui/spinner";
import { BookOpenIcon, SquarePenIcon } from "lucide-react";

type AskCalMessage = UIMessage<
  never,
  {
    followups: string[];
    sources: { title: string; url: string; year: string; excerpt: string }[];
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
  const [input, setInput] = useState("");

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

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text.trim()) return;
    sendMessage({ text: message.text });
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
            Grounded in 1,117 calnewport.com essays · 2007–present
          </p>
        </div>
        <span className="text-accent-foreground bg-accent ml-auto hidden shrink-0 rounded-full px-3 py-1 text-xs font-medium sm:inline">
          Deep work, on demand
        </span>
        {messages.length > 0 && (
          <button
            className="text-muted-foreground hover:text-foreground hover:border-primary/40 bg-card ml-auto flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs shadow-xs transition-colors sm:ml-3"
            onClick={newChat}
            type="button"
          >
            <SquarePenIcon className="size-3.5" />
            New chat
          </button>
        )}
      </header>

      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 && (
            <ConversationEmptyState>
              <div className="mx-auto max-w-xl pt-10 text-center">
                <p className="text-accent-foreground mb-3 text-xs font-medium tracking-[0.2em] uppercase">
                  The complete archive, 2007 → today
                </p>
                <h2 className="font-serif text-3xl leading-snug font-semibold tracking-tight text-balance sm:text-4xl">
                  What would Cal Newport say?
                </h2>
                <p className="text-muted-foreground mx-auto mt-3 max-w-md text-sm leading-relaxed">
                  Every answer is drawn from his actual essays — deep work,
                  digital minimalism, study habits, slow productivity — with
                  the original articles cited.
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
              </div>
            </ConversationEmptyState>
          )}
          {messages.map((message) => (
            <div key={message.id}>
              {message.role === "assistant" &&
                message.parts.map((part, i) =>
                  part.type === "data-sources" ? (
                    <Sources className="mb-1" key={`${message.id}-srcs-${i}`}>
                      <SourcesTrigger count={part.data.length} />
                      <SourcesContent className="w-full max-w-xl">
                        {part.data.map((s) => (
                          <a
                            key={s.url}
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-card hover:border-primary/40 block rounded-xl border px-3.5 py-2.5 shadow-xs transition-colors"
                          >
                            <span className="text-foreground block text-sm font-medium">
                              {s.title}{" "}
                              <span className="text-muted-foreground font-normal">
                                · {s.year}
                              </span>
                            </span>
                            <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                              “{s.excerpt}”
                            </span>
                          </a>
                        ))}
                      </SourcesContent>
                    </Sources>
                  ) : null
                )}
              {message.parts.map((part, i) =>
                part.type === "text" ? (
                  <Message from={message.role} key={`${message.id}-${i}`}>
                    <MessageContent
                      className={
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-3 shadow-sm"
                          : "bg-card rounded-2xl rounded-bl-sm border px-4 py-3.5 leading-relaxed shadow-xs"
                      }
                    >
                      <Streamdown>{part.text}</Streamdown>
                      {status === "streaming" &&
                        message.id === lastMessage?.id &&
                        i === message.parts.length - 1 && (
                          <span className="bg-foreground/70 ml-0.5 inline-block h-4 w-2 animate-pulse rounded-[2px] align-text-bottom" />
                        )}
                    </MessageContent>
                  </Message>
                ) : null
              )}
              {message.role === "assistant" &&
                message.id === lastMessage?.id &&
                status === "ready" &&
                message.parts.map((part, i) =>
                  part.type === "data-followups" ? (
                    <div
                      className="mt-3 flex flex-wrap gap-2"
                      key={`${message.id}-fu-${i}`}
                    >
                      {part.data.map((q) => (
                        <button
                          key={q}
                          className="text-muted-foreground hover:border-primary/40 hover:text-accent-foreground bg-card rounded-full border px-3 py-1 text-xs shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
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
          ))}
          {status === "submitted" && <Spinner className="mx-auto my-4" />}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput
        onSubmit={handleSubmit}
        className="bg-card mt-2 rounded-2xl border shadow-md shadow-black/5 transition-shadow focus-within:shadow-lg focus-within:shadow-black/10"
      >
        <PromptInputBody>
          <PromptInputTextarea
            onChange={(e) => setInput(e.target.value)}
            value={input}
            placeholder="Ask about deep work, focus, studying..."
          />
        </PromptInputBody>
        <PromptInputFooter>
          <div />
          <PromptInputSubmit
            disabled={status === "ready" && !input.trim()}
            status={status}
            onClick={(e) => {
              if (status === "streaming" || status === "submitted") {
                e.preventDefault();
                stop();
              }
            }}
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
