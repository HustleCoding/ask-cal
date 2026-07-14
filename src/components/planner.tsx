"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleIcon,
  CopyIcon,
  LogOutIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/browser";
import type {
  Block,
  BlockCategory,
  BlockLane,
  BlockStatus,
  Day,
  Setting,
  Task,
} from "@/lib/database.types";

const MINUTE_STEP = 15;
const CATEGORY_META: Record<BlockCategory, { label: string; className: string; dot: string }> = {
  deep: { label: "Deep work", className: "bg-emerald-700 text-white border-emerald-800/20", dot: "bg-emerald-500" },
  shallow: { label: "Shallow work", className: "bg-sky-600 text-white border-sky-700/20", dot: "bg-sky-500" },
  admin: { label: "Admin", className: "bg-amber-500 text-amber-950 border-amber-600/20", dot: "bg-amber-500" },
  personal: { label: "Personal", className: "bg-violet-600 text-white border-violet-700/20", dot: "bg-violet-500" },
  break: { label: "Break", className: "bg-stone-400 text-white border-stone-500/20", dot: "bg-stone-400" },
};
const CATEGORIES = Object.keys(CATEGORY_META) as BlockCategory[];

function dateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(date: string, days: number) {
  const shifted = new Date(`${date}T12:00:00`);
  shifted.setDate(shifted.getDate() + days);
  return dateString(shifted);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(
    new Date(`${date}T12:00:00`)
  );
}

function formatTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${mins.toString().padStart(2, "0")} ${suffix}`;
}

function snap(minutes: number) {
  return Math.round(minutes / MINUTE_STEP) * MINUTE_STEP;
}

type Drag =
  | { type: "create"; lane: BlockLane; start: number; current: number }
  | { type: "move"; block: Block; pointerStart: number; start: number; end: number }
  | { type: "resize-top"; block: Block; pointerStart: number; start: number; end: number }
  | { type: "resize-bottom"; block: Block; pointerStart: number; start: number; end: number };

type TimelineProps = {
  lane: BlockLane;
  blocks: Block[];
  settings: Setting;
  onCreate: (start: number, end: number, lane: BlockLane) => void;
  onUpdate: (id: string, values: Partial<Pick<Block, "start_min" | "end_min" | "lane">>) => void;
  onEdit: (block: Block) => void;
};

function Timeline({ lane, blocks, settings, onCreate, onUpdate, onEdit }: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const total = settings.day_end_min - settings.day_start_min;
  const hours = useMemo(() => {
    const first = Math.ceil(settings.day_start_min / 60) * 60;
    return Array.from({ length: Math.floor((settings.day_end_min - first) / 60) + 1 }, (_, i) => first + i * 60);
  }, [settings.day_end_min, settings.day_start_min]);
  const minuteAt = useCallback(
    (clientY: number) => {
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect) return settings.day_start_min;
      return Math.min(
        settings.day_end_min,
        Math.max(settings.day_start_min, snap(settings.day_start_min + ((clientY - rect.top) / rect.height) * total))
      );
    },
    [settings.day_end_min, settings.day_start_min, total]
  );

  useEffect(() => {
    if (!drag) return;
    const move = (event: PointerEvent) => {
      const minute = minuteAt(event.clientY);
      if (drag.type === "create") {
        setDrag({ ...drag, current: minute });
      } else {
        const delta = snap(minute - drag.pointerStart);
        if (drag.type === "move") {
          const duration = drag.end - drag.start;
          const start = Math.min(settings.day_end_min - duration, Math.max(settings.day_start_min, drag.start + delta));
          setDrag({ ...drag, start, end: start + duration });
        } else if (drag.type === "resize-top") {
          setDrag({ ...drag, start: Math.min(drag.end - MINUTE_STEP, Math.max(settings.day_start_min, drag.start + delta)) });
        } else {
          setDrag({ ...drag, end: Math.max(drag.start + MINUTE_STEP, Math.min(settings.day_end_min, drag.end + delta)) });
        }
      }
    };
    const up = () => {
      if (drag.type === "create") {
        const start = Math.min(drag.start, drag.current);
        const end = Math.max(drag.start, drag.current);
        if (end - start >= MINUTE_STEP) onCreate(start, end, lane);
      } else {
        onUpdate(drag.block.id, { start_min: drag.start, end_min: drag.end, lane });
      }
      setDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [drag, lane, minuteAt, onCreate, onUpdate, settings.day_end_min, settings.day_start_min]);

  const beginCreate = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const start = minuteAt(event.clientY);
    setDrag({ type: "create", lane, start, current: start });
  };
  const displayBlock = (block: Block) => {
    if (!drag || drag.type === "create" || drag.block.id !== block.id) return block;
    return { ...block, start_min: drag.start, end_min: drag.end };
  };

  return (
    <div
      className="relative min-h-[720px] select-none touch-none overflow-hidden rounded-b-xl border-t bg-background/40"
      onPointerDown={beginCreate}
      ref={timelineRef}
      style={{ height: Math.max(640, total * 1.15) }}
    >
      {hours.map((hour) => (
        <div
          className="absolute inset-x-0 border-t border-dashed border-border/70"
          key={hour}
          style={{ top: `${((hour - settings.day_start_min) / total) * 100}%` }}
        >
          <span className="text-muted-foreground absolute -top-2.5 right-full mr-2 whitespace-nowrap text-[10px]">
            {formatTime(hour)}
          </span>
        </div>
      ))}
      {blocks.map((rawBlock) => {
        const block = displayBlock(rawBlock);
        const meta = CATEGORY_META[block.category];
        return (
          <div
            className={cn(
              "group absolute inset-x-2 cursor-grab overflow-hidden rounded-lg border px-2.5 py-1.5 text-left text-xs shadow-sm transition-shadow active:cursor-grabbing active:shadow-md",
              meta.className,
              block.status === "done" && "opacity-60",
              block.status === "skipped" && "opacity-45 line-through"
            )}
            key={block.id}
            onClick={() => onEdit(rawBlock)}
            onPointerDown={(event) => {
              event.stopPropagation();
              setDrag({
                type: "move",
                block: rawBlock,
                pointerStart: minuteAt(event.clientY),
                start: rawBlock.start_min,
                end: rawBlock.end_min,
              });
            }}
            style={{
              top: `${((block.start_min - settings.day_start_min) / total) * 100}%`,
              height: `${((block.end_min - block.start_min) / total) * 100}%`,
            }}
          >
            <span
              className="absolute inset-x-0 top-0 h-2 cursor-ns-resize"
              onPointerDown={(event) => {
                event.stopPropagation();
                setDrag({
                  type: "resize-top",
                  block: rawBlock,
                  pointerStart: minuteAt(event.clientY),
                  start: rawBlock.start_min,
                  end: rawBlock.end_min,
                });
              }}
            />
            <span className="line-clamp-2 font-medium">{block.label || "Untitled block"}</span>
            <span className="mt-0.5 block text-[10px] opacity-80">
              {formatTime(block.start_min)} – {formatTime(block.end_min)}
            </span>
            <span
              className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
              onPointerDown={(event) => {
                event.stopPropagation();
                setDrag({
                  type: "resize-bottom",
                  block: rawBlock,
                  pointerStart: minuteAt(event.clientY),
                  start: rawBlock.start_min,
                  end: rawBlock.end_min,
                });
              }}
            />
          </div>
        );
      })}
      {drag?.type === "create" && drag.lane === lane && (
        <div
          className="pointer-events-none absolute inset-x-2 rounded-lg border-2 border-primary/50 bg-primary/10"
          style={{
            top: `${((Math.min(drag.start, drag.current) - settings.day_start_min) / total) * 100}%`,
            height: `${(Math.abs(drag.current - drag.start) / total) * 100}%`,
          }}
        />
      )}
    </div>
  );
}

function BlockEditor({
  block,
  onChange,
  onDelete,
  onClose,
}: {
  block: Block;
  onChange: (values: Partial<Pick<Block, "label" | "category" | "status">>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-foreground/10 p-4 sm:items-center">
      <Card className="w-full max-w-sm gap-0 p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold">Edit time block</h2>
          <Button aria-label="Close" onClick={onClose} size="icon-sm" variant="ghost">
            <XIcon />
          </Button>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Label
          <Input
            autoFocus
            onChange={(event) => onChange({ label: event.target.value })}
            value={block.label}
          />
        </label>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Category
            <select
              className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
              onChange={(event) => onChange({ category: event.target.value as BlockCategory })}
              value={block.category}
            >
              {CATEGORIES.map((category) => <option key={category} value={category}>{CATEGORY_META[category].label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Status
            <select
              className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
              onChange={(event) => onChange({ status: event.target.value as BlockStatus })}
              value={block.status}
            >
              <option value="planned">Planned</option>
              <option value="done">Done</option>
              <option value="skipped">Skipped</option>
            </select>
          </label>
        </div>
        <div className="mt-5 flex justify-between">
          <Button onClick={onDelete} variant="destructive"><Trash2Icon /> Delete</Button>
          <Button onClick={onClose}>Done</Button>
        </div>
      </Card>
    </div>
  );
}

export default function Planner({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [date, setDate] = useState(dateString(new Date()));
  const [settings, setSettings] = useState<Setting | null>(null);
  const [day, setDay] = useState<Day | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data: setting, error: settingError } = await supabase
      .from("settings")
      .upsert({ user_id: userId, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, day_start_min: 360, day_end_min: 1320, preferences: {} }, { onConflict: "user_id" })
      .select()
      .single();
    if (settingError) {
      setError(settingError.message);
      setLoading(false);
      return;
    }
    const { data: existingDay, error: dayLookupError } = await supabase
      .from("days")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();
    if (dayLookupError) {
      setError(dayLookupError.message);
      setLoading(false);
      return;
    }
    let currentDay = existingDay;
    if (!currentDay) {
      const { data: createdDay, error: createDayError } = await supabase
        .from("days")
        .insert({ user_id: userId, date, notes: "", shutdown_complete: false })
        .select()
        .single();
      if (createDayError) {
        setError(createDayError.message);
        setLoading(false);
        return;
      }
      currentDay = createdDay;
    }
    const [blocksResult, tasksResult] = await Promise.all([
      supabase.from("blocks").select("*").eq("day_id", currentDay.id).order("start_min"),
      supabase.from("tasks").select("*").eq("user_id", userId).eq("status", "inbox").order("position").order("created_at"),
    ]);
    if (blocksResult.error || tasksResult.error) {
      setError(blocksResult.error?.message ?? tasksResult.error?.message ?? "Unable to load planner");
    }
    setSettings(setting);
    setDay(currentDay);
    setBlocks(blocksResult.data ?? []);
    setTasks(tasksResult.data ?? []);
    setLoading(false);
  }, [date, supabase, userId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => { if (notesTimer.current) clearTimeout(notesTimer.current); }, []);

  const createBlock = useCallback(async (start: number, end: number, lane: BlockLane) => {
    if (!day) return;
    const { data, error: insertError } = await supabase
      .from("blocks")
      .insert({ user_id: userId, day_id: day.id, lane, start_min: start, end_min: end, label: "New block", category: "deep", status: "planned", color: null })
      .select()
      .single();
    if (insertError) setError(insertError.message);
    else if (data) { setBlocks((current) => [...current, data].sort((a, b) => a.start_min - b.start_min)); setSelectedBlock(data); }
  }, [day, supabase, userId]);

  const updateBlock = useCallback(async (id: string, values: Partial<Pick<Block, "start_min" | "end_min" | "lane" | "label" | "category" | "status">>) => {
    setBlocks((current) => current.map((block) => block.id === id ? { ...block, ...values } : block));
    const { error: updateError } = await supabase.from("blocks").update(values).eq("id", id);
    if (updateError) setError(updateError.message);
  }, [supabase]);

  const deleteBlock = async () => {
    if (!selectedBlock) return;
    const { error: deleteError } = await supabase.from("blocks").delete().eq("id", selectedBlock.id);
    if (deleteError) setError(deleteError.message);
    else { setBlocks((current) => current.filter((block) => block.id !== selectedBlock.id)); setSelectedBlock(null); }
  };

  const updateDay = (values: Partial<Pick<Day, "notes" | "shutdown_complete">>) => {
    setDay((current) => current ? { ...current, ...values } : current);
    if (!day) return;
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      const { error: updateError } = await supabase.from("days").update(values).eq("id", day.id);
      if (updateError) setError(updateError.message);
    }, 500);
  };

  const addTask = async () => {
    const title = newTask.trim();
    if (!title) return;
    const { data, error: insertError } = await supabase.from("tasks").insert({ user_id: userId, day_id: day?.id ?? null, title, status: "inbox", position: tasks.length }).select().single();
    if (insertError) setError(insertError.message);
    else if (data) { setTasks((current) => [...current, data]); setNewTask(""); }
  };
  const completeTask = async (task: Task) => {
    setTasks((current) => current.filter((item) => item.id !== task.id));
    const { error: updateError } = await supabase.from("tasks").update({ status: "done" }).eq("id", task.id);
    if (updateError) { setError(updateError.message); setTasks((current) => [...current, task]); }
  };
  const copyPlan = async () => {
    if (!day) return;
    const planned = blocks.filter((block) => block.lane === "plan");
    if (!planned.length) return;
    const { data, error: insertError } = await supabase.from("blocks").insert(planned.map((block) => ({
      user_id: block.user_id,
      day_id: block.day_id,
      start_min: block.start_min,
      end_min: block.end_min,
      label: block.label,
      category: block.category,
      status: block.status,
      color: block.color,
      lane: "revised" as const,
    }))).select();
    if (insertError) setError(insertError.message);
    else if (data) setBlocks((current) => [...current, ...data]);
  };
  const signOut = async () => { await supabase.auth.signOut(); window.location.href = "/"; };

  const planBlocks = blocks.filter((block) => block.lane === "plan");
  const deepHours = planBlocks.filter((block) => block.category === "deep").reduce((sum, block) => sum + block.end_min - block.start_min, 0) / 60;
  const shallowHours = planBlocks.filter((block) => block.category === "shallow").reduce((sum, block) => sum + block.end_min - block.start_min, 0) / 60;
  const today = dateString(new Date());

  if (loading || !settings || !day) {
    return <main className="mx-auto flex min-h-dvh w-full max-w-7xl items-center justify-center p-6"><p className="text-muted-foreground text-sm">Loading your day…</p></main>;
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-7xl px-4 pb-8 sm:px-6">
      <header className="flex flex-wrap items-center gap-3 border-b border-border/70 py-4">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><span className="font-serif text-lg font-semibold">T</span></div>
        <div>
          <h1 className="font-serif text-lg font-semibold tracking-tight">Timeblocks</h1>
          <p className="text-muted-foreground text-xs">Make a plan. Revise without guilt.</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button aria-label="Previous day" onClick={() => setDate((current) => shiftDate(current, -1))} size="icon-sm" variant="ghost"><ChevronLeftIcon /></Button>
          <Button className="min-w-32" onClick={() => setDate(today)} variant={date === today ? "secondary" : "ghost"}>{date === today ? "Today" : formatDate(date)}</Button>
          <Button aria-label="Next day" onClick={() => setDate((current) => shiftDate(current, 1))} size="icon-sm" variant="ghost"><ChevronRightIcon /></Button>
        </div>
        <Button className="text-muted-foreground" onClick={signOut} size="sm" variant="ghost"><LogOutIcon /> Sign out</Button>
      </header>
      <div className="flex flex-wrap items-end justify-between gap-3 py-7">
        <div>
          <p className="text-accent-foreground text-xs font-medium tracking-[0.18em] uppercase">Your day</p>
          <h2 className="font-serif mt-1 text-3xl font-semibold tracking-tight">{formatDate(date)}</h2>
        </div>
        <Button onClick={copyPlan} variant="outline"><CopyIcon /> Copy plan → revised</Button>
      </div>
      {error && <p className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_280px]">
        {(["plan", "revised"] as BlockLane[]).map((lane) => (
          <Card className="overflow-visible p-0" key={lane}>
            <div className="flex items-center justify-between px-4 py-3">
              <div><h3 className="font-serif text-lg font-semibold">{lane === "plan" ? "Plan" : "Revised"}</h3><p className="text-muted-foreground text-xs">{lane === "plan" ? "Your ideal day" : "When the day goes sideways"}</p></div>
              <span className="text-muted-foreground text-[10px] tracking-[0.14em] uppercase">Drag to block</span>
            </div>
            <Timeline blocks={blocks.filter((block) => block.lane === lane)} lane={lane} onCreate={createBlock} onEdit={setSelectedBlock} onUpdate={updateBlock} settings={settings} />
          </Card>
        ))}
        <aside className="flex flex-col gap-5">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between"><div><h3 className="font-serif text-lg font-semibold">Inbox</h3><p className="text-muted-foreground text-xs">The next things to place</p></div><CircleIcon className="text-muted-foreground size-4" /></div>
            <div className="flex gap-2"><Input onChange={(event) => setNewTask(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void addTask(); }} placeholder="Add a task…" value={newTask} /><Button aria-label="Add task" onClick={() => void addTask()} size="icon"><PlusIcon /></Button></div>
            <div className="mt-3 flex flex-col divide-y divide-border/60">{tasks.map((task) => <button className="hover:bg-muted/60 flex items-start gap-2.5 px-1 py-2.5 text-left text-sm" key={task.id} onClick={() => void completeTask(task)} type="button"><span className="mt-0.5 flex size-4 shrink-0 rounded-full border border-muted-foreground/50" /><span>{task.title}</span></button>)}</div>
            {tasks.length === 0 && <p className="text-muted-foreground py-4 text-center text-xs">Inbox clear.</p>}
          </Card>
          <Card className="p-4">
            <h3 className="font-serif text-lg font-semibold">Shutdown</h3>
            <p className="text-muted-foreground mt-1 text-xs">Close the loops before you close the day.</p>
            <Textarea className="mt-4 min-h-28 resize-none" onChange={(event) => updateDay({ notes: event.target.value })} placeholder="Notes for tomorrow…" value={day.notes ?? ""} />
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm"><input checked={day.shutdown_complete} className="size-4 accent-primary" onChange={(event) => updateDay({ shutdown_complete: event.target.checked })} type="checkbox" /> Shutdown complete</label>
          </Card>
        </aside>
      </div>
      <footer className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/70 py-5 text-xs"><span className="font-medium text-foreground">Planned focus</span><span>{deepHours.toFixed(1)}h deep work</span><span>{shallowHours.toFixed(1)}h shallow work</span><span className="ml-auto">15-minute increments · {formatTime(settings.day_start_min)}–{formatTime(settings.day_end_min)}</span></footer>
      {selectedBlock && <BlockEditor block={selectedBlock} onChange={(values) => { void updateBlock(selectedBlock.id, values); setSelectedBlock((current) => current ? { ...current, ...values } : current); }} onClose={() => setSelectedBlock(null)} onDelete={() => void deleteBlock()} />}
    </main>
  );
}
