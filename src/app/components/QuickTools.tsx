"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** Glass card */
function GlassCard(props: {
  title: string;
  desc?: string;
  icon?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      onClick={props.onClick}
      className={[
        "group relative rounded-2xl p-6 md:p-7",
        "bg-[var(--vc-mid)]/92 backdrop-blur-sm",             // darker card for readability
        "border border-[var(--vc-border)]",                    // neutral border
        "shadow-[0_10px_30px_-15px_rgba(0,0,0,0.45)]",
        "transition-transform hover:-translate-y-0.5"
      ].join(" ")}
    >
      {/* thin UH red accent line */}
      <div className="absolute left-0 top-0 h-1 w-full rounded-t-2xl bg-[var(--vc-red)]/85" />
      <div className="flex items-start gap-3">
        {props.icon && <div className="text-2xl">{props.icon}</div>}
        <div className="flex-1">
          <div className="text-lg font-semibold">{props.title}</div>
          {props.desc && <div className="mt-1 text-[15px] text-dim">{props.desc}</div>}
        </div>
      </div>
      {props.children && <div className="mt-4">{props.children}</div>}
    </div>
  );
}


export default function QuickTools() {
  const router = useRouter();

  // -------- Recent rooms (localStorage) --------
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    try {
      const r = JSON.parse(localStorage.getItem("vc.recentRooms") || "[]");
      setRecent(Array.isArray(r) ? r.slice(0, 5) : []);
    } catch {}
  }, []);

  const addRecent = (room: string) => {
    try {
      const r = new Set([room, ...recent]);
      const list = Array.from(r).slice(0, 8);
      localStorage.setItem("vc.recentRooms", JSON.stringify(list));
      setRecent(list);
    } catch {}
  };

  // -------- Helpers --------
  const createRoom = () => {
    const id = "room-" + Math.random().toString(36).slice(2, 8);
    addRecent(id);
    router.push(`/editor?room=${id}`);
  };

  const joinRef = useRef<HTMLInputElement>(null);
  const joinRoom = () => {
    const code = joinRef.current?.value.trim();
    if (code) {
      addRecent(code);
      router.push(`/editor?room=${code}`);
    }
  };

  // Tiny local notes (stored in localStorage)
  const [notes, setNotes] = useState("");
  useEffect(() => {
    setNotes(localStorage.getItem("vc.notes") || "");
  }, []);
  useEffect(() => {
    const id = setTimeout(() => localStorage.setItem("vc.notes", notes), 250);
    return () => clearTimeout(id);
  }, [notes]);

  // Editor actions (your CodeEditor can listen for these)
  const sendEditorAction = (type: string, payload?: any) =>
    window.dispatchEvent(new CustomEvent("editor:action", { detail: { type, ...payload } }));

  const sampleSnippets = useMemo(
    () => [
      { label: "JS: Debounce", payload: "js-debounce" },
      { label: "TS: Fetch + Zod", payload: "ts-fetch-zod" },
      { label: "PY: Quick Sort", payload: "py-quicksort" },
    ],
    []
  );

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-dim">QUICK TOOLS</h2>

      {/* grid of glass cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 px-2 py-4 text-[15px] leading-relaxed">
        {/* AI Helper */}
        <GlassCard
          icon="🤖"
          title="AI Helper (Gemini Ready)"
          desc="Explain, refactor, or generate tests for the selected code."
        >
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => sendEditorAction("ai-explain")}
              className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
            >
              Explain Selection
            </button>
            <button
              onClick={() => sendEditorAction("ai-refactor")}
              className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
            >
              Refactor
            </button>
            <button
              onClick={() => sendEditorAction("ai-generate-tests")}
              className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
            >
              Generate Tests
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {sampleSnippets.map((s) => (
              <button
                key={s.payload}
                onClick={() => sendEditorAction("insert-snippet", { id: s.payload })}
                className="rounded-full border border-[var(--vc-red)]/40 bg-[var(--vc-red)]/10 px-3 py-1 text-xs hover:bg-[var(--vc-red)]/20"
              >
                {s.label}
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Projects */}
        <GlassCard
          icon="🗂️"
          title="Projects"
          desc="Create a room or jump back into a recent one."
        >
          <div className="flex items-center gap-2">
            <button
              onClick={createRoom}
              className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-black hover:bg-gray-200"
            >
              + Create
            </button>
            <input
              ref={joinRef}
              placeholder="Room code"
              className="vc-focus w-40 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-sm placeholder:text-white/40"
            />
            <button
              onClick={joinRoom}
              className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
            >
              Join
            </button>
          </div>

          {recent.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 text-xs text-dim">Recent</div>
              <div className="flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button
                    key={r}
                    onClick={() => router.push(`/editor?room=${r}`)}
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs hover:bg-white/20"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </GlassCard>

        {/* Notes / Planner */}
        <GlassCard
          icon="📝"
          title="Notes (local)"
          desc="Quick scratchpad saved in your browser."
        >
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write ideas, todos, or commands…"
            className="vc-focus h-28 w-full resize-none rounded-lg border border-white/10 bg-white/5 p-3 text-sm placeholder:text-white/40"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => setNotes("")}
              className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
            >
              Clear
            </button>
            <button
              onClick={() => sendEditorAction("insert-text", { text: notes })}
              className="rounded-lg border border-[var(--vc-red)]/40 bg-[var(--vc-red)]/10 px-3 py-1.5 text-sm hover:bg-[var(--vc-red)]/20"
            >
              Paste into Editor
            </button>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
