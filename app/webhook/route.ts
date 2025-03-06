import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { sendPaymentUpdate } from "../api/websocket/route";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("📥 [Webhook Pix Recebido]:", JSON.stringify(body, null, 2));

    const pixData = body.pix[0];
    const { endToEndId, txid, valor, chave, horario } = pixData;

    await prisma.pixWebhook.create({
      data: {
        endToEndId,
        txid,
        valor: parseFloat(valor),
        chave,
        horario: new Date(horario),
      },
    });

    console.log(`🔔 [WebSocket] Enviando pagamento confirmado - TXID: ${txid}`);
    sendPaymentUpdate(JSON.stringify({ txid, valor })); // Enviar apenas os dados necessários

    return NextResponse.json({ message: "Webhook processado com sucesso" });
  } catch (error) {
    console.error("❌ [Erro Webhook]:", error);
    return NextResponse.json({ error: "Erro ao processar o webhook" }, { status: 500 });
  }
}
