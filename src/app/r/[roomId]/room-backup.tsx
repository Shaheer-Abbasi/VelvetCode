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

type FileNode = {
  id: string;
  name: string;
  type: "file" | "folder";
  content?: string; // Only for files
  language?: string; // Only for files
  parentId?: string;
  children?: string[]; // Only for folders - array of child IDs
};

type RoomState = {
  files: Record<string, FileNode>; // Will be converted from Map on server
  fileTree: string[]; // Root level file/folder IDs
  activeFileId: string | null;
  chat: ChatMessage[];
};

// Resizer Component for panel resizing
function Resizer({ 
  onResize, 
  direction = 'horizontal' 
}: { 
  onResize: (delta: number) => void;
  direction?: 'horizontal' | 'vertical';
}) {
  const [isResizing, setIsResizing] = useState(false);
  const startPosRef = useRef(0);
  const isResizingRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    isResizingRef.current = true;
    startPosRef.current = direction === 'horizontal' ? e.clientX : e.clientY;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - startPosRef.current;
      
      // Only update if there's a meaningful change
      if (Math.abs(delta) > 1) {
        onResize(delta);
        startPosRef.current = currentPos;
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      isResizingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className={`bg-neutral-700 hover:bg-neutral-600 transition-colors flex-shrink-0 ${
        direction === 'horizontal' 
          ? 'w-2 cursor-col-resize' 
          : 'h-2 cursor-row-resize'
      } ${isResizing ? 'bg-blue-500' : ''}`}
      onMouseDown={handleMouseDown}
      style={{
        userSelect: 'none',
        touchAction: 'none'
      }}
    />
  );
}

// Mobile Panel Selector
function MobilePanelSelector({ 
  activePanel, 
  onPanelChange,
  fileCount,
  chatCount
}: {
  activePanel: 'files' | 'editor' | 'chat';
  onPanelChange: (panel: 'files' | 'editor' | 'chat') => void;
  fileCount: number;
  chatCount: number;
}) {
  return (
    <div className="flex border-b border-white/10 bg-neutral-900">
      <button
        className={`flex-1 py-2 px-3 text-sm font-medium ${
          activePanel === 'files' 
            ? 'bg-neutral-800 text-white border-b-2 border-blue-500' 
            : 'text-white/70 hover:text-white hover:bg-white/5'
        }`}
        onClick={() => onPanelChange('files')}
      >
        📁 Files ({fileCount})
      </button>
      <button
        className={`flex-1 py-2 px-3 text-sm font-medium ${
          activePanel === 'editor' 
            ? 'bg-neutral-800 text-white border-b-2 border-blue-500' 
            : 'text-white/70 hover:text-white hover:bg-white/5'
        }`}
        onClick={() => onPanelChange('editor')}
      >
        💻 Editor
      </button>
      <button
        className={`flex-1 py-2 px-3 text-sm font-medium ${
          activePanel === 'chat' 
            ? 'bg-neutral-800 text-white border-b-2 border-blue-500' 
            : 'text-white/70 hover:text-white hover:bg-white/5'
        }`}
        onClick={() => onPanelChange('chat')}
      >
        💬 Chat ({chatCount})
      </button>
    </div>
  );
}

