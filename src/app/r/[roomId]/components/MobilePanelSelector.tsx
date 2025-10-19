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
    <div className="flex border-b border-red-500/20 bg-gray-900/50 backdrop-blur-sm">
      <button
        className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${
          activePanel === 'files' 
            ? 'bg-gradient-to-b from-red-500/20 to-red-500/10 text-white border-b-2 border-red-500' 
            : 'text-white/70 hover:text-white hover:bg-red-500/5'
        }`}
        onClick={() => onPanelChange('files')}
      >
        📁 Files ({fileCount})
      </button>
      <button
        className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${
          activePanel === 'editor' 
            ? 'bg-gradient-to-b from-red-500/20 to-red-500/10 text-white border-b-2 border-red-500' 
            : 'text-white/70 hover:text-white hover:bg-red-500/5'
        }`}
        onClick={() => onPanelChange('editor')}
      >
        💻 Editor
      </button>
      <button
        className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${
          activePanel === 'chat' 
            ? 'bg-gradient-to-b from-red-500/20 to-red-500/10 text-white border-b-2 border-red-500' 
            : 'text-white/70 hover:text-white hover:bg-red-500/5'
        }`}
        onClick={() => onPanelChange('chat')}
      >
        💬 Chat ({chatCount})
      </button>
    </div>
  );
}