// app/r/[roomId]/room.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import type { Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import dynamic from "next/dynamic";

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
      if (editorRef.current) {
        editorRef.current.setValue(state.code || "");
      }
    });

    socket.on("code-update", ({ code }: { code: string }) => {
      if (editorRef.current && editorRef.current.getValue() !== code) {
        const cur = editorRef.current.getPosition();
        editorRef.current.setValue(code);
        if (cur) editorRef.current.setPosition(cur);
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
          const code = editor.getValue();
          socketRef.current?.emit("code-update", { roomId, code });
        } catch (error) {
          console.error('Error getting editor value:', error);
        }
      });

      return () => {
        try {
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

  // Chat
  function sendChat(text: string) {
    const msg = { id: uuidv4(), name: name || "Anon", text, ts: Date.now() };
    socketRef.current?.emit("chat-message", { roomId, msg });
    // Don't add to local state - let it come back from server to avoid duplicates
  }

  async function askAI(kind: "improve" | "explain" | "test") {
    const code = editorRef.current?.getValue() || "";
    const res = await fetch("/api/ai/suggest", {
      method: "POST",
      body: JSON.stringify({ kind, language, code }),
    });
    const data = await res.json();
    sendChat(data.message); // drop AI result into chat
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
            className="bg-white/10 px-3 py-1 rounded hover:bg-white/20"
            onClick={() => askAI("improve")}
          >
            AI: Improve
          </button>
          <button
            className="bg-white/10 px-3 py-1 rounded hover:bg-white/20"
            onClick={() => askAI("explain")}
          >
            AI: Explain
          </button>
          <button
            className="bg-white/10 px-3 py-1 rounded hover:bg-white/20"
            onClick={() => askAI("test")}
          >
            AI: Tests
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
          <div className="flex-1 overflow-auto px-3 space-y-2">
            {chat.map((m) => (
              <div key={m.id} className="text-sm">
                <span className="font-semibold">{m.name}: </span>
                <span className="opacity-90 whitespace-pre-wrap">{m.text}</span>
              </div>
            ))}
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
