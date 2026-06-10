"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";
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
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import { Streamdown } from "streamdown";
import { Spinner } from "@/components/ui/spinner";
import { BookOpenIcon } from "lucide-react";

const SUGGESTIONS = [
  "How do I get started with deep work?",
  "Is it worth quitting social media?",
  "How should a student study for exams?",
  "What is slow productivity?",
];

export default function Home() {
  const { messages, sendMessage, status } = useChat();
  const [input, setInput] = useState("");

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
                message.parts.some((p) => p.type === "source-url") && (
                  <Sources className="mb-1">
                    <SourcesTrigger
                      count={
                        message.parts.filter((p) => p.type === "source-url")
                          .length
                      }
                    />
                    <SourcesContent>
                      {message.parts
                        .filter((p) => p.type === "source-url")
                        .map((part, i) => (
                          <Source
                            key={`${message.id}-src-${i}`}
                            href={part.url}
                            title={part.title ?? part.url}
                          />
                        ))}
                    </SourcesContent>
                  </Sources>
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
                    </MessageContent>
                  </Message>
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
          <PromptInputSubmit disabled={!input.trim()} status={status} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
