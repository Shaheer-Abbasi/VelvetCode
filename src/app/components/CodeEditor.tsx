"use client";

import { useEffect, useRef } from "react";

export default function CodeEditor() {
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Listen for QuickTools actions
  useEffect(() => {
    const onAction = (e: CustomEvent) => {
      const { type, text } = e.detail || {};

      if (!editorRef.current) return;

      if (type === "insert-text" && text) {
        editorRef.current.value += "\n" + text;
      }

      if (type === "ai-explain") {
        alert("🤖 AI Explain: This will use Gemini API later to analyze your code!");
      }

      if (type === "ai-refactor") {
        alert("🧠 AI Refactor: This will use Gemini API to clean your code soon!");
      }

      if (type === "ai-generate-tests") {
        alert("🧪 AI Generate Tests: Gemini will suggest test cases here.");
      }
    };

    window.addEventListener("editor:action", onAction as EventListener);
    return () => window.removeEventListener("editor:action", onAction as EventListener);
  }, []);

  return (
    <section className="flex flex-col flex-grow bg-[#121212] text-white p-4 rounded-2xl border border-[#E74C3C]/30 backdrop-blur-md shadow-lg">
      <h2 className="text-lg font-semibold mb-3 text-[#E74C3C]">Editor</h2>

      <textarea
        ref={editorRef}
        placeholder="// Start typing your code here..."
        className="w-full h-[60vh] resize-none rounded-lg bg-[#1A1A1A]/80 p-3 text-sm text-white placeholder:text-gray-500 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#E74C3C]/50"
      />

      <div className="flex justify-end mt-3 text-xs text-gray-400">
        <span>Room synced • Local edit mode</span>
      </div>
    </section>
  );
}
