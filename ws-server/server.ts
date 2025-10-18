import http from "http";
import { Server } from "socket.io";

type RoomState = {
  code: string;
  language: string;
  chat: { id: string; name: string; text: string; ts: number }[];
};

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: "*" },
});

const rooms = new Map<string, RoomState>();

io.on("connection", (socket) => {
  socket.on("join-room", ({ roomId }) => {
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        code: "// Start typing together...\n",
        language: "javascript",
        chat: [],
      });
    }

    // Send current state to the new client
    socket.emit("room-state", rooms.get(roomId));

    // Broadcast presence (optional)
    socket.to(roomId).emit("user-joined", { id: socket.id });
  });

  socket.on("code-update", ({ roomId, code }) => {
    const state = rooms.get(roomId);
    if (!state) return;
    state.code = code;
    socket.to(roomId).emit("code-update", { code });
  });

  socket.on("language-change", ({ roomId, language }) => {
    const state = rooms.get(roomId);
    if (!state) return;
    state.language = language;
    io.to(roomId).emit("language-change", { language });
  });

  socket.on("chat-message", ({ roomId, msg }) => {
    const state = rooms.get(roomId);
    if (!state) return;
    state.chat.push(msg);
    io.to(roomId).emit("chat-message", msg);
  });

  socket.on("disconnect", () => {
    // optional: broadcast presence
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
server.listen(PORT, () => {
  console.log(`WS server listening on :${PORT}`);
});
