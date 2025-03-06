const { Server } = require("socket.io");
const { createServer } = require("http");
const express = require("express");

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log(`📡 Cliente conectado: ${socket.id}`);

  // Simula um pagamento confirmado
  setTimeout(() => {
    socket.emit("paymentConfirmed", { coins: 100 });
  }, 10000); // Simula um pagamento após 10 segundos

  socket.on("disconnect", () => {
    console.log(`❌ Cliente desconectado: ${socket.id}`);
  });
});

server.listen(3001, () => console.log("🚀 Servidor WebSocket rodando na porta 3001"));
