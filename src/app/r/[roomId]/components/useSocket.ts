"use client";

import { useEffect, useRef } from "react";
import io from "socket.io-client";
import type { FileNode, ChatMessage, RoomState, ExecutionHistoryItem } from './types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4000";

interface UseSocketProps {
  roomId: string;
  onRoomState: (state: RoomState) => void;
  onFileUpdate: (fileId: string, content: string) => void;
  onFileAdd: (file: FileNode, parentId?: string) => void;
  onFileDelete: (fileId: string, newActiveFileId: string | null) => void;
  onFileRename: (fileId: string, newName: string, language?: string) => void;
  onChatMessage: (message: ChatMessage) => void;
  onCodeExecute?: (execution: ExecutionHistoryItem) => void;
}

export function useSocket({
  roomId,
  onRoomState,
  onFileUpdate,
  onFileAdd,
  onFileDelete,
  onFileRename,
  onChatMessage,
  onCodeExecute
}: UseSocketProps) {
  const socketRef = useRef<any>(null);

  useEffect(() => {
    // Don't connect if roomId is empty or undefined
    if (!roomId || roomId.trim() === '') {
      console.log('Skipping socket connection - no roomId');
      return;
    }
    
    console.log(`Creating socket connection for room: ${roomId}`);
    const socket = io(WS_URL);
    socketRef.current = socket;

    // Add connection event handlers
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      // Emit join-room AFTER connection is established
      console.log(`Emitting join-room for: ${roomId}`);
      socket.emit("join-room", roomId);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on("room-state", (state: RoomState) => {
      console.log(`Received room state for room: ${roomId}`, state);
      onRoomState(state);
    });

    socket.on("file-update", ({ fileId, content }: { fileId: string; content: string }) => {
      onFileUpdate(fileId, content);
    });

    socket.on("file-add", ({ file, parentId }: { file: FileNode; parentId?: string }) => {
      onFileAdd(file, parentId);
    });

    socket.on("file-delete", ({ fileId, newActiveFileId }: { fileId: string; newActiveFileId: string | null }) => {
      onFileDelete(fileId, newActiveFileId);
    });

    socket.on("file-rename", ({ fileId, newName, language: newLanguage }: { fileId: string; newName: string; language?: string }) => {
      onFileRename(fileId, newName, newLanguage);
    });

    socket.on("chat-message", (msg: ChatMessage) => {
      console.log('Received chat message:', msg);
      onChatMessage(msg);
    });

    socket.on("code-execute", (execution: ExecutionHistoryItem) => {
      console.log('Received code execution result:', execution);
      if (onCodeExecute) {
        onCodeExecute(execution);
      }
    });

    return () => {
      console.log(`Cleaning up socket connection for room: ${roomId}`);
      socket.disconnect();
    };
  }, [roomId]); // Only reconnect when roomId changes

  return socketRef.current;
}