// File Explorer Component
function FileExplorer({ 
  files = {}, 
  fileTree = [], 
  activeFileId, 
  onSelectFile, 
  onCreateFile, 
  onCreateFolder, 
  onDeleteFile, 
  onRenameFile 
}: {
  files: Record<string, FileNode>;
  fileTree: string[];
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onCreateFile: (name: string, parentId?: string) => void;
  onCreateFolder: (name: string, parentId?: string) => void;
  onDeleteFile: (fileId: string) => void;
  onRenameFile: (fileId: string, newName: string) => void;
}) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; fileId?: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleContextMenu = (e: React.MouseEvent, fileId?: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, fileId });
  };

  const handleRename = (fileId: string, currentName: string) => {
    setEditingId(fileId);
    setEditingName(currentName);
    setContextMenu(null);
  };

  const confirmRename = () => {
    if (editingId && editingName.trim()) {
      onRenameFile(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName("");
  };

  const renderFileTree = (nodeIds: string[], level = 0) => {
    if (!nodeIds || !Array.isArray(nodeIds)) return null;
    
    return nodeIds.map(nodeId => {
      const node = files[nodeId];
      if (!node) return null;

      const isActive = activeFileId === nodeId;
      const isExpanded = expandedFolders.has(nodeId);
      const isEditing = editingId === nodeId;

      return (
        <div key={nodeId}>
          <div
            className={`flex items-center gap-2 px-2 py-1 text-sm hover:bg-white/10 cursor-pointer ${
              isActive ? 'bg-blue-600/30 text-blue-300' : ''
            }`}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={() => {
              if (node.type === "file") {
                onSelectFile(nodeId);
              } else {
                toggleFolder(nodeId);
              }
            }}
            onDoubleClick={() => {
              handleRename(nodeId, node.name);
            }}
            onContextMenu={(e) => handleContextMenu(e, nodeId)}
          >
            {node.type === "folder" && (
              <span className="text-xs">
                {isExpanded ? "📂" : "📁"}
              </span>
            )}
            {node.type === "file" && (
              <span className="text-xs">📄</span>
            )}
            
            {isEditing ? (
              <input
                className="bg-transparent border-b border-blue-400 outline-none flex-1"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={confirmRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmRename();
                  if (e.key === "Escape") {
                    setEditingId(null);
                    setEditingName("");
                  }
                }}
                autoFocus
              />
            ) : (
              <span className="flex-1 truncate">{node.name}</span>
            )}
          </div>
          
          {node.type === "folder" && isExpanded && node.children && node.children.length > 0 && (
            <div>
              {renderFileTree(node.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 text-sm font-semibold border-b border-white/10">
        <div className="flex items-center justify-between">
          <span>Files</span>
          <div className="flex gap-1">
            <button
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10"
              onClick={() => onCreateFile("new-file.js")}
              title="New File"
            >
              📄
            </button>
            <button
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10"
              onClick={() => onCreateFolder("new-folder")}
              title="New Folder"
            >
              📁
            </button>
          </div>
        </div>
      </div>
      
      <div 
        className="flex-1 overflow-auto"
        onContextMenu={(e) => handleContextMenu(e)}
      >
        {fileTree && fileTree.length > 0 ? renderFileTree(fileTree) : (
          <div className="p-4 text-sm text-white/50 text-center">
            No files yet. Click + to create files.
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 bg-gray-800 border border-gray-600 rounded shadow-lg py-1 min-w-32"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.fileId ? (
              <>
                <button
                  className="w-full px-3 py-1 text-left text-sm hover:bg-white/10"
                  onClick={() => {
                    const file = files[contextMenu.fileId!];
                    handleRename(contextMenu.fileId!, file.name);
                  }}
                >
                  Rename
                </button>
                <button
                  className="w-full px-3 py-1 text-left text-sm hover:bg-white/10 text-red-400"
                  onClick={() => {
                    onDeleteFile(contextMenu.fileId!);
                    setContextMenu(null);
                  }}
                >
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  className="w-full px-3 py-1 text-left text-sm hover:bg-white/10"
                  onClick={() => {
                    onCreateFile("new-file.js");
                    setContextMenu(null);
                  }}
                >
                  New File
                </button>
                <button
                  className="w-full px-3 py-1 text-left text-sm hover:bg-white/10"
                  onClick={() => {
                    onCreateFolder("new-folder");
                    setContextMenu(null);
                  }}
                >
                  New Folder
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// File Tabs Component
function FileTabs({ 
  openFiles = [], 
  activeFileId, 
  files = {}, 
  onSelectFile, 
  onCloseFile 
}: {
  openFiles: string[];
  activeFileId: string | null;
  files: Record<string, FileNode>;
  onSelectFile: (fileId: string) => void;
  onCloseFile: (fileId: string) => void;
}) {
  if (openFiles.length === 0) return null;

  return (
    <div className="flex border-b border-white/10 bg-neutral-900">
      {openFiles.map(fileId => {
        const file = files[fileId];
        if (!file) return null;
        
        const isActive = activeFileId === fileId;
        
        return (
          <div
            key={fileId}
            className={`flex items-center gap-2 px-3 py-2 border-r border-white/10 cursor-pointer hover:bg-white/5 ${
              isActive ? 'bg-neutral-800 text-white' : 'text-white/70'
            }`}
            onClick={() => onSelectFile(fileId)}
          >
            <span className="text-xs">📄</span>
            <span className="text-sm">{file.name}</span>
            <button
              className="text-xs hover:text-red-400 ml-1"
              onClick={(e) => {
                e.stopPropagation();
                onCloseFile(fileId);
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

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
  
  // File system state
  const [files, setFiles] = useState<Record<string, FileNode>>({});
  const [fileTree, setFileTree] = useState<string[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<string[]>([]); // Tabs for open files
  
  // Panel sizing state
  const [leftPanelWidth, setLeftPanelWidth] = useState(300); // File explorer width
  const [rightPanelWidth, setRightPanelWidth] = useState(350); // Chat panel width
  const [isMobile, setIsMobile] = useState(false);
  const [activePanel, setActivePanel] = useState<'files' | 'editor' | 'chat'>('editor'); // Mobile active panel
  const isUpdatingFromRemoteRef = useRef(false);
  const lastRemoteContentRef = useRef("");
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load Monaco Editor only on client side
  useEffect(() => {
    setIsClient(true);
    const loadMonaco = async () => {
      try {
        // Simple Monaco Environment setup
        (window as any).MonacoEnvironment = {
          getWorker: function () {
            // Return a minimal worker that just responds to basic messages
            const workerCode = `
              self.addEventListener('message', function(e) {
                const { id } = e.data;
                self.postMessage({ id, result: null });
              });
            `;
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            return new Worker(URL.createObjectURL(blob));
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
      console.log("Received room state:", state);
      setFiles(state.files || {});
      setFileTree(state.fileTree || []);
      setActiveFileId(state.activeFileId);
      setChat(state.chat || []);
      
      // Set up initial file and open tabs
      if (state.activeFileId && state.files && state.files[state.activeFileId]) {
        const activeFile = state.files[state.activeFileId];
        setLanguage(activeFile.language || "javascript");
        setOpenFiles([state.activeFileId]);
        
        if (editorRef.current && activeFile.content !== lastRemoteContentRef.current) {
          isUpdatingFromRemoteRef.current = true;
          lastRemoteContentRef.current = activeFile.content || "";
          editorRef.current.setValue(activeFile.content || "");
          setTimeout(() => { isUpdatingFromRemoteRef.current = false; }, 100);
        }
      }
    });

    socket.on("file-update", ({ fileId, content }: { fileId: string; content: string }) => {
      // Update local file state first
      setFiles(prev => ({
        ...prev,
        [fileId]: { ...prev[fileId], content }
      }));
      
      // Only update editor if this is the active file and content is different
      if (editorRef.current && fileId === activeFileId && content !== lastRemoteContentRef.current) {
        const currentContent = editorRef.current.getValue();
        if (currentContent !== content) {
          isUpdatingFromRemoteRef.current = true;
          lastRemoteContentRef.current = content;
          
          // Store current cursor position
          const currentPosition = editorRef.current.getPosition();
          const currentSelection = editorRef.current.getSelection();
          
          // Update content
          editorRef.current.setValue(content);
          
          // Restore cursor position and selection if valid
          try {
            if (currentSelection) {
              editorRef.current.setSelection(currentSelection);
            } else if (currentPosition) {
              editorRef.current.setPosition(currentPosition);
            }
          } catch (error) {
            // If position restoration fails, place cursor at end
            const model = editorRef.current.getModel();
            if (model) {
              const lineCount = model.getLineCount();
              const lastLineLength = model.getLineContent(lineCount).length;
              editorRef.current.setPosition({ lineNumber: lineCount, column: lastLineLength + 1 });
            }
          }
          
          setTimeout(() => { isUpdatingFromRemoteRef.current = false; }, 50);
        }
      }
    });

    socket.on("file-select", ({ fileId }: { fileId: string }) => {
      setActiveFileId(fileId);
      const file = files[fileId];
      if (file && file.type === "file") {
        setLanguage(file.language || "javascript");
        
        // Add to open files if not already open
        setOpenFiles(prev => prev.includes(fileId) ? prev : [...prev, fileId]);
        
        // Update editor content
        if (editorRef.current) {
          isUpdatingFromRemoteRef.current = true;
          lastRemoteContentRef.current = file.content || "";
          editorRef.current.setValue(file.content || "");
          setTimeout(() => { isUpdatingFromRemoteRef.current = false; }, 100);
        }
      }
    });

    socket.on("file-create", ({ file, parentId }: { file: FileNode; parentId?: string }) => {
      setFiles(prev => ({
        ...prev,
        [file.id]: file
      }));
      
      if (parentId) {
        setFiles(prev => ({
          ...prev,
          [parentId]: {
            ...prev[parentId],
            children: [...(prev[parentId].children || []), file.id]
          }
        }));
      } else {
        setFileTree(prev => [...prev, file.id]);
      }
      
      // If it's a file, select it
      if (file.type === "file") {
        setActiveFileId(file.id);
        setLanguage(file.language || "javascript");
        setOpenFiles(prev => [...prev, file.id]);
      }
    });

    socket.on("file-delete", ({ fileId, newActiveFileId }: { fileId: string; newActiveFileId: string | null }) => {
      // Remove from files
      setFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[fileId];
        return newFiles;
      });
      
      // Remove from open files
      setOpenFiles(prev => prev.filter(id => id !== fileId));
      
      // Update active file
      setActiveFileId(newActiveFileId);
      if (newActiveFileId && files[newActiveFileId]) {
        const newActiveFile = files[newActiveFileId];
        setLanguage(newActiveFile.language || "javascript");
        if (editorRef.current) {
          editorRef.current.setValue(newActiveFile.content || "");
        }
      }
    });

    socket.on("file-rename", ({ fileId, newName, language: newLanguage }: { fileId: string; newName: string; language?: string }) => {
      setFiles(prev => ({
        ...prev,
        [fileId]: {
          ...prev[fileId],
          name: newName,
          ...(newLanguage ? { language: newLanguage } : {})
        }
      }));
      
      // Update language if this is the active file
      if (fileId === activeFileId && newLanguage) {
        setLanguage(newLanguage);
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

  // Initialize Monaco Editor once
  useEffect(() => {
    if (!monacoEl.current || !monaco || !isClient) return;
    
    const container = monacoEl.current;
    
    // If editor already exists, just ensure it's properly sized and has content
    if (editorRef.current) {
      // Small delay to ensure container is visible if we're in mobile view
      setTimeout(() => {
        try {
          if (editorRef.current) {
            // Force layout recalculation
            editorRef.current.layout();
            
            // Ensure content is correct
            const activeFile = activeFileId ? files[activeFileId] : null;
            const expectedContent = activeFile?.content || "// Welcome to VelvetCode!\n// Select or create a file to start coding...\n";
            const currentContent = editorRef.current.getValue();
            
            if (currentContent !== expectedContent && !isUpdatingFromRemoteRef.current) {
              isUpdatingFromRemoteRef.current = true;
              lastRemoteContentRef.current = expectedContent;
              editorRef.current.setValue(expectedContent);
              setTimeout(() => { 
                isUpdatingFromRemoteRef.current = false; 
              }, 50);
            }
          }
        } catch (error) {
          console.warn('Error updating existing editor:', error);
        }
      }, 100);
      
      return;
    }
    
    const activeFile = activeFileId ? files[activeFileId] : null;
    const initialContent = activeFile?.content || "// Welcome to VelvetCode!\n// Select or create a file to start coding...\n";
    
    try {
      const editor = monaco.editor.create(container, {
        value: initialContent,
        language,
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        theme: "vs-dark",
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        renderLineHighlight: 'line',
        selectOnLineNumbers: true,
        glyphMargin: true,
        folding: true,
        lineDecorationsWidth: 10,
        lineNumbersMinChars: 3,
        roundedSelection: false,
      });
      
      editorRef.current = editor;

      // Handle content changes
      const subscription = editor.onDidChangeModelContent(() => {
        if (isUpdatingFromRemoteRef.current) return;
        
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        
        updateTimeoutRef.current = setTimeout(() => {
          if (!isUpdatingFromRemoteRef.current && activeFileId && editorRef.current) {
            try {
              const content = editorRef.current.getValue();
              if (content !== lastRemoteContentRef.current) {
                socketRef.current?.emit("file-update", { roomId, fileId: activeFileId, content });
                
                setFiles(prev => ({
                  ...prev,
                  [activeFileId]: { ...prev[activeFileId], content }
                }));
              }
            } catch (error) {
              console.warn('Error in content change handler:', error);
            }
          }
        }, 100);
      });

      // Store subscription for cleanup
      const cleanupSubscription = () => {
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
          updateTimeoutRef.current = null;
        }
        if (subscription) {
          subscription.dispose();
        }
      };

      // Return cleanup function
      return cleanupSubscription;
    } catch (error) {
      console.error('Error creating Monaco editor:', error);
    }
  }, [monaco, isClient]); // Only depend on monaco and isClient, not language or roomId

  // Handle language changes separately
  useEffect(() => {
    if (!editorRef.current || !monaco) return;
    
    try {
      const model = editorRef.current.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, language);
      }
    } catch (error) {
      console.warn('Error setting language:', error);
    }
  }, [language, monaco]);

  // Ensure editor content is always in sync with active file
  useEffect(() => {
    if (!editorRef.current || !activeFileId || !files[activeFileId]) return;
    
    const activeFile = files[activeFileId];
    if (activeFile.type === "file") {
      try {
        // Always ensure the editor has the correct content
        const currentContent = editorRef.current.getValue();
        const fileContent = activeFile.content || "";
        
        if (currentContent !== fileContent && !isUpdatingFromRemoteRef.current) {
          isUpdatingFromRemoteRef.current = true;
          lastRemoteContentRef.current = fileContent;
          
          // Preserve cursor position when updating content
          const currentPosition = editorRef.current.getPosition();
          editorRef.current.setValue(fileContent);
          
          // Restore cursor position if it's valid
          if (currentPosition) {
            try {
              editorRef.current.setPosition(currentPosition);
            } catch (error) {
              // If position is invalid, just set to end
              const model = editorRef.current.getModel();
              if (model) {
                const lineCount = model.getLineCount();
                const lastLineLength = model.getLineContent(lineCount).length;
                editorRef.current.setPosition({ lineNumber: lineCount, column: lastLineLength + 1 });
              }
            }
          }
          
          setTimeout(() => { 
            isUpdatingFromRemoteRef.current = false; 
          }, 100);
        }
        
        // Update language if needed
        if (monaco && activeFile.language && activeFile.language !== language) {
          setLanguage(activeFile.language);
          const model = editorRef.current.getModel();
          if (model) {
            monaco.editor.setModelLanguage(model, activeFile.language);
          }
        }
      } catch (error) {
        console.warn('Error updating editor content:', error);
      }
    }
  }, [activeFileId, files, monaco, language, editorRef.current]); // Include editorRef.current to re-run when editor is recreated

  // Force editor refresh when switching views (mobile/desktop)
  useEffect(() => {
    if (!editorRef.current || !activeFileId || !files[activeFileId]) return;
    
    // Small delay to ensure the editor container is properly sized
    const refreshEditor = () => {
      try {
        if (editorRef.current) {
          // Force layout recalculation
          editorRef.current.layout();
          
          // Ensure content is correct
          const activeFile = files[activeFileId];
          if (activeFile && activeFile.type === "file") {
            const currentContent = editorRef.current.getValue();
            const fileContent = activeFile.content || "";
            
            if (currentContent !== fileContent) {
              isUpdatingFromRemoteRef.current = true;
              lastRemoteContentRef.current = fileContent;
              editorRef.current.setValue(fileContent);
              setTimeout(() => { 
                isUpdatingFromRemoteRef.current = false; 
              }, 50);
            }
          }
        }
      } catch (error) {
        console.warn('Error refreshing editor:', error);
      }
    };
    
    // Refresh immediately and after a delay to handle view changes
    refreshEditor();
    const timeoutId = setTimeout(refreshEditor, 100);
    
    return () => clearTimeout(timeoutId);
  }, [isMobile, activeFileId, files]); // Re-run when mobile state changes

  // Handle window resize for editor layout
  useEffect(() => {
    if (!editorRef.current) return;
    
    const handleResize = () => {
      if (editorRef.current) {
        // Small delay to allow the DOM to update
        setTimeout(() => {
          try {
            editorRef.current?.layout();
          } catch (error) {
            console.warn('Error during editor layout on resize:', error);
          }
        }, 100);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [editorRef.current]);

  // Handle mobile panel changes - refresh editor when switching to editor panel
  useEffect(() => {
    if (!editorRef.current || !isMobile || activePanel !== 'editor') return;
    
    // Small delay to ensure the panel is fully visible and container is properly sized
    const timeoutId = setTimeout(() => {
      try {
        if (editorRef.current) {
          // Force layout recalculation - this is crucial for Monaco when container visibility changes
          editorRef.current.layout();
          
          // Force focus to ensure editor is interactive
          editorRef.current.focus();
          
          // Ensure content is correct
          if (activeFileId && files[activeFileId]) {
            const activeFile = files[activeFileId];
            if (activeFile.type === "file") {
              const currentContent = editorRef.current.getValue();
              const fileContent = activeFile.content || "";
              
              if (currentContent !== fileContent) {
                console.log('Restoring content in mobile panel switch:', { currentContent: currentContent.length, fileContent: fileContent.length });
                isUpdatingFromRemoteRef.current = true;
                lastRemoteContentRef.current = fileContent;
                editorRef.current.setValue(fileContent);
                setTimeout(() => { 
                  isUpdatingFromRemoteRef.current = false; 
                }, 50);
              }
            }
          }
        }
      } catch (error) {
        console.warn('Error refreshing editor on panel change:', error);
      }
    }, 200); // Increased delay to ensure DOM is fully updated
    
    return () => clearTimeout(timeoutId);
  }, [activePanel, isMobile, activeFileId, files]);

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (editorRef.current) {
        try {
          editorRef.current.dispose();
        } catch (error) {
          console.warn('Error disposing editor on unmount:', error);
        }
      }
    };
  }, []);

  // File operations
  function selectFile(fileId: string) {
    const file = files[fileId];
    if (file && file.type === "file") {
      // Update local state immediately for responsive UI
      setActiveFileId(fileId);
      setLanguage(file.language || "javascript");
      
      // Add to open files if not already open
      setOpenFiles(prev => prev.includes(fileId) ? prev : [...prev, fileId]);
      
      // Update editor content
      if (editorRef.current) {
        isUpdatingFromRemoteRef.current = true;
        lastRemoteContentRef.current = file.content || "";
        editorRef.current.setValue(file.content || "");
        setTimeout(() => { isUpdatingFromRemoteRef.current = false; }, 100);
      }
      
      // Also emit to server for other users
      socketRef.current?.emit("file-select", { roomId, fileId });
    }
  }

  function createFile(name: string, parentId?: string) {
    socketRef.current?.emit("file-create", { roomId, name, parentId, type: "file" });
  }

  function createFolder(name: string, parentId?: string) {
    socketRef.current?.emit("file-create", { roomId, name, parentId, type: "folder" });
  }

  function deleteFile(fileId: string) {
    socketRef.current?.emit("file-delete", { roomId, fileId });
  }

  function renameFile(fileId: string, newName: string) {
    socketRef.current?.emit("file-rename", { roomId, fileId, newName });
  }

  function closeFile(fileId: string) {
    setOpenFiles(prev => {
      const newOpenFiles = prev.filter(id => id !== fileId);
      
      // If we're closing the active file, switch to another open file
      if (fileId === activeFileId && newOpenFiles.length > 0) {
        selectFile(newOpenFiles[newOpenFiles.length - 1]);
      }
      
      return newOpenFiles;
    });
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
    <div className="w-full h-screen flex flex-col bg-black text-white">
      {/* Top Bar */}
      <div className="flex items-center gap-4 p-3 border-b border-white/10 flex-shrink-0">
        <div className="text-sm opacity-70">Room: {roomId}</div>
        {activeFileId && files[activeFileId] && !isMobile && (
          <div className="text-sm text-blue-400">
            {files[activeFileId].name} ({files[activeFileId].language})
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <input
            className="bg-neutral-900 px-2 py-1 rounded text-sm"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {!isMobile && (
            <>
              <button
                className="bg-white/10 px-3 py-1 rounded hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                onClick={() => askAI("improve")}
                disabled={isAILoading}
              >
                {isAILoading ? "Loading..." : "AI: Improve"}
              </button>
              <button
                className="bg-white/10 px-3 py-1 rounded hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                onClick={() => askAI("explain")}
                disabled={isAILoading}
              >
                {isAILoading ? "Loading..." : "AI: Explain"}
              </button>
              <button
                className="bg-white/10 px-3 py-1 rounded hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                onClick={() => askAI("test")}
                disabled={isAILoading}
              >
                {isAILoading ? "Loading..." : "AI: Tests"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Panel Selector */}
      {isMobile && (
        <MobilePanelSelector
          activePanel={activePanel}
          onPanelChange={setActivePanel}
          fileCount={Object.keys(files).length}
          chatCount={chat.length}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Layout */}
        {!isMobile ? (
          <>
            {/* File Explorer */}
            <div 
              className="flex-shrink-0 border-r border-white/10 flex flex-col overflow-hidden"
              style={{ width: `${leftPanelWidth}px` }}
            >
              <FileExplorer
                files={files}
                fileTree={fileTree}
                activeFileId={activeFileId}
                onSelectFile={selectFile}
                onCreateFile={createFile}
                onCreateFolder={createFolder}
                onDeleteFile={deleteFile}
                onRenameFile={renameFile}
              />
            </div>

            {/* Left Resizer */}
            <Resizer 
              onResize={(delta) => {
                const newWidth = Math.max(200, Math.min(600, leftPanelWidth + delta));
                setLeftPanelWidth(newWidth);
              }}
            />

            {/* Editor Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <FileTabs
                openFiles={openFiles}
                activeFileId={activeFileId}
                files={files}
                onSelectFile={selectFile}
                onCloseFile={closeFile}
              />
              <div className="flex-1 relative overflow-hidden">
                {!monaco || !isClient ? (
                  <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                    <div className="text-white/70">Loading editor...</div>
                  </div>
                ) : (
                  <div 
                    ref={monacoEl} 
                    className="w-full h-full" 
                    style={{ 
                      minHeight: '300px',
                      backgroundColor: '#1e1e1e' // VS Dark theme background
                    }}
                  />
                )}
              </div>
            </div>

            {/* Right Resizer */}
            <Resizer 
              onResize={(delta) => {
                const newWidth = Math.max(250, Math.min(600, rightPanelWidth - delta));
                setRightPanelWidth(newWidth);
              }}
            />

            {/* Chat Panel */}
            <div 
              className="flex-shrink-0 border-l border-white/10 flex flex-col overflow-hidden"
              style={{ width: `${rightPanelWidth}px` }}
            >
              <div className="p-3 text-sm font-semibold border-b border-white/10 flex-shrink-0">
                Chat
              </div>
              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-auto px-3 py-2 space-y-2"
              >
                {chat.map((m) => (
                  <ChatMessageComponent key={m.id} message={m} />
                ))}
                {isAILoading && <AILoadingIndicator />}
              </div>
              <div className="flex-shrink-0">
                <ChatInput onSend={(t) => t && sendChat(t)} />
              </div>
            </div>
          </>
        ) : (
          /* Mobile Layout */
          <div className="flex-1 flex flex-col overflow-hidden">
            {activePanel === 'files' && (
              <div className="flex-1 overflow-hidden">
                <FileExplorer
                  files={files}
                  fileTree={fileTree}
                  activeFileId={activeFileId}
                  onSelectFile={(fileId) => {
                    selectFile(fileId);
                    setActivePanel('editor');
                  }}
                  onCreateFile={createFile}
                  onCreateFolder={createFolder}
                  onDeleteFile={deleteFile}
                  onRenameFile={renameFile}
                />
              </div>
            )}

            {/* Editor Panel - Keep mounted but conditionally visible */}
            <div className={`flex-1 flex flex-col overflow-hidden ${activePanel === 'editor' ? '' : 'hidden'}`}>
              <FileTabs
                openFiles={openFiles}
                activeFileId={activeFileId}
                files={files}
                onSelectFile={selectFile}
                onCloseFile={closeFile}
              />
              <div className="flex-1 relative overflow-hidden">
                {!monaco || !isClient ? (
                  <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                    <div className="text-white/70">Loading editor...</div>
                  </div>
                ) : (
                  <div 
                    ref={monacoEl} 
                    className="w-full h-full" 
                    style={{ 
                      minHeight: '300px',
                      backgroundColor: '#1e1e1e' // VS Dark theme background
                    }}
                  />
                )}
              </div>
              {/* Mobile AI Buttons */}
              <div className="flex gap-1 p-2 border-t border-white/10 bg-neutral-900">
                <button
                  className="flex-1 bg-white/10 px-2 py-1 rounded hover:bg-white/20 disabled:opacity-50 text-xs"
                  onClick={() => askAI("improve")}
                  disabled={isAILoading}
                >
                  {isAILoading ? "..." : "Improve"}
                </button>
                <button
                  className="flex-1 bg-white/10 px-2 py-1 rounded hover:bg-white/20 disabled:opacity-50 text-xs"
                  onClick={() => askAI("explain")}
                  disabled={isAILoading}
                >
                  {isAILoading ? "..." : "Explain"}
                </button>
                <button
                  className="flex-1 bg-white/10 px-2 py-1 rounded hover:bg-white/20 disabled:opacity-50 text-xs"
                  onClick={() => askAI("test")}
                  disabled={isAILoading}
                >
                  {isAILoading ? "..." : "Tests"}
                </button>
              </div>
            </div>

            {activePanel === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-3 text-sm font-semibold border-b border-white/10 flex-shrink-0">
                  Chat
                </div>
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-auto px-3 py-2 space-y-2"
                >
                  {chat.map((m) => (
                    <ChatMessageComponent key={m.id} message={m} />
                  ))}
                  {isAILoading && <AILoadingIndicator />}
                </div>
                <div className="flex-shrink-0">
                  <ChatInput onSend={(t) => t && sendChat(t)} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-xs p-2 opacity-60 border-t border-white/10 flex-shrink-0">
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
