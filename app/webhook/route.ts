// app/api/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import WebSocket, { WebSocketServer } from 'ws'; // Importar WebSocket para enviar atualizações

const prisma = new PrismaClient();

// Servidor WebSocket (dentro do backend Node.js)
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws) => {
  console.log('Cliente WebSocket conectado');
  
  // Quando o pagamento for confirmado, enviaremos uma mensagem ao cliente
  ws.on('message', (message) => {
    console.log('Mensagem recebida:', message);
  });
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("📥 [Webhook Pix Recebido]:", JSON.stringify(body, null, 2));

    const pixData = body.pix[0];
    const { endToEndId, txid, valor, chave, horario } = pixData;

    // Atualiza o status para "PAYMENT_RECEIVED" após receber o pagamento
    const updatedPayment = await prisma.pixWebhook.upsert({
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

    // Enviar uma atualização para os clientes conectados via WebSocket
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ txid, status: "PAYMENT_RECEIVED" }));
      }
    });

    return NextResponse.json({ message: "Webhook processado e pagamento recebido", updatedPayment });
  } catch (error) {
    console.error("❌ [Erro Webhook]:", error);
    return NextResponse.json({ error: "Erro ao processar o webhook" }, { status: 500 });
  }
}
