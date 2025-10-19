"use client";

interface AIActionsProps {
  onAction: (action: string) => void;
  isLoading: boolean;
  isMobile?: boolean;
}

export function AIActions({ onAction, isLoading, isMobile = false }: AIActionsProps) {
  const buttonClass = isMobile 
    ? "flex-1 bg-white/10 px-2 py-1 rounded hover:bg-white/20 disabled:opacity-50 text-xs"
    : "bg-white/10 px-3 py-2 rounded hover:bg-white/20 disabled:opacity-50 text-xs";
  
  if (isMobile) {
    return (
      <div className="flex gap-1 p-2 border-t border-white/10 bg-neutral-900">
        <button
          className={buttonClass}
          onClick={() => onAction("improve")}
          disabled={isLoading}
        >
          {isLoading ? "..." : "Improve"}
        </button>
        <button
          className={buttonClass}
          onClick={() => onAction("explain")}
          disabled={isLoading}
        >
          {isLoading ? "..." : "Explain"}
        </button>
        <button
          className={buttonClass}
          onClick={() => onAction("test")}
          disabled={isLoading}
        >
          {isLoading ? "..." : "Tests"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2 p-2 border-t border-white/10">
      <button
        className={buttonClass}
        onClick={() => onAction("improve")}
        disabled={isLoading}
      >
        {isLoading ? "Loading..." : "AI: Improve"}
      </button>
      <button
        className={buttonClass}
        onClick={() => onAction("explain")}
        disabled={isLoading}
      >
        {isLoading ? "Loading..." : "AI: Explain"}
      </button>
      <button
        className={buttonClass}
        onClick={() => onAction("test")}
        disabled={isLoading}
      >
        {isLoading ? "Loading..." : "AI: Tests"}
      </button>
    </div>
  );
}