# VelvetCode

**VelvetCode** is a collaborative real-time code editor with AI-powered features, built with Next.js, Monaco Editor, Socket.io, and Google Gemini API.

![VelvetCode](https://img.shields.io/badge/Next.js-15.5.6-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.1.0-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Socket.io](https://img.shields.io/badge/Socket.io-4.8.1-black?style=flat-square&logo=socket.io)

---

![Home Page Picture](velvetcode-frontpage.png)
![Chat Room Picture](velvetcode-chatroom.png)

## Features

### **Real-time Collaboration**
- **Live Code Sync**: Multiple users can edit the same file simultaneously
- **WebSocket Integration**: Instant updates across all connected clients
- **User Presence**: See who's currently in the room

### **AI-Powered Assistant**
- **Code Improvement**: Get AI suggestions to improve your code
- **Code Explanation**: Understand complex code with AI explanations
- **Test Generation**: Automatically generate unit tests
- **Direct Chat**: Ask the AI anything in a dedicated chat interface
- **Powered by Google Gemini 2.0 Flash Exp**

### **Code Execution**
- **Run Code in Browser**: Execute code in 19+ languages using [Piston API](https://github.com/engineer-man/piston)
- **Supported Languages**: JavaScript, TypeScript, Python, Java, C++, C, C#, Go, Rust, PHP, Ruby, Swift, Kotlin, Scala, R, Bash, Lua, Perl, Haskell
- **Execution History**: View previous code executions

### **File Management**
- **File Explorer**: Create, rename, and organize files/folders
- **File Upload**: Drag-and-drop or upload files
- **Monaco Editor**: VS Code-like editing experience with syntax highlighting

### **Modern UI/UX**
- **Red/Black Theme**: Sleek, modern design
- **Responsive**: Works on desktop and mobile
- **Split Panels**: Resizable file explorer, editor, and chat panels
- **Markdown Rendering**: Beautiful AI responses with syntax highlighting

---

## Tech Stack

- **Frontend**: Next.js 15.5.6 (App Router), React 19, TypeScript
- **Editor**: Monaco Editor 0.54.0
- **Real-time**: Socket.io 4.8.1
- **AI**: Google Gemini API (gemini-2.0-flash-exp)
- **Code Execution**: Piston API
- **Styling**: Tailwind CSS 4
- **Markdown**: react-markdown, remark-gfm, rehype-highlight

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ installed
- Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Shaheer-Abbasi/VelvetCode.git
cd VelvetCode
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:
```bash
# Google Gemini API Key
GEMINI_API_KEY=your_api_key_here

# WebSocket URL (for local development)
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

4. **Start the WebSocket server** (in one terminal)
```bash
npm run ws
```

5. **Start the Next.js dev server** (in another terminal)
```bash
npm run dev
```

6. **Open your browser**
```
http://localhost:3000
```
---

## 🏗️ Project Structure

```
velvetcode/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Homepage
│   │   ├── r/[roomId]/           # Room pages
│   │   │   ├── page.tsx          # Room entry
│   │   │   ├── room.tsx          # Main room component
│   │   │   └── components/       # Room UI components
│   │   └── api/
│   │       └── ai/               # AI API routes
│   ├── lib/
│   │   └── piston.ts             # Code execution client
│   └── workers/
│       └── monaco.worker.ts      # Monaco Editor worker
├── ws-server/
│   └── server.ts                 # WebSocket server
├── public/                       # Static assets
└── package.json
```

---

## How It Works

### Room System
1. **Create/Join Room**: Users can create a new room or join existing ones via room ID
2. **Real-time Sync**: All file changes, cursor positions, and selections sync via WebSocket
3. **Persistent State**: Room state stored in WebSocket server memory

### AI Integration
- API routes in `/api/ai/suggest` and `/api/ai/chat`
- Uses Google Gemini API for code analysis and chat
- Markdown rendering for formatted responses

### Code Execution
- Client sends code to Piston API via `/lib/piston.ts`
- Results broadcast to all users in the room
- Execution history stored per room (last 50 executions)

---

## 🔧 Configuration

### WebSocket Server
- Default port: `4000`
- Configurable in `ws-server/server.ts`

### Next.js
- Using App Router and React Server Components
- TypeScript strict mode enabled
- 
---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

---

## 📧 Contact

**Shaheer Abbasi** - [@Shaheer-Abbasi](https://github.com/Shaheer-Abbasi)

**Project Link**: [https://github.com/Shaheer-Abbasi/VelvetCode](https://github.com/Shaheer-Abbasi/VelvetCode)
