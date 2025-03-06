import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    // Lê o corpo da requisição
    const body = await req.json();
    console.log("📥 [Webhook Pix Recebido]:", JSON.stringify(body, null, 2));

    // Processa o webhook e extrai os dados
    const pixData = body.pix[0]; // Supondo que seja o primeiro objeto em `pix`
    const { endToEndId, txid, valor, chave, horario, status } = pixData;

    // Verifica se o status está presente no corpo do webhook
    if (!status) {
      return NextResponse.json({ error: "Status de pagamento não fornecido" }, { status: 400 });
    }

    // Atualiza o pagamento no banco para o status "Pago", se o status indicar que o pagamento foi bem-sucedido
    if (status === "pago") {
      await prisma.pixWebhook.update({
        where: { txid: txid },
        data: {
          status: "pago", // Atualiza o status para "pago"
        },
      });
    }

    // Se o pagamento não for confirmado, podemos continuar com a lógica de criar o registro
    else {
      await prisma.pixWebhook.create({
        data: {
          endToEndId,
          txid,
          valor: parseFloat(valor),
          chave,
          horario: new Date(horario),
          status,  // Agora estamos salvando o status também
        },
      });
    }

    return NextResponse.json({ message: "Webhook processado e salvo com sucesso" });

  } catch (error) {
    console.error("❌ [Erro Webhook]:", error);
    return NextResponse.json({ error: "Erro ao processar o webhook" }, { status: 500 });
  }
}
