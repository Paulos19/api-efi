import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

    return NextResponse.json({ message: "Webhook processado e pagamento recebido" });
  } catch (error) {
    console.error("❌ [Erro Webhook]:", error);
    return NextResponse.json({ error: "Erro ao processar o webhook" }, { status: 500 });
  }
}
