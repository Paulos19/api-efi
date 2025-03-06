import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// Definindo tipos para a resposta do corpo da requisição
interface PaymentStatusRequestBody {
  txid: string;
}

// Inicializando o Prisma Client
const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body: PaymentStatusRequestBody = await req.json(); // Tipando o corpo da requisição
    const { txid } = body;

    // Buscar o pagamento na tabela pixWebhook pelo txid
    const pixWebhook = await prisma.pixWebhook.findUnique({
      where: { txid },
    });

    if (pixWebhook && pixWebhook.status === "CONFIRMED") {
      // Se o pagamento estiver confirmado, retornar o valor do pagamento
      return NextResponse.json({
        status: "CONFIRMED",
        coins: pixWebhook.valor,
      });
    } else {
      return NextResponse.json({
        status: "PENDING",
      });
    }
  } catch (error) {
    console.error("❌ Erro ao verificar o status do pagamento:", error);
    return NextResponse.json({ error: "Erro ao verificar o pagamento" }, { status: 500 });
  }
}
