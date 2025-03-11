import { Server } from "socket.io";
import { IncomingMessage, Server as HTTPServer } from "http";

let io: Server | null = null;

export function getSocketServer(server: HTTPServer) {
  if (!io) {
    io = new Server(server, {
      cors: { origin: "*" }, // Permitir conexões de qualquer origem
    });

    io.on("connection", (socket) => {
      console.log("Cliente conectado ao WebSocket");

      socket.on("disconnect", () => {
        console.log("Cliente desconectado");
      });
    });
  }
  return io;
}
