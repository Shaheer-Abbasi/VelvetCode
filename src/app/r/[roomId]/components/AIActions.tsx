"use client";

interface AIActionsProps {
  onAction: (action: string) => void;
  isLoading: boolean;
  isMobile?: boolean;
}

export function AIActions({ onAction, isLoading, isMobile = false }: AIActionsProps) {
  const buttonClass = isMobile 
    ? "flex-1 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 px-3 py-2 rounded-lg hover:from-red-500/30 hover:to-red-600/30 hover:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-all shadow-lg shadow-red-500/5"
    : "bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 px-4 py-2 rounded-lg hover:from-red-500/30 hover:to-red-600/30 hover:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-all shadow-lg shadow-red-500/5";
  
  if (isMobile) {
    return (
      <div className="flex gap-2 p-3 border-t border-red-500/20 bg-gray-900/50">
        <button
          className={buttonClass}
          onClick={() => onAction("improve")}
          disabled={isLoading}
        >
          {isLoading ? "..." : "✨ Improve"}
        </button>
        <button
          className={buttonClass}
          onClick={() => onAction("explain")}
          disabled={isLoading}
        >
          {isLoading ? "..." : "💡 Explain"}
        </button>
        <button
          className={buttonClass}
          onClick={() => onAction("test")}
          disabled={isLoading}
        >
          {isLoading ? "..." : "🧪 Tests"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2 p-3 border-t border-red-500/20 bg-gray-900/30">
      <button
        className={buttonClass}
        onClick={() => onAction("improve")}
        disabled={isLoading}
      >
        {isLoading ? "Loading..." : "✨ AI: Improve"}
      </button>
      <button
        className={buttonClass}
        onClick={() => onAction("explain")}
        disabled={isLoading}
      >
        {isLoading ? "Loading..." : "💡 AI: Explain"}
      </button>
      <button
        className={buttonClass}
        onClick={() => onAction("test")}
        disabled={isLoading}
      >
        {isLoading ? "Loading..." : "🧪 AI: Tests"}
      </button>
    </div>
  );
}