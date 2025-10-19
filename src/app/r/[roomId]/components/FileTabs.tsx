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