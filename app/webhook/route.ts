import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("📥 [Webhook Pix Recebido]:", JSON.stringify(body, null, 2));

    // Verifique se a estrutura do corpo contém o que é esperado
    const pixData = body.pix[0];
    const { endToEndId, txid, valor, chave, horario, status } = pixData;

    // Verifique se o status foi fornecido, caso contrário, retorne um erro
    if (!status) {
      return NextResponse.json({ error: "Status de pagamento não fornecido" }, { status: 400 });
    }

    // Criação do registro no banco de dados
    await prisma.pixWebhook.create({
      data: {
        endToEndId,
        txid,
        valor: parseFloat(valor),
        chave,
        horario: new Date(horario),
        status,  // Salvando o status da transação
      },
    });

    return NextResponse.json({ message: "Webhook processado e salvo com sucesso" });
  } catch (error) {
    console.error("❌ [Erro Webhook]:", error);
    return NextResponse.json({ error: "Erro ao processar o webhook" }, { status: 500 });
  }
}
