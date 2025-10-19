// app/r/[roomId]/room.tsx
"use client";

import { useEffect, useRef, useState, Suspense, lazy } from "react";
import { v4 as uuidv4 } from "uuid";

// Import types
import type { ChatMessage, FileNode, RoomState, PanelType } from './components/types';

// Import components directly to avoid bundling issues
import { Resizer } from './components/Resizer';
import { MobilePanelSelector } from './components/MobilePanelSelector';
import { FileExplorer } from './components/FileExplorer';
import { FileTabs } from './components/FileTabs';
import { ChatMessageComponent, AILoadingIndicator, ChatInput } from './components/Chat';
import { MonacoEditorWrapper } from './components/MonacoEditorWrapper';
import { AIActions } from './components/AIActions';
import { useSocket } from './components/useSocket';

export default function Room({ params }: { params: { roomId: string } }) {
  const [roomId, setRoomId] = useState<string>(params.roomId);
  
  // Room ID is now directly available from params
  useEffect(() => {
    console.log('Room ID:', params.roomId);
    setRoomId(params.roomId);
  }, [params.roomId]);
  
  console.log('Room component initialized with roomId:', roomId);
  
  const editorRef = useRef<any>(null);
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
  const [activePanel, setActivePanel] = useState<PanelType>('editor'); // Mobile active panel
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

  // Load Monaco Editor lazily - only when really needed
  useEffect(() => {
    setIsClient(true);
    
    // Don't load Monaco until user actually needs the editor
    if (monaco || (isMobile && activePanel !== 'editor')) return;
    
    const loadMonaco = async () => {
      try {
        // Setup Monaco Environment before importing
        (window as any).MonacoEnvironment = {
          getWorker: function () {
            // Return a minimal worker that handles basic operations
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

        // Import Monaco with environment setup
        const monacoEditor = await import("monaco-editor");
        setMonaco(monacoEditor);
      } catch (error) {
        console.error('Failed to load Monaco Editor:', error);
      }
    };
    
    // Load after a delay to prioritize initial page render
    const timeoutId = setTimeout(loadMonaco, 1000); // Increased delay
    return () => clearTimeout(timeoutId);
  }, [isMobile, activePanel, monaco]);

  // Socket handlers
  const handleRoomState = (state: RoomState) => {
    console.log('Handling room state:', state);
    console.log('Files received:', Object.keys(state.files || {}).length);
    console.log('File tree:', state.fileTree);
    console.log('Active file ID:', state.activeFileId);
    
    setFiles(state.files || {});
    setFileTree(state.fileTree || []);
    setActiveFileId(state.activeFileId);
    setChat(state.chat || []);
    
    // Set language based on active file
    if (state.activeFileId && state.files[state.activeFileId]) {
      const activeFile = state.files[state.activeFileId];
      if (activeFile.type === "file" && activeFile.language) {
        setLanguage(activeFile.language);
      }
    }
    
    // Add active file to open files if not already there (use callback to avoid dependency)
    if (state.activeFileId) {
      setOpenFiles(prev => {
        if (!prev.includes(state.activeFileId!)) {
          return [...prev, state.activeFileId!];
        }
        return prev;
      });
    }
  };

  const handleFileUpdate = (fileId: string, content: string) => {
    if (isUpdatingFromRemoteRef.current) return;
    
    setFiles(prev => ({
      ...prev,
      [fileId]: { ...prev[fileId], content }
    }));
    
    // Update editor if this is the active file
    if (fileId === activeFileId && editorRef.current) {
      const currentContent = editorRef.current.getValue();
      if (currentContent !== content) {
        isUpdatingFromRemoteRef.current = true;
        lastRemoteContentRef.current = content;
        editorRef.current.setValue(content);
        setTimeout(() => { 
          isUpdatingFromRemoteRef.current = false; 
        }, 100);
      }
    }
  };

  const handleFileAdd = (file: FileNode, parentId?: string) => {
    setFiles(prev => ({ ...prev, [file.id]: file }));
    
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
  };

  const handleFileDelete = (fileId: string, newActiveFileId: string | null) => {
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
    }
  };

  const handleFileRename = (fileId: string, newName: string, newLanguage?: string) => {
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
  };

  const handleChatMessage = (msg: ChatMessage) => {
    console.log('Handling chat message:', msg);
    
    // Ensure message has required properties
    if (!msg || !msg.id || !msg.name || !msg.text) {
      console.warn('Invalid chat message received:', msg);
      return;
    }
    
    setChat((c) => {
      console.log('Current chat:', c, 'Adding message:', msg);
      return [...c, msg];
    });
    
    // Scroll to bottom when new message arrives
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  // Initialize socket - always call the hook (Rules of Hooks)
  const socket = useSocket({
    roomId: roomId || '', // Pass empty string if roomId not ready
    onRoomState: handleRoomState,
    onFileUpdate: handleFileUpdate,
    onFileAdd: handleFileAdd,
    onFileDelete: handleFileDelete,
    onFileRename: handleFileRename,
    onChatMessage: handleChatMessage
  });

  // File operations
  const selectFile = (fileId: string) => {
    const file = files[fileId];
    if (!file || file.type !== "file") return;
    
    // Update state immediately for responsive UI
    setActiveFileId(fileId);
    setLanguage(file.language || "javascript");
    
    // Add to open files if not already there
    if (!openFiles.includes(fileId)) {
      setOpenFiles(prev => [...prev, fileId]);
    }
    
    // Emit to server
    socket?.emit("set-active-file", { roomId, fileId });
  };

  const closeFile = (fileId: string) => {
    setOpenFiles(prev => prev.filter(id => id !== fileId));
    
    // If closing the active file, switch to another open file or null
    if (fileId === activeFileId) {
      const remainingFiles = openFiles.filter(id => id !== fileId);
      const newActiveFileId = remainingFiles.length > 0 ? remainingFiles[remainingFiles.length - 1] : null;
      setActiveFileId(newActiveFileId);
      
      if (newActiveFileId && files[newActiveFileId]) {
        setLanguage(files[newActiveFileId].language || "javascript");
      }
      
      socket?.emit("set-active-file", { roomId, fileId: newActiveFileId });
    }
  };

  const createFile = (name: string, parentId?: string) => {
    console.log('Creating file:', { name, parentId, roomId });
    socket?.emit("file-create", { roomId, name, type: "file", parentId });
  };

  const createFolder = (name: string, parentId?: string) => {
    console.log('Creating folder:', { name, parentId, roomId });
    socket?.emit("file-create", { roomId, name, type: "folder", parentId });
  };

  const uploadFile = (name: string, content: string, parentId?: string) => {
    console.log('Uploading file:', { name, parentId, roomId });
    socket?.emit("file-upload", { roomId, name, content, parentId });
  };

  const deleteFile = (fileId: string) => {
    socket?.emit("file-delete", { roomId, fileId });
  };

  const renameFile = (fileId: string, newName: string) => {
    const language = newName.split('.').pop() === 'ts' ? 'typescript' : 
                    newName.split('.').pop() === 'py' ? 'python' :
                    newName.split('.').pop() === 'html' ? 'html' :
                    newName.split('.').pop() === 'css' ? 'css' : 'javascript';
    
    socket?.emit("file-rename", { roomId, fileId, newName, language });
  };

  const sendChat = (text: string) => {
    if (!text.trim()) return;
    const msg = {
      id: uuidv4(),
      name,
      text,
      ts: Date.now()
    };
    console.log('Sending chat message:', { roomId, msg });
    socket?.emit("chat-message", { roomId, msg });
  };

  const askAI = async (action?: string) => {
    if (!activeFileId || !files[activeFileId] || !editorRef.current) return;
    
    const activeFile = files[activeFileId];
    const code = editorRef.current.getValue();
    
    setIsAILoading(true);
    
    try {
      const response = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          kind: action, // 'improve', 'explain', or 'test'
          language: activeFile.language || 'javascript',
          code: code
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AI request failed');
      }
      
      const { message } = await response.json(); // API returns 'message', not 'suggestion'
      
      // Send AI response as chat message
      const aiMessage: ChatMessage = {
        id: uuidv4(),
        name: 'AI Agent',
        text: message,
        ts: Date.now()
      };
      
      socket?.emit("chat-message", { roomId, msg: aiMessage });
    } catch (error) {
      console.error('AI request failed:', error);
    } finally {
      setIsAILoading(false);
    }
  };

  const handleEditorReady = (editor: any) => {
    console.log('Editor ready:', editor);
    console.log('Editor options:', {
      readOnly: editor.getOption('readOnly'),
      domReadOnly: editor.getOption('domReadOnly'),
      language: editor.getModel()?.getLanguageId(),
      value: editor.getValue()?.substring(0, 100) + '...'
    });
    editorRef.current = editor;
    
    // Ensure editor is focused and editable
    setTimeout(() => {
      if (editor) {
        editor.focus();
        console.log('Editor focused, readOnly:', editor.getOption('readOnly'));
        console.log('Can editor receive typing?', !editor.getOption('readOnly') && !editor.getOption('domReadOnly'));
      }
    }, 100);
  };

  const handleEditorContentChange = (content: string) => {
    console.log('Editor content changed:', { content: content.length, activeFileId, isUpdating: isUpdatingFromRemoteRef.current });
    
    if (isUpdatingFromRemoteRef.current || !activeFileId) {
      console.log('Skipping content change - updating from remote or no active file');
      return;
    }
    
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      if (!isUpdatingFromRemoteRef.current && activeFileId && content !== lastRemoteContentRef.current) {
        console.log('Emitting file-update to socket');
        socket?.emit("file-update", { roomId, fileId: activeFileId, content });
        
        setFiles(prev => ({
          ...prev,
          [activeFileId]: { ...prev[activeFileId], content }
        }));
      }
    }, 100);
  };

  // Get current file content for editor
  const activeFile = activeFileId ? files[activeFileId] : null;
  const editorContent = activeFile?.content || "// Welcome to VelvetCode!\n// Select or create a file to start coding...\n";
  
  console.log('Editor rendering with:', {
    activeFileId,
    hasActiveFile: !!activeFile,
    activeFileName: activeFile?.name,
    contentLength: editorContent.length,
    content: editorContent.substring(0, 50) + '...'
  });

  // Show loading until roomId is resolved
  if (!roomId) {
    return (
      <div className="h-screen bg-neutral-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white/70">Loading room...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-neutral-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-neutral-800 px-4 py-2 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">VelvetCode</h1>
          <div className="text-sm text-white/70">Room: {roomId}</div>
        </div>
      </div>

      {/* Mobile Panel Selector */}
      {isMobile && (
        <MobilePanelSelector
          activePanel={activePanel}
          onPanelChange={setActivePanel}
          fileCount={fileTree.length}
          chatCount={chat.length}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {!isMobile ? (
          /* Desktop Layout */
          <>
            {/* Left Panel - File Explorer */}
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
                onUploadFile={uploadFile}
              />
            </div>

            {/* Left Resizer */}
            <Resizer
              onResize={(delta) => {
                setLeftPanelWidth(prev => Math.max(200, Math.min(600, prev + delta)));
              }}
              direction="horizontal"
            />

            {/* Center Panel - Editor */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <FileTabs
                openFiles={openFiles}
                activeFileId={activeFileId}
                files={files}
                onSelectFile={selectFile}
                onCloseFile={closeFile}
              />
              <MonacoEditorWrapper
                monaco={monaco}
                isClient={isClient}
                language={language}
                initialContent={editorContent}
                onEditorReady={handleEditorReady}
                onContentChange={handleEditorContentChange}
              />
              <AIActions onAction={askAI} isLoading={isAILoading} />
            </div>

            {/* Right Resizer */}
            <Resizer
              onResize={(delta) => {
                setRightPanelWidth(prev => Math.max(250, Math.min(600, prev - delta)));
              }}
              direction="horizontal"
            />

            {/* Right Panel - Chat */}
            <div 
              className="flex-shrink-0 border-l border-white/10 flex flex-col overflow-hidden"
              style={{ width: `${rightPanelWidth}px` }}
            >
              <div className="p-3 text-sm font-semibold border-b border-white/10 flex-shrink-0 flex items-center justify-between">
                <span>Chat</span>
                <input
                  className="bg-neutral-800 px-2 py-1 rounded text-xs w-20"
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-auto px-3 py-2 space-y-2"
              >
                {chat.filter(m => m && m.id).map((m) => (
                  <ChatMessageComponent key={m.id} message={m} />
                ))}
                {isAILoading && <AILoadingIndicator />}
              </div>
              <div className="flex-shrink-0">
                <ChatInput onSend={sendChat} />
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
                  onUploadFile={uploadFile}
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
              <MonacoEditorWrapper
                monaco={monaco}
                isClient={isClient}
                language={language}
                initialContent={editorContent}
                onEditorReady={handleEditorReady}
                onContentChange={handleEditorContentChange}
              />
              <AIActions onAction={askAI} isLoading={isAILoading} isMobile />
            </div>

            {/* Chat Panel */}
            {activePanel === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-3 text-sm font-semibold border-b border-white/10 flex-shrink-0 flex items-center justify-between">
                  <span>Chat</span>
                  <input
                    className="bg-neutral-800 px-2 py-1 rounded text-xs w-20"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-auto px-3 py-2 space-y-2"
                >
                  {chat.filter(m => m && m.id).map((m) => (
                    <ChatMessageComponent key={m.id} message={m} />
                  ))}
                  {isAILoading && <AILoadingIndicator />}
                </div>
                <div className="flex-shrink-0">
                  <ChatInput onSend={sendChat} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}