import { WebSocketServer } from "ws";

let wss: WebSocketServer | null = null;

export const initializeWebSocket = (server: any) => {
  if (!wss) {
    wss = new WebSocketServer({ noServer: true });

    wss.on("connection", (socket) => {
      console.log("Novo cliente WebSocket conectado.");

      socket.on("message", (message) => {
        console.log(`Mensagem recebida: ${message}`);
      });

      socket.on("close", () => {
        console.log("Cliente WebSocket desconectado.");
      });
    });

    console.log("✅ Servidor WebSocket inicializado.");
  }

  return wss;
};

// Função para enviar atualizações quando o pagamento for confirmado
export const sendPaymentUpdate = (message: string) => {
  if (!wss) {
    console.warn("⚠️ WebSocket Server não inicializado.");
    return;
  }

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });

  console.log("📢 Mensagem enviada para os clientes WebSocket.");
};
