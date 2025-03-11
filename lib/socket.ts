import { Server } from "socket.io";

let io: Server | null = null;

export function getSocketServer(server: any) {
  if (!io) {
    io = new Server(server, {
      cors: { origin: "*" },
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
