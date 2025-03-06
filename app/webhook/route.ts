// app/api/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    // Lê o corpo da requisição
    const body = await req.json();
    console.log("📥 [Webhook Pix Recebido]:", JSON.stringify(body, null, 2));

    // Processa o webhook e salva no banco de dados
    const pixData = body.pix[0]; // Supondo que seja o primeiro objeto em `pix`
    const { endToEndId, txid, valor, chave, horario } = pixData;

    // Armazenar os dados no banco
    await prisma.pixWebhook.create({
      data: {
        endToEndId,
        txid,
        valor: parseFloat(valor),
        chave,
        horario: new Date(horario),
      },
    });

    return NextResponse.json({ message: "Webhook processado e salvo com sucesso" });

  } catch (error) {
    console.error("❌ [Erro Webhook]:", error);
    return NextResponse.json({ error: "Erro ao processar o webhook" }, { status: 500 });
  }
}
