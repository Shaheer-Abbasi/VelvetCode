"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { ChatMessage } from './types';

// Import highlight.js CSS for syntax highlighting
import "highlight.js/styles/vs2015.css";

export function ChatMessageComponent({ message }: { message: ChatMessage }) {
  const isAgent = message.name === 'AI Agent' || message.name === 'Agent';
  const isUserMessage = !isAgent;

  return (
    <div className={`text-sm ${isAgent ? 'bg-blue-900/20 p-3 rounded border-l-2 border-blue-400 my-2' : 'my-1'}`}>
      <div className={`font-semibold mb-1 ${isAgent ? 'text-blue-400' : 'text-white'}`}>
        {message.name}:
      </div>
      <div className="opacity-90">
        {isAgent ? (
          <div className="markdown-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                // Custom styling for markdown elements
                code: ({ node, inline, className, children, ...props }: any) => {
                  if (!inline) {
                    // For code blocks, return a fragment to avoid wrapper issues
                    return (
                      <>
                        <div className="my-2">
                          <pre className="bg-gray-800 rounded p-3 overflow-x-auto">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        </div>
                      </>
                    );
                  }
                  
                  // For inline code
                  return (
                    <code className="bg-gray-700 px-1 py-0.5 rounded text-sm" {...props}>
                      {children}
                    </code>
                  );
                },
                p: ({ children, node }: any) => {
                  // Always return div to avoid any nesting issues with markdown content
                  return <div className="mb-2 last:mb-0">{children}</div>;
                },
                ul: ({ children }: any) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                ol: ({ children }: any) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                li: ({ children }: any) => <li className="ml-2">{children}</li>,
                h1: ({ children }: any) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                h2: ({ children }: any) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                h3: ({ children }: any) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                blockquote: ({ children }: any) => (
                  <div className="border-l-2 border-gray-500 pl-3 italic opacity-80 mb-2">
                    {children}
                  </div>
                ),
                strong: ({ children }: any) => <strong className="font-bold text-white">{children}</strong>,
                em: ({ children }: any) => <em className="italic">{children}</em>,
                // Handle pre elements explicitly to avoid nesting issues
                pre: ({ children }: any) => (
                  <div className="my-2">
                    <pre className="bg-gray-800 rounded p-3 overflow-x-auto">
                      {children}
                    </pre>
                  </div>
                ),
              }}
            >
              {message.text}
            </ReactMarkdown>
          </div>
        ) : (
          <span className="whitespace-pre-wrap">{message.text}</span>
        )}
      </div>
    </div>
  );
}

export function AILoadingIndicator() {
  return (
    <div className="text-sm flex items-center gap-2">
      <span className="font-semibold text-blue-400">Agent: </span>
      <div className="flex items-center gap-1">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <span className="text-xs opacity-70 ml-2">thinking...</span>
      </div>
    </div>
  );
}

export function ChatInput({ onSend }: { onSend: (t: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="p-2 flex gap-2 border-t border-white/10">
      <input
        className="flex-1 bg-neutral-900 px-3 py-2 rounded"
        placeholder="Type a message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSend(text.trim());
            setText("");
          }
        }}
      />
      <button
        className="bg-white/10 px-3 py-2 rounded hover:bg-white/20"
        onClick={() => {
          onSend(text.trim());
          setText("");
        }}
      >
        Send
      </button>
    </div>
  );
}