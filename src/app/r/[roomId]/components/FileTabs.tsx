"use client";

import { FileNode } from './types';

// File Tabs Component
export function FileTabs({ 
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
    <div className="flex border-b border-red-500/20 bg-gray-900/50 backdrop-blur-sm overflow-x-auto">
      {openFiles.map(fileId => {
        const file = files[fileId];
        if (!file) return null;
        
        const isActive = activeFileId === fileId;
        
        return (
          <div
            key={fileId}
            className={`flex items-center gap-2 px-4 py-2.5 border-r border-red-500/10 cursor-pointer transition-all ${
              isActive 
                ? 'bg-gradient-to-b from-red-500/20 to-red-500/10 text-white border-b-2 border-b-red-500' 
                : 'text-white/70 hover:bg-red-500/5 hover:text-white/90'
            }`}
            onClick={() => onSelectFile(fileId)}
          >
            <span className="text-xs">📄</span>
            <span className="text-sm font-medium">{file.name}</span>
            <button
              className="text-base hover:text-red-400 ml-1 hover:bg-red-500/20 rounded px-1 transition-all"
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