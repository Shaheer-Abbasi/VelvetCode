"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  const [showJoinModal, setShowJoinModal] = useState(false);

  const createRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 15);
    router.push(`/r/${newRoomId}`);
  };

  const joinRoom = () => {
    if (roomId.trim()) {
      router.push(`/r/${roomId.trim()}`);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-black via-red-950/30 to-black text-white overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-red-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 py-6 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/30">
            <span className="text-2xl font-bold">V</span>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
            VelvetCode
          </h1>
        </div>
        <button
          onClick={() => setShowJoinModal(true)}
          className="px-6 py-2 bg-red-500/20 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-all"
        >
          Join Room
        </button>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 h-[calc(100vh-88px)] max-w-7xl mx-auto px-6 flex items-center">
        <div className="grid md:grid-cols-2 gap-12 items-center w-full">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-red-400 font-medium tracking-wider uppercase text-sm">
                INTRODUCING NEW TECHNOLOGY
              </p>
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                Code <span className="bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">Together</span>
                <br />
                <span className="text-red-300">Learn</span> Smarter
              </h2>
              <p className="text-xl text-white/70 max-w-lg">
                Real-time AI-powered collaborative code editor
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={createRoom}
                className="group px-8 py-4 bg-gradient-to-r from-red-500 to-red-700 rounded-full font-semibold text-lg hover:from-red-600 hover:to-red-800 transition-all shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105 transform"
              >
                <span className="flex items-center gap-2 justify-center">
                  Create Room
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-8 py-4 bg-transparent border-2 border-white/20 rounded-full font-semibold text-lg hover:bg-white/10 hover:border-white/30 transition-all"
              >
                Join Room
              </button>
            </div>
          </div>

          {/* Right Side - Mars Image */}
          <div className="relative flex items-center justify-center">
            {/* Decorative elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-transparent rounded-full blur-3xl"></div>
            
            {/* Mars planet */}
            <div className="relative z-10 w-full max-w-md md:max-w-lg aspect-square">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-400 via-red-600 to-red-800 shadow-2xl shadow-red-500/50 animate-pulse-slow">
                {/* Mars surface details */}
                <div className="absolute top-1/4 left-1/4 w-16 h-16 bg-red-700/40 rounded-full blur-sm"></div>
                <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-red-800/40 rounded-full blur-sm"></div>
                <div className="absolute bottom-1/3 left-1/3 w-20 h-20 bg-red-600/30 rounded-full blur-sm"></div>
                <div className="absolute top-1/3 right-1/3 w-12 h-12 bg-red-900/50 rounded-full blur-sm"></div>
                
                {/* Craters */}
                <div className="absolute top-[20%] left-[30%] w-8 h-8 bg-red-900/60 rounded-full border border-red-800/30"></div>
                <div className="absolute top-[60%] right-[25%] w-6 h-6 bg-red-900/60 rounded-full border border-red-800/30"></div>
                <div className="absolute bottom-[30%] left-[40%] w-10 h-10 bg-red-900/60 rounded-full border border-red-800/30"></div>
                
                {/* Highlight */}
                <div className="absolute top-[15%] right-[20%] w-32 h-32 bg-gradient-to-br from-red-300/40 to-transparent rounded-full blur-xl"></div>
              </div>
              
              {/* Orbiting elements */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] animate-spin-slow">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg shadow-white/50"></div>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] animate-spin-slower">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-400 rounded-full shadow-lg shadow-red-400/50"></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Join Room Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowJoinModal(false)}>
          <div className="bg-black border-2 border-red-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-red-500/20" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold mb-2 text-white">Join a Room</h3>
            <p className="text-white/70 mb-6">Enter the room ID to join an existing coding session</p>
            
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
              placeholder="Enter Room ID"
              className="w-full bg-black border-2 border-red-500/30 rounded-lg px-4 py-3 mb-4 text-white placeholder:text-white/40 focus:outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20 transition-all"
              autoFocus
            />
            
            <div className="flex gap-3">
              <button
                onClick={joinRoom}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-700 rounded-lg px-6 py-3 font-semibold hover:from-red-600 hover:to-red-800 transition-all shadow-lg shadow-red-500/30"
              >
                Join
              </button>
              <button
                onClick={() => setShowJoinModal(false)}
                className="px-6 py-3 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
