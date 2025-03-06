import { WebSocketServer } from "ws";

export const config = {
  api: {
    bodyParser: false,
  },
};

let wss: WebSocketServer | null = null;

// Inicia o servidor WebSocket quando a API for acessada
export async function GET() {
  if (!wss) {
    wss = new WebSocketServer({ noServer: true });

    wss.on("connection", (socket) => {
      console.log("Novo cliente WebSocket conectado.");

      socket.on("message", (message) => {
        console.log(`Mensagem recebida: ${message}`);
      });
    });

    console.log("✅ Servidor WebSocket iniciado.");
  }

  return new Response("WebSocket server is running.");
}

// Esta função deve ser chamada quando o pagamento for confirmado
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
