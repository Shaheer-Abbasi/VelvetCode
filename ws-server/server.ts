import http from "http";
import { Server } from "socket.io";

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
  files: Map<string, FileNode>;
  fileTree: string[]; // Root level file/folder IDs
  activeFileId: string | null;
  chat: { id: string; name: string; text: string; ts: number }[];
};

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: "*" },
});

const rooms = new Map<string, RoomState>();

// Utility functions for file operations
function createDefaultProject(): RoomState {
  const welcomeFileId = "file-1";
  const files = new Map<string, FileNode>();
  
  files.set(welcomeFileId, {
    id: welcomeFileId,
    name: "welcome.js",
    type: "file",
    content: "// Welcome to VelvetCode!\n// Start collaborating by creating files and folders\n\nconsole.log('Hello, World!');\n",
    language: "javascript"
  });

  const project = {
    files,
    fileTree: [welcomeFileId],
    activeFileId: welcomeFileId,
    chat: []
  };

  console.log("Created default project:", {
    filesCount: files.size,
    fileTree: project.fileTree,
    activeFileId: project.activeFileId
  });

  return project;
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function getLanguageFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'cpp': 'cpp',
    'c': 'cpp',
    'java': 'java',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'md': 'markdown',
    'txt': 'plaintext'
  };
  return languageMap[ext || ''] || 'plaintext';
}

io.on("connection", (socket) => {
  socket.on("join-room", ({ roomId }) => {
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, createDefaultProject());
    }

    const state = rooms.get(roomId)!;
    // Convert Map to object for JSON serialization
    const serializedState = {
      files: Object.fromEntries(state.files),
      fileTree: state.fileTree,
      activeFileId: state.activeFileId,
      chat: state.chat
    };

    console.log("Sending room state to client:", {
      filesCount: Object.keys(serializedState.files).length,
      fileTree: serializedState.fileTree,
      activeFileId: serializedState.activeFileId
    });

    // Send current state to the new client
    socket.emit("room-state", serializedState);

    // Broadcast presence (optional)
    socket.to(roomId).emit("user-joined", { id: socket.id });
  });

  // File content updates
  socket.on("file-update", ({ roomId, fileId, content }) => {
    const state = rooms.get(roomId);
    if (!state) return;
    
    const file = state.files.get(fileId);
    if (file && file.type === "file") {
      file.content = content;
      socket.to(roomId).emit("file-update", { fileId, content });
    }
  });

  // File selection
  socket.on("file-select", ({ roomId, fileId }) => {
    const state = rooms.get(roomId);
    if (!state) return;
    
    state.activeFileId = fileId;
    io.to(roomId).emit("file-select", { fileId });
  });

  // Create new file
  socket.on("file-create", ({ roomId, name, parentId, type }) => {
    const state = rooms.get(roomId);
    if (!state) return;

    const newId = generateId();
    const newFile: FileNode = {
      id: newId,
      name,
      type,
      parentId,
      ...(type === "file" ? { 
        content: "", 
        language: getLanguageFromFileName(name) 
      } : { 
        children: [] 
      })
    };

    state.files.set(newId, newFile);

    if (parentId) {
      const parent = state.files.get(parentId);
      if (parent && parent.type === "folder") {
        parent.children = parent.children || [];
        parent.children.push(newId);
      }
    } else {
      state.fileTree.push(newId);
    }

    // If it's a file, make it active
    if (type === "file") {
      state.activeFileId = newId;
    }

    io.to(roomId).emit("file-create", { file: newFile, parentId });
  });

  // Delete file/folder
  socket.on("file-delete", ({ roomId, fileId }) => {
    const state = rooms.get(roomId);
    if (!state) return;

    const file = state.files.get(fileId);
    if (!file) return;

    // Recursive delete for folders
    const deleteRecursive = (id: string) => {
      const fileToDelete = state.files.get(id);
      if (!fileToDelete) return;

      if (fileToDelete.type === "folder" && fileToDelete.children) {
        fileToDelete.children.forEach(childId => deleteRecursive(childId));
      }
      
      state.files.delete(id);
    };

    deleteRecursive(fileId);

    // Remove from parent or root
    if (file.parentId) {
      const parent = state.files.get(file.parentId);
      if (parent && parent.children) {
        parent.children = parent.children.filter(id => id !== fileId);
      }
    } else {
      state.fileTree = state.fileTree.filter(id => id !== fileId);
    }

    // Update active file if deleted
    if (state.activeFileId === fileId) {
      const firstFile = Array.from(state.files.values()).find(f => f.type === "file");
      state.activeFileId = firstFile?.id || null;
    }

    io.to(roomId).emit("file-delete", { fileId, newActiveFileId: state.activeFileId });
  });

  // Rename file/folder
  socket.on("file-rename", ({ roomId, fileId, newName }) => {
    const state = rooms.get(roomId);
    if (!state) return;

    const file = state.files.get(fileId);
    if (!file) return;

    file.name = newName;
    if (file.type === "file") {
      file.language = getLanguageFromFileName(newName);
    }

    io.to(roomId).emit("file-rename", { fileId, newName, language: file.language });
  });

  socket.on("chat-message", ({ roomId, msg }) => {
    const state = rooms.get(roomId);
    if (!state) return;
    state.chat.push(msg);
    io.to(roomId).emit("chat-message", msg);
  });

  socket.on("disconnect", () => {
    // optional: broadcast presence
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
server.listen(PORT, () => {
  console.log(`WS server listening on :${PORT}`);
});
