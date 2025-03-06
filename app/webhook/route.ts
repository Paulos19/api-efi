import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("📥 [Webhook Pix Recebido]:", JSON.stringify(body, null, 2));

    const pixData = body.pix[0];
    const { endToEndId, txid, valor, chave, horario, status } = pixData;

    // Criar o registro do webhook no banco
    const pixWebhook = await prisma.pixWebhook.create({
      data: {
        endToEndId,
        txid,
        valor: parseFloat(valor),
        chave,
        horario: new Date(horario),
        status, // Adicionar o status do pagamento (ex: "PENDING", "CONFIRMED")
      },
    });

    console.log("✅ [Webhook Processado] PixWebhook registrado:", pixWebhook);

    // Se o status do pagamento for "CONFIRMED", atualizar as coins do usuário
    if (status === "CONFIRMED") {
      const user = await prisma.user.findUnique({
        where: { pixKey: chave }, // Buscar usuário pela chave Pix
      });

      if (user) {
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            coins: user.coins + valor, // Adicionar o valor do pagamento às coins do usuário
          },
        });

        console.log("✅ [Pagamento Confirmado] Coins do usuário atualizadas:", updatedUser);
      }
    }

    return NextResponse.json({ message: "Webhook processado com sucesso!" });
  } catch (error) {
    console.error("❌ [Erro Webhook]:", error);
    return NextResponse.json({ error: "Erro ao processar o webhook" }, { status: 500 });
  }
}
