import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("📥 [Webhook Pix Recebido]:", JSON.stringify(body, null, 2));

    const pixData = body.pix[0];
    const { endToEndId, txid, valor, chave, horario, status } = pixData; // Assumindo que o status vem no payload do webhook

    // Verifique se o status foi enviado no payload
    if (!status) {
      return NextResponse.json({ error: "Status de pagamento não fornecido" }, { status: 400 });
    }

    // Atualize ou crie uma nova entrada no banco de dados
    await prisma.pixWebhook.upsert({
      where: { txid: txid },
      update: {
        status,  // Atualiza o status do pagamento
        valor: parseFloat(valor),
        chave,
        horario: new Date(horario),
      },
      create: {
        endToEndId,
        txid,
        valor: parseFloat(valor),
        chave,
        horario: new Date(horario),
        status,  // Salva o status do pagamento ao criar a entrada
      },
    });

    return NextResponse.json({ message: "Webhook processado e salvo com sucesso" });
  } catch (error) {
    console.error("❌ [Erro Webhook]:", error);
    return NextResponse.json({ error: "Erro ao processar o webhook" }, { status: 500 });
  }
}
