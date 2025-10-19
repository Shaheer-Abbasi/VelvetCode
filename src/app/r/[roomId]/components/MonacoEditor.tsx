"use client";

import { useEffect, useRef } from "react";

interface MonacoEditorProps {
  monaco: any;
  isClient: boolean;
  language: string;
  initialContent: string;
  onEditorReady: (editor: any) => void;
  onContentChange: (content: string) => void;
}

export function MonacoEditor({
  monaco,
  isClient,
  language,
  initialContent,
  onEditorReady,
  onContentChange
}: MonacoEditorProps) {
  const monacoEl = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<any>(null);
  const isUpdatingFromRemoteRef = useRef(false);

  // Initialize Monaco Editor
  useEffect(() => {
    if (!monacoEl.current || !monaco || !isClient) return;
    
    const container = monacoEl.current;
    
    // If editor already exists, just ensure it's properly sized and has content
    if (editorRef.current) {
      try {
        editorRef.current.layout();
        const currentContent = editorRef.current.getValue();
        
        if (currentContent !== initialContent && !isUpdatingFromRemoteRef.current) {
          isUpdatingFromRemoteRef.current = true;
          editorRef.current.setValue(initialContent);
          setTimeout(() => { 
            isUpdatingFromRemoteRef.current = false; 
          }, 50);
        }
      } catch (error) {
        console.warn('Error updating editor:', error);
      }
      return;
    }
    
    try {
      const editor = monaco.editor.create(container, {
        value: initialContent,
        language,
        automaticLayout: true,
        theme: "vs-dark",
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        readOnly: false, // Explicitly ensure it's editable
        domReadOnly: false,
        quickSuggestions: false,
        suggestOnTriggerCharacters: false,
        acceptSuggestionOnEnter: 'off',
        wordBasedSuggestions: 'off',
      });
      
      editorRef.current = editor;
      onEditorReady(editor);

      // Handle content changes
      const subscription = editor.onDidChangeModelContent(() => {
        if (isUpdatingFromRemoteRef.current) return;
        
        try {
          const content = editor.getValue();
          console.log('Monaco editor content changed:', content.length, 'characters');
          onContentChange(content);
        } catch (error) {
          console.warn('Error in content change handler:', error);
        }
      });

      // Add debugging for editor events
      const keydownSubscription = editor.onKeyDown((e: any) => {
        console.log('Monaco editor key pressed:', e.browserEvent.key, 'code:', e.browserEvent.code);
      });

      const focusSubscription = editor.onDidFocusEditorText(() => {
        console.log('Monaco editor focused');
      });

      const blurSubscription = editor.onDidBlurEditorText(() => {
        console.log('Monaco editor blurred');
      });

      // Return cleanup function
      return () => {
        if (subscription) {
          subscription.dispose();
        }
        if (keydownSubscription) {
          keydownSubscription.dispose();
        }
        if (focusSubscription) {
          focusSubscription.dispose();
        }
        if (blurSubscription) {
          blurSubscription.dispose();
        }
      };
    } catch (error) {
      console.error('Error creating Monaco editor:', error);
    }
  }, [monaco, isClient, initialContent]);

  // Handle language changes
  useEffect(() => {
    if (!editorRef.current || !monaco) return;
    
    try {
      const model = editorRef.current.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, language);
      }
    } catch (error) {
      console.warn('Error setting language:', error);
    }
  }, [language, monaco]);

  // Update content when props change
  useEffect(() => {
    if (!editorRef.current || isUpdatingFromRemoteRef.current) return;
    
    try {
      const currentContent = editorRef.current.getValue();
      if (currentContent !== initialContent) {
        isUpdatingFromRemoteRef.current = true;
        
        // Preserve cursor position when updating content
        const currentPosition = editorRef.current.getPosition();
        editorRef.current.setValue(initialContent);
        
        // Restore cursor position if it's valid
        if (currentPosition) {
          try {
            editorRef.current.setPosition(currentPosition);
          } catch (error) {
            // If position is invalid, just set to end
            const model = editorRef.current.getModel();
            if (model) {
              const lineCount = model.getLineCount();
              const lastLineLength = model.getLineContent(lineCount).length;
              editorRef.current.setPosition({ lineNumber: lineCount, column: lastLineLength + 1 });
            }
          }
        }
        
        setTimeout(() => { 
          isUpdatingFromRemoteRef.current = false; 
        }, 100);
      }
    } catch (error) {
      console.warn('Error updating editor content:', error);
    }
  }, [initialContent]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        try {
          editorRef.current.dispose();
        } catch (error) {
          console.warn('Error disposing editor on unmount:', error);
        }
      }
    };
  }, []);

  return (
    <div className="flex-1 relative overflow-hidden">
      {!monaco || !isClient ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900">
          <div className="text-white/70 mb-2">Loading editor...</div>
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div 
          ref={monacoEl} 
          className="w-full h-full" 
          style={{ 
            minHeight: '300px',
            backgroundColor: '#1e1e1e'
          }}
        />
      )}
    </div>
  );
}