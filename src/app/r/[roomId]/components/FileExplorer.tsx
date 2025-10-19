"use client";

import { useState } from "react";
import { FileNode } from './types';

// File Explorer Component
export function FileExplorer({ 
  files = {}, 
  fileTree = [], 
  activeFileId, 
  onSelectFile, 
  onCreateFile, 
  onCreateFolder, 
  onDeleteFile, 
  onRenameFile,
  onUploadFile 
}: {
  files: Record<string, FileNode>;
  fileTree: string[];
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onCreateFile: (name: string, parentId?: string) => void;
  onCreateFolder: (name: string, parentId?: string) => void;
  onDeleteFile: (fileId: string) => void;
  onRenameFile: (fileId: string, newName: string) => void;
  onUploadFile: (name: string, content: string, parentId?: string) => void;
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      onUploadFile(file.name, content);
    };
    reader.readAsText(file);
    
    // Reset input so the same file can be uploaded again
    e.target.value = '';
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
            className={`flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-red-500/10 cursor-pointer transition-colors rounded-md mx-1 ${
              isActive ? 'bg-gradient-to-r from-red-500/20 to-red-500/10 text-red-300 border-l-2 border-red-500' : ''
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
                className="bg-transparent border-b border-red-400 outline-none flex-1 text-white focus:border-red-500"
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
      <div className="p-3 text-sm font-semibold border-b border-red-500/20 bg-gradient-to-r from-red-950/30 to-transparent">
        <div className="flex items-center justify-between">
          <span className="text-red-400">Files</span>
          <div className="flex gap-1">
            <button
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/20 hover:border hover:border-red-500/40 transition-all"
              onClick={() => onCreateFile("new-file.js")}
              title="New File"
            >
              📄
            </button>
            <button
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/20 hover:border hover:border-red-500/40 transition-all"
              onClick={() => onCreateFolder("new-folder")}
              title="New Folder"
            >
              📁
            </button>
            <label
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/20 hover:border hover:border-red-500/40 cursor-pointer transition-all"
              title="Upload File"
            >
              ⬆️
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept="*/*"
              />
            </label>
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
            className="fixed z-50 bg-gray-900 border border-red-500/30 rounded-lg shadow-xl shadow-red-500/10 py-1 min-w-36 backdrop-blur-sm"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.fileId ? (
              <>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-500/20 transition-colors"
                  onClick={() => {
                    const file = files[contextMenu.fileId!];
                    handleRename(contextMenu.fileId!, file.name);
                  }}
                >
                  Rename
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-500/20 text-red-400 transition-colors"
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
                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-500/20 transition-colors"
                  onClick={() => {
                    onCreateFile("new-file.js");
                    setContextMenu(null);
                  }}
                >
                  New File
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-500/20 transition-colors"
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