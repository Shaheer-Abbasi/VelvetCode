"use client";

import { useState } from "react";
import { ExecutionHistoryItem } from "./types";

interface CodeExecutionPanelProps {
  output: string | null;
  isExecuting: boolean;
  onRun: () => void;
  onClear: () => void;
  executionHistory?: ExecutionHistoryItem[];
}

export function CodeExecutionPanel({
  output,
  isExecuting,
  onRun,
  onClear,
  executionHistory = [],
}: CodeExecutionPanelProps) {
  const [showHistory, setShowHistory] = useState(false);

  // Parse output to separate stdout and stderr
  const parseOutput = (output: string | null) => {
    if (!output) return { stdout: "", stderr: "", exitCode: null };
    
    try {
      const parsed = JSON.parse(output);
      return {
        stdout: parsed.stdout || "",
        stderr: parsed.stderr || "",
        exitCode: parsed.code,
      };
    } catch {
      return { stdout: output, stderr: "", exitCode: null };
    }
  };

  const { stdout, stderr, exitCode } = parseOutput(output);
  const hasOutput = stdout || stderr;

  return (
    <div className="h-64 border-t border-red-500/20 bg-gray-900/50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-red-500/20 bg-gradient-to-r from-red-950/30 to-transparent">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-red-400">Output</span>
          {exitCode !== null && (
            <span className={`text-xs px-2 py-1 rounded ${
              exitCode === 0 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              Exit Code: {exitCode}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 rounded transition-all"
            title="Execution History"
          >
            📜 History ({executionHistory.length})
          </button>
          <button
            onClick={onRun}
            disabled={isExecuting}
            className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-all ${
              isExecuting
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/30 hover:from-green-500/30 hover:to-green-600/30 text-green-400'
            }`}
          >
            {isExecuting ? '⏳ Running...' : '▶️ Run Code'}
          </button>
          {hasOutput && (
            <button
              onClick={onClear}
              className="text-sm px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
              title="Clear Output"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {showHistory ? (
          /* Execution History */
          <div className="p-4 space-y-2">
            {executionHistory.length === 0 ? (
              <div className="text-center text-white/50 py-8">
                No execution history yet
              </div>
            ) : (
              executionHistory.slice().reverse().map((item) => (
                <div
                  key={item.id}
                  className="bg-black/30 border border-red-500/20 rounded-lg p-3 hover:border-red-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {item.fileName}
                      </span>
                      <span className="text-xs text-white/50">
                        by {item.userName}
                      </span>
                    </div>
                    <span className="text-xs text-white/50">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {item.output && (
                    <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap mb-1">
                      {item.output}
                    </pre>
                  )}
                  {item.stderr && (
                    <pre className="text-xs text-red-400 font-mono whitespace-pre-wrap">
                      {item.stderr}
                    </pre>
                  )}
                  <div className={`text-xs mt-2 ${
                    item.exitCode === 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    Exit Code: {item.exitCode}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Current Output */
          <div className="p-4 font-mono text-sm">
            {isExecuting ? (
              <div className="flex items-center gap-3 text-white/70">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span>Executing code...</span>
              </div>
            ) : hasOutput ? (
              <>
                {stdout && (
                  <div className="mb-4">
                    <div className="text-xs text-green-400 mb-1 font-semibold">STDOUT:</div>
                    <pre className="text-green-400 whitespace-pre-wrap">{stdout}</pre>
                  </div>
                )}
                {stderr && (
                  <div>
                    <div className="text-xs text-red-400 mb-1 font-semibold">STDERR:</div>
                    <pre className="text-red-400 whitespace-pre-wrap">{stderr}</pre>
                  </div>
                )}
              </>
            ) : (
              <div className="text-white/50 text-center py-8">
                Click "Run Code" to execute your code
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
