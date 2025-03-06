import { WebSocketServer, WebSocket } from "ws";

let wss: WebSocketServer | null = null;

export function initializeWebSocket(server?: any) {
  if (!wss) {
    wss = new WebSocketServer({ noServer: true });

    wss.on("connection", (socket: WebSocket) => {
      console.log("🔌 Novo cliente WebSocket conectado.");

      socket.on("message", (message) => {
        console.log(`📩 Mensagem recebida: ${message}`);
      });

      socket.on("close", () => {
        console.log("❌ Cliente WebSocket desconectado.");
      });
    });

    console.log("✅ Servidor WebSocket inicializado.");
  }
}

export function sendPaymentUpdate(message: string) {
  if (wss) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
    console.log("📢 Notificação enviada via WebSocket:", message);
  } else {
    console.error("❌ Erro: Servidor WebSocket não inicializado.");
  }
}
