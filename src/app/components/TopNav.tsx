"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type MenuKey = "projects" | "editor" | "ai" | "docs" | null;

export default function TopNav() {
  const router = useRouter();
  const [open, setOpen] = useState<MenuKey>(null);
  const joinRef = useRef<HTMLInputElement>(null);

  // close any open dropdown when clicking outside
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el.closest("[data-dropdown]")) setOpen(null);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  // broadcast simple actions your editor can listen for
  const sendEditorAction = (type: string, payload?: any) =>
    window.dispatchEvent(new CustomEvent("editor:action", { detail: { type, ...payload } }));

  const createProject = () => {
    const id = "room-" + Math.random().toString(36).slice(2, 8);
    router.push(`/editor?room=${id}`);
  };

  const joinProject = () => {
    const code = joinRef.current?.value.trim();
    if (code) router.push(`/editor?room=${code}`);
  };

  const openSample = () => router.push(`/editor?room=sample-js`);

  return (
    <header className="sticky top-0 z-30 border-b vc-border bg-[var(--vc-dark)]">
      {/* bar container must be relative so the centered nav can be absolute */}
      <div className="relative mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-8 px-4">
        {/* Left: brand */}
        <div className="flex items-center gap-2">
          <span className="text-[2.5rem] sm:text-[2.75rem] font-extrabold text-uhred leading-none tracking-tight">
            VC
          </span>
          <span className="hidden sm:block text-sm text-dim">VelvetCode</span>
        </div>

        {/* Center: menu row (absolute-centered) */}
        <nav className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-10 text-[13px] tracking-wide">
          <Dropdown
            label="PROJECTS"
            open={open === "projects"}
            onToggle={() => setOpen(open === "projects" ? null : "projects")}
          >
            <div className="grid gap-2 p-1">
              <button onClick={createProject} className="dropdown-item">+ Create Room</button>
              <div className="flex items-center justify-center gap-2 p-1">
                <input
                  ref={joinRef}
                  placeholder="Room code"
                  className="vc-focus w-40 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm placeholder:text-white/40"
                />
                <button onClick={joinProject} className="dropdown-item px-3 py-2">Join</button>
              </div>
              <div className="h-px bg-white/10 my-1" />
              <button onClick={() => router.push("/editor?room=demo-room")} className="dropdown-item">
                Recent: demo-room
              </button>
            </div>
          </Dropdown>

          <Dropdown
            label="EDITOR"
            open={open === "editor"}
            onToggle={() => setOpen(open === "editor" ? null : "editor")}
          >
            <div className="p-1">
              <button onClick={() => sendEditorAction("new-file")} className="dropdown-item">New File</button>
              <button onClick={openSample} className="dropdown-item">Open Sample</button>
              <button onClick={() => sendEditorAction("toggle-minimap")} className="dropdown-item">Toggle Minimap</button>
            </div>
          </Dropdown>

          <Dropdown
            label="AI"
            open={open === "ai"}
            onToggle={() => setOpen(open === "ai" ? null : "ai")}
          >
            <div className="p-1">
              <button onClick={() => sendEditorAction("ai-explain")} className="dropdown-item">Explain Selection</button>
              <button onClick={() => sendEditorAction("ai-refactor")} className="dropdown-item">Refactor</button>
              <button onClick={() => sendEditorAction("ai-generate-tests")} className="dropdown-item">Generate Tests</button>
            </div>
          </Dropdown>

          <Dropdown
            label="DOCS"
            open={open === "docs"}
            onToggle={() => setOpen(open === "docs" ? null : "docs")}
          >
            <div className="p-1">
              <a href="/README" className="dropdown-item">README</a>
              <a href="https://devpost.com/" target="_blank" rel="noreferrer" className="dropdown-item">Devpost</a>
              <a href="/rules" className="dropdown-item">Hackathon Rules</a>
            </div>
          </Dropdown>
        </nav>

        {/* Right: auth (always visible) */}
        <div className="flex items-center gap-3">
          <button className="text-[11px] sm:text-xs font-semibold tracking-wide hover:opacity-90">
            SIGN UP
          </button>
          <button className="text-[11px] sm:text-xs tracking-wide hover:opacity-90">
            LOG IN
          </button>
        </div>
      </div>

      {/* UH accent strip */}
      <div className="h-[6px] w-full bg-uhred" />

      {/* local styles for dropdown items */}
      <style jsx>{`
        .dropdown-item {
          display: inline-block;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        .dropdown-item:hover { background: rgba(255, 255, 255, 0.06); }
      `}</style>
    </header>
  );
}

/* -------- dropdown subcomponent (inline, compact, centered) -------- */
function Dropdown({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative inline-block" data-dropdown>
      <button
        onClick={onToggle}
        className="inline-flex items-center gap-2 rounded-md px-2 py-1 hover:bg-white/5"
      >
        <span>{label}</span>
        <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="absolute left-1/2 z-20 mt-3 w-64 -translate-x-1/2 rounded-2xl border border-white/10 bg-[#121212] p-2 shadow-2xl">
          {children}
        </div>
      )}
    </div>
  );
}
