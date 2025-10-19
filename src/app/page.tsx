import TopNav from "./components/TopNav";
import Sidebar from "./components/Sidebar";
import CodeEditor from "./components/CodeEditor";
import QuickTools from "./components/QuickTools";

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--vc-dark)] text-[var(--vc-foreground)]">
      <TopNav />

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 min-h-0">
        <div className="flex gap-4 h-full">
          {/* Sidebar */}
          <aside className="w-[220px] shrink-0 rounded-2xl vc-panel p-3">
            <Sidebar />
          </aside>

          {/* Main column */}
          <main className="flex-1 space-y-6">
            <div className="rounded-2xl vc-panel">
              <QuickTools />
            </div>
            <div className="rounded-2xl vc-panel p-4">
              <CodeEditor />
            </div>
          </main>
        </div>
      </div>

      <footer className="mt-auto border-t vc-border bg-[#181818] py-3 text-center text-xs text-dim">
        Connected ✅ | Built with ❤️ at UH CodeRED Astra 2025
      </footer>
    </div>
  );
}
