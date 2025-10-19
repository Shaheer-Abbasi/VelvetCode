"use client";

import { useRef, useState } from "react";

// Resizer Component for panel resizing
export function Resizer({ 
  onResize, 
  direction = 'horizontal' 
}: { 
  onResize: (delta: number) => void;
  direction?: 'horizontal' | 'vertical';
}) {
  const [isResizing, setIsResizing] = useState(false);
  const startPosRef = useRef(0);
  const isResizingRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    isResizingRef.current = true;
    startPosRef.current = direction === 'horizontal' ? e.clientX : e.clientY;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - startPosRef.current;
      
      // Only update if there's a meaningful change
      if (Math.abs(delta) > 1) {
        onResize(delta);
        startPosRef.current = currentPos;
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      isResizingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className={`bg-neutral-700 hover:bg-neutral-600 transition-colors flex-shrink-0 ${
        direction === 'horizontal' 
          ? 'w-2 cursor-col-resize' 
          : 'h-2 cursor-row-resize'
      } ${isResizing ? 'bg-blue-500' : ''}`}
      onMouseDown={handleMouseDown}
      style={{
        userSelect: 'none',
        touchAction: 'none'
      }}
    />
  );
}