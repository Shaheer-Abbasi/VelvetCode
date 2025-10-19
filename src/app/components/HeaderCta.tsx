"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

export default function HeaderCta() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const createProject = () => {
    const roomId = "room-" + Math.random().toString(36).slice(2, 8);
    router.push(`/editor?room=${roomId}`);
  };

  const joinProject = () => {
    const code = inputRef.current?.value.trim();
    if (code) router.push(`/editor?room=${code}`);
  };

  return (
    <>
      {/* Slim VC header (left-aligned) */}
      <header className="flex items-center justify-start h-[56px] px-6 border-b vc-border">
        <h1 className="text-3xl font-extrabold text-uhred">VC</h1>
      </header>

      {/* Action bar under header */}
      <section className="flex items-center gap-3 px-6 py-4 border-b vc-border">
        <button
          onClick={createProject}
          className="rounded-xl bg-white text-black px-5 py-2 text-sm font-semibold shadow hover:bg-gray-200 transition-all duration-200"
        >
          + Create Project
        </button>

        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            placeholder="Enter room code"
            className="vc-focus rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm placeholder:text-white/40"
          />
          <button
            onClick={joinProject}
            className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm hover:bg-white/20 transition-all"
          >
            Join
          </button>
        </div>
      </section>
    </>
  );
}
