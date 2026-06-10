"use client";

import { useState } from "react";
import { CheckIcon, Share2Icon, XIcon } from "lucide-react";

export type SharePayload = {
  q: string;
  a: string;
  sources: { title: string; url: string; year: string; type: string }[];
};

type State = "idle" | "busy" | "copied" | "manual" | "error";

export function ShareButton({
  getPayload,
  className,
}: {
  getPayload: () => SharePayload;
  className?: string;
}) {
  const [state, setState] = useState<State>("idle");
  const [url, setUrl] = useState("");

  const share = async () => {
    if (state === "busy") return;
    setState("busy");
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getPayload()),
      });
      const { token } = await res.json();
      const shareUrl = `${window.location.origin}/s/${token}`;
      setUrl(shareUrl);
      if (
        typeof navigator.share === "function" &&
        /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
      ) {
        try {
          await navigator.share({ title: "Ask Cal", url: shareUrl });
          setState("idle");
          return;
        } catch {
          // user cancelled or share unsupported — fall back to copy
        }
      }
      try {
        await navigator.clipboard.writeText(shareUrl);
        setState("copied");
        setTimeout(() => setState((s) => (s === "copied" ? "idle" : s)), 2000);
      } catch {
        setState("manual");
      }
    } catch {
      setState("error");
      setTimeout(() => setState((s) => (s === "error" ? "idle" : s)), 2500);
    }
  };

  return (
    <div className="relative">
      <button
        className={
          className ??
          "text-muted-foreground hover:border-primary/40 hover:text-accent-foreground bg-card flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs shadow-xs transition-all duration-200"
        }
        onClick={share}
        type="button"
      >
        {state === "copied" ? (
          <>
            <CheckIcon className="size-3" />
            Link copied
          </>
        ) : state === "error" ? (
          <>Couldn&apos;t share — try again</>
        ) : (
          <>
            <Share2Icon className="size-3" />
            {state === "busy" ? "Creating link…" : "Share"}
          </>
        )}
      </button>
      {state === "manual" && (
        <div className="bg-card absolute bottom-full left-0 z-10 mb-2 flex w-72 max-w-[80vw] items-center gap-2 rounded-xl border p-2 shadow-md">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
            className="text-muted-foreground min-w-0 flex-1 bg-transparent text-xs outline-none"
            aria-label="Share link"
          />
          <button
            onClick={() => setState("idle")}
            type="button"
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
