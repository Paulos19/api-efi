import { Server } from "socket.io";

let io: Server | null = null;

export function getSocketServer(server: any) {
  if (!io) {
    io = new Server(server, {
      cors: {
        origin: "http://localhost:3000", // Permite conexões apenas do frontend local
        methods: ["GET", "POST"], // Métodos permitidos
        allowedHeaders: ["my-custom-header"], // Cabeçalhos permitidos (opcional)
        credentials: true, // Habilita o envio de cookies, se necessário
      },
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
