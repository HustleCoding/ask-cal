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
    <div className="mx-auto flex h-dvh max-w-3xl flex-col p-4">
      <header className="mb-2 flex items-center gap-2 border-b pb-3">
        <BookOpenIcon className="size-5" />
        <h1 className="font-semibold">Ask Cal</h1>
        <span className="text-muted-foreground text-sm">
          — answers from 1,117 calnewport.com articles (2007–present)
        </span>
      </header>

      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 && (
            <ConversationEmptyState
              icon={<BookOpenIcon className="size-8" />}
              title="Ask Cal Newport's blog anything"
              description="Deep work, digital minimalism, study habits, slow productivity..."
            >
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    className="rounded-full border px-3 py-1 text-sm hover:bg-accent"
                    onClick={() => sendMessage({ text: s })}
                    type="button"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </ConversationEmptyState>
          )}
          {messages.map((message) => (
            <div key={message.id}>
              {message.role === "assistant" &&
                message.parts.some((p) => p.type === "source-url") && (
                  <Sources>
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
                    <MessageContent>
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

      <PromptInput onSubmit={handleSubmit} className="mt-2">
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
