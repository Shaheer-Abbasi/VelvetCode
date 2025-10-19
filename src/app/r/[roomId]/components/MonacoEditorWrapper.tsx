"use client";

import { Suspense, lazy } from "react";

// Lazy load the actual Monaco Editor
const LazyMonacoEditor = lazy(() => import('./MonacoEditor').then(module => ({ 
  default: module.MonacoEditor 
})));

interface MonacoEditorWrapperProps {
  monaco: any;
  isClient: boolean;
  language: string;
  initialContent: string;
  onEditorReady: (editor: any) => void;
  onContentChange: (content: string) => void;
}

export function MonacoEditorWrapper(props: MonacoEditorWrapperProps) {
  if (!props.monaco || !props.isClient) {
    return (
      <div className="flex-1 relative overflow-hidden">
        <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900">
          <div className="text-white/70 mb-2">Loading editor...</div>
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="flex-1 relative overflow-hidden">
        <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900">
          <div className="text-white/70 mb-2">Initializing editor...</div>
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    }>
      <LazyMonacoEditor {...props} />
    </Suspense>
  );
}