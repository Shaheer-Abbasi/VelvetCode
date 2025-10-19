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