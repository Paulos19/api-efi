import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getSocketServer } from "@/lib/socket";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("📥 [Webhook Pix Recebido]:", JSON.stringify(body, null, 2));

    const pixData = body.pix[0];
    const { endToEndId, txid, valor, chave, horario } = pixData;

    // Salvar pagamento no banco
    await prisma.pixWebhook.create({
      data: {
        endToEndId,
        txid,
        valor: parseFloat(valor),
        chave,
        horario: new Date(horario),
        status: "PAYMENT_RECEIVED",
      },
    });

    console.log(`✅ [Pagamento Recebido] TXID: ${txid}, Valor: ${valor}`);

    // Emitir evento WebSocket
    const io = getSocketServer(globalThis);
    io?.emit("paymentUpdate", { txid, valor, status: "PAYMENT_RECEIVED" });

    return NextResponse.json({ message: "Pagamento processado e notificado" });
  } catch (error) {
    console.error("❌ [Erro Webhook]:", error);
    return NextResponse.json({ error: "Erro ao processar o webhook" }, { status: 500 });
  }
}
