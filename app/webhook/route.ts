import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import WebSocket, { WebSocketServer } from "ws";
import http from "http"; // Importando http.Server

const prisma = new PrismaClient();

// Criando uma instância do WebSocket Server
let wss: WebSocketServer;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("📥 [Webhook Pix Recebido]:", JSON.stringify(body, null, 2));

    const pixData = body.pix[0];
    const { endToEndId, txid, valor, chave, horario } = pixData;

    // Atualiza o status para "PAYMENT_RECEIVED" após receber o pagamento
    await prisma.pixWebhook.upsert({
      where: { txid },
      update: {
        status: "PAYMENT_RECEIVED",
        valor: parseFloat(valor),
        horario: new Date(horario),
      },
      create: {
        endToEndId,
        txid,
        valor: parseFloat(valor),
        chave,
        horario: new Date(horario),
        status: "PAYMENT_RECEIVED",
      },
    });

    // Enviar o txid para todos os clientes conectados via WebSocket
    if (wss) {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              message: "Pagamento recebido",
              txid, // Envia o txid para os clientes
            })
          );
        }
      });
    }

    return NextResponse.json({ message: "Webhook processado e pagamento recebido" });
  } catch (error) {
    console.error("❌ [Erro Webhook]:", error);
    return NextResponse.json({ error: "Erro ao processar o webhook" }, { status: 500 });
  }
}

// Atualizando o tipo do parâmetro para http.Server
export function initializeWebSocket(server: http.Server) {
  // Criando o WebSocket Server com o servidor HTTP
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('Cliente conectado via WebSocket');
  
    // Enviar uma mensagem de boas-vindas quando o cliente se conectar
    ws.send(JSON.stringify({ message: 'Bem-vindo ao WebSocket!' }));

    ws.on('message', (message) => {
      console.log('Mensagem recebida:', message);
    });

    ws.on('close', () => {
      console.log('Cliente desconectado');
    });
  });
}
