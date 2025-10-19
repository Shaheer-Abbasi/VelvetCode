"use client";

import { PanelType } from './types';

// Mobile Panel Selector
export function MobilePanelSelector({ 
  activePanel, 
  onPanelChange,
  fileCount,
  chatCount
}: {
  activePanel: PanelType;
  onPanelChange: (panel: PanelType) => void;
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