// app/r/[roomId]/room.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import type { Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

// Import highlight.js CSS for syntax highlighting
import "highlight.js/styles/vs2015.css";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4000";

type ChatMessage = { id: string; name: string; text: string; ts: number };

type RoomState = {
  code: string;
  language: string;
  chat: ChatMessage[];
};

export default function Room({ params }: { params: { roomId: string } }) {
  const { roomId } = params;
  const editorRef = useRef<any>(null);
  const monacoEl = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<typeof Socket | null>(null);
  const [monaco, setMonaco] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  const [language, setLanguage] = useState("javascript");
  const [chat, setChat] = useState<RoomState["chat"]>([]);
  const [name, setName] = useState<string>("Anon");
  const [isAILoading, setIsAILoading] = useState(false);
  const isUpdatingFromRemoteRef = useRef(false);
  const lastRemoteContentRef = useRef("");
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load Monaco Editor only on client side
  useEffect(() => {
    setIsClient(true);
    const loadMonaco = async () => {
      try {
        // Set up Monaco Environment with getWorker instead of getWorkerUrl
        (window as any).MonacoEnvironment = {
          getWorker: function (workerId: string, label: string) {
            // Create a more complete worker blob
            const workerCode = `
              // Simple worker implementation
              let initialized = false;
              
              self.addEventListener('message', function(e) {
                const { id, method, params } = e.data;
                
                // Initialize response
                if (!initialized) {
                  initialized = true;
                  self.postMessage({ type: 'initialized' });
                }
                
                // Handle common Monaco worker methods
                switch (method) {
                  case 'initialize':
                    self.postMessage({ id, result: true });
                    break;
                  case 'getSemanticDiagnostics':
                  case 'getSyntacticDiagnostics':
                  case 'getSuggestionDiagnostics':
                    self.postMessage({ id, result: [] });
                    break;
                  case 'getCompletionItems':
                    self.postMessage({ id, result: { suggestions: [] } });
                    break;
                  case 'getSignatureHelp':
                    self.postMessage({ id, result: null });
                    break;
                  case 'getQuickInfo':
                    self.postMessage({ id, result: null });
                    break;
                  case 'getDefinition':
                  case 'getReferences':
                    self.postMessage({ id, result: [] });
                    break;
                  default:
                    // Default response for unknown methods
                    self.postMessage({ id, result: null });
                }
              });
              
              // Handle errors
              self.addEventListener('error', function(e) {
                console.log('Worker error:', e);
              });
            `;
            
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const blobUrl = URL.createObjectURL(blob);
            const worker = new Worker(blobUrl);
            
            // Clean up blob URL after worker is created
            worker.addEventListener('message', () => {
              URL.revokeObjectURL(blobUrl);
            }, { once: true });
            
            return worker;
          }
        };

        const monacoEditor = await import("monaco-editor");
        setMonaco(monacoEditor);
      } catch (error) {
        console.error('Failed to load Monaco Editor:', error);
      }
    };
    loadMonaco();
  }, []);

  // Connect WS
  useEffect(() => {
    const socket = io(WS_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.emit("join-room", { roomId });

    socket.on("room-state", (state: RoomState) => {
      setLanguage(state.language);
      setChat(state.chat);
      if (editorRef.current && state.code !== lastRemoteContentRef.current) {
        isUpdatingFromRemoteRef.current = true;
        lastRemoteContentRef.current = state.code || "";
        editorRef.current.setValue(state.code || "");
        setTimeout(() => { isUpdatingFromRemoteRef.current = false; }, 100);
      }
    });

    socket.on("code-update", ({ code }: { code: string }) => {
      if (editorRef.current && code !== lastRemoteContentRef.current && editorRef.current.getValue() !== code) {
        isUpdatingFromRemoteRef.current = true;
        lastRemoteContentRef.current = code;
        const cur = editorRef.current.getPosition();
        editorRef.current.setValue(code);
        if (cur) editorRef.current.setPosition(cur);
        setTimeout(() => { isUpdatingFromRemoteRef.current = false; }, 100);
      }
    });

    socket.on("language-change", ({ language }: { language: string }) => {
      setLanguage(language);
      if (editorRef.current && monaco) {
        const model = editorRef.current.getModel();
        if (model) monaco.editor.setModelLanguage(model, language);
      }
    });

    socket.on("chat-message", (msg: ChatMessage) => {
      setChat((c) => [...c, msg]);
      // Scroll to bottom when new message arrives
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  // Init Monaco
  useEffect(() => {
    if (!monacoEl.current || !monaco || !isClient) return;
    
    try {
      // Dispose existing editor if it exists
      if (editorRef.current) {
        editorRef.current.dispose();
      }
      
      const editor = monaco.editor.create(monacoEl.current, {
        value: "// Start typing together...\n",
        language,
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        theme: "vs-dark",
        // Disable features that might cause worker issues
        wordWrap: 'on',
        glyphMargin: false,
        folding: false,
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 3,
        renderLineHighlight: 'none',
      });
      editorRef.current = editor;

      const sub = editor.onDidChangeModelContent(() => {
        try {
          // Don't emit updates if we're currently updating from remote
          if (isUpdatingFromRemoteRef.current) return;
          
          // Debounce the updates to prevent rapid-fire emissions
          if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
          }
          
          updateTimeoutRef.current = setTimeout(() => {
            if (!isUpdatingFromRemoteRef.current) {
              const code = editor.getValue();
              socketRef.current?.emit("code-update", { roomId, code });
            }
          }, 150); // 150ms debounce
        } catch (error) {
          console.error('Error getting editor value:', error);
        }
      });

      return () => {
        try {
          if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
          }
          sub.dispose();
          editor.dispose();
        } catch (error) {
          console.error('Error disposing editor:', error);
        }
      };
    } catch (error) {
      console.error('Error creating Monaco editor:', error);
    }
  }, [monaco, language, roomId, isClient]);

  // Change language
  function handleLangChange(e: React.ChangeEvent<HTMLSelectElement>) {
    try {
      const lang = e.target.value;
      setLanguage(lang);
      if (monaco && editorRef.current) {
        const model = editorRef.current.getModel();
        if (model) monaco.editor.setModelLanguage(model, lang);
      }
      socketRef.current?.emit("language-change", { roomId, language: lang });
    } catch (error) {
      console.error('Error changing language:', error);
    }
  }

  // Chat - for user messages
  function sendChat(text: string) {
    const msg = { id: uuidv4(), name: name || "Anon", text, ts: Date.now() };
    socketRef.current?.emit("chat-message", { roomId, msg });
    // Don't add to local state - let it come back from server to avoid duplicates
  }

  async function askAI(kind: "improve" | "explain" | "test") {
    setIsAILoading(true);
    try {
      const code = editorRef.current?.getValue() || "";
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        body: JSON.stringify({ kind, language, code }),
      });
      const data = await res.json();
      
      if (res.ok) {
        // Send AI message with Agent prefix
        const aiMsg = { 
          id: uuidv4(), 
          name: "Agent", 
          text: data.message, 
          ts: Date.now() 
        };
        socketRef.current?.emit("chat-message", { roomId, msg: aiMsg });
      } else {
        // Handle error
        const errorMsg = { 
          id: uuidv4(), 
          name: "Agent", 
          text: `Error: ${data.error || 'Failed to get AI response'}`, 
          ts: Date.now() 
        };
        socketRef.current?.emit("chat-message", { roomId, msg: errorMsg });
      }
    } catch (error) {
      console.error('AI request failed:', error);
      const errorMsg = { 
        id: uuidv4(), 
        name: "Agent", 
        text: "Error: Failed to connect to AI service", 
        ts: Date.now() 
      };
      socketRef.current?.emit("chat-message", { roomId, msg: errorMsg });
    } finally {
      setIsAILoading(false);
      // Scroll to bottom after AI response
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 200);
    }
  }

  return (
    <div className="w-full h-screen grid grid-rows-[auto_1fr_auto] bg-black text-white">
      {/* Top Bar */}
      <div className="flex items-center gap-4 p-3 border-b border-white/10">
        <div className="text-sm opacity-70">Room: {roomId}</div>
        <select
          className="bg-neutral-900 px-2 py-1 rounded"
          value={language}
          onChange={handleLangChange}
        >
          <option value="javascript">javascript</option>
          <option value="typescript">typescript</option>
          <option value="python">python</option>
          <option value="cpp">cpp</option>
          <option value="java">java</option>
        </select>
        <div className="ml-auto flex items-center gap-2">
          <input
            className="bg-neutral-900 px-2 py-1 rounded"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            className="bg-white/10 px-3 py-1 rounded hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => askAI("improve")}
            disabled={isAILoading}
          >
            {isAILoading ? "Loading..." : "AI: Improve"}
          </button>
          <button
            className="bg-white/10 px-3 py-1 rounded hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => askAI("explain")}
            disabled={isAILoading}
          >
            {isAILoading ? "Loading..." : "AI: Explain"}
          </button>
          <button
            className="bg-white/10 px-3 py-1 rounded hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => askAI("test")}
            disabled={isAILoading}
          >
            {isAILoading ? "Loading..." : "AI: Tests"}
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="grid grid-cols-3 gap-0">
        <div className="col-span-2 relative">
          {!monaco || !isClient ? (
            <div className="w-full h-full flex items-center justify-center bg-neutral-900">
              <div className="text-white/70">Loading editor...</div>
            </div>
          ) : (
            <div ref={monacoEl} className="w-full h-full" />
          )}
        </div>
        <div className="col-span-1 border-l border-white/10 flex flex-col">
          <div className="p-3 text-sm font-semibold">Chat</div>
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-auto px-3 space-y-2"
          >
            {chat.map((m) => (
              <ChatMessageComponent key={m.id} message={m} />
            ))}
            {isAILoading && <AILoadingIndicator />}
          </div>
          <ChatInput onSend={(t) => t && sendChat(t)} />
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs p-2 opacity-60 border-t border-white/10">
        Built at the hackathon ✨
      </div>
    </div>
  );
}

function ChatMessageComponent({ message }: { message: ChatMessage }) {
  const isAgent = message.name === 'Agent';
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
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline ? (
                    <pre className="bg-gray-800 rounded p-3 my-2 overflow-x-auto">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  ) : (
                    <code className="bg-gray-700 px-1 py-0.5 rounded text-sm" {...props}>
                      {children}
                    </code>
                  );
                },
                p: ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }: any) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                ol: ({ children }: any) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                li: ({ children }: any) => <li className="ml-2">{children}</li>,
                h1: ({ children }: any) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                h2: ({ children }: any) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                h3: ({ children }: any) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                blockquote: ({ children }: any) => (
                  <blockquote className="border-l-2 border-gray-500 pl-3 italic opacity-80 mb-2">
                    {children}
                  </blockquote>
                ),
                strong: ({ children }: any) => <strong className="font-bold text-white">{children}</strong>,
                em: ({ children }: any) => <em className="italic">{children}</em>,
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

function AILoadingIndicator() {
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

function ChatInput({ onSend }: { onSend: (t: string) => void }) {
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
