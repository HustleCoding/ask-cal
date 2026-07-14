"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { ArrowLeftIcon, CheckCircle2Icon, MailIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/browser";

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError("");
    const origin = window.location.origin;
    const { error: authError } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(searchParams.get("next") ?? "/planner")}`,
      },
    });
    setBusy(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center px-7 py-10 text-center">
          <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <CheckCircle2Icon className="size-6" />
          </div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">Check your email</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            We sent a magic link to <strong className="text-foreground">{email}</strong>. Click it
            to open your planner.
          </p>
          <Button className="mt-7" variant="outline" onClick={() => setSent(false)}>
            Use a different email
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="px-7 pt-7">
        <CardTitle className="font-serif text-2xl">Welcome to your planner</CardTitle>
        <CardDescription>Sign in with a magic link. No password to remember.</CardDescription>
      </CardHeader>
      <CardContent className="px-7 pb-7">
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="email">
            Email address
            <Input
              autoComplete="email"
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </label>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button className="h-10" disabled={busy || !email.trim()} type="submit">
            <MailIcon className="size-4" />
            {busy ? "Sending link…" : "Email me a sign-in link"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col items-center">
        <Link className="text-muted-foreground hover:text-foreground mb-8 flex items-center gap-1.5 text-sm" href="/">
          <ArrowLeftIcon className="size-3.5" />
          Back to Ask Cal
        </Link>
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <span className="font-serif text-lg font-semibold">T</span>
          </div>
          <span className="font-serif text-lg font-semibold">Timeblocks</span>
        </div>
        <Suspense fallback={<div className="h-72 w-full max-w-md animate-pulse rounded-xl bg-muted" />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
