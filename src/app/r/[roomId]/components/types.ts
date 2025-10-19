// Types for the room components

export type ChatMessage = { 
  id: string; 
  name: string; 
  text: string; 
  ts: number 
};

export type FileNode = {
  id: string;
  name: string;
  type: "file" | "folder";
  content?: string; // Only for files
  language?: string; // Only for files
  parentId?: string;
  children?: string[]; // Only for folders - array of child IDs
};

export type RoomState = {
  files: Record<string, FileNode>; // Will be converted from Map on server
  fileTree: string[]; // Root level file/folder IDs
  activeFileId: string | null;
  chat: ChatMessage[];
};

export type PanelType = 'files' | 'editor' | 'chat';