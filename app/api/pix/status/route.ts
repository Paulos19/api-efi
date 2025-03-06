// app/api/status/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // Extrair o txid da URL
    const { searchParams } = new URL(req.url);
    const txid = searchParams.get("txid");

    if (!txid) {
      return NextResponse.json({ error: "Txid não fornecido" }, { status: 400 });
    }

    // Consultar o banco de dados para obter o status do pagamento
    const payment = await prisma.pixWebhook.findUnique({
      where: { txid: txid },
    });

    if (!payment) {
      return NextResponse.json({ error: "Pagamento não encontrado" }, { status: 404 });
    }

    // Retornar o status do pagamento
    return NextResponse.json({ status: payment.status });
  } catch (error) {
    console.error("Erro ao verificar status do pagamento:", error);
    return NextResponse.json({ error: "Erro ao verificar status" }, { status: 500 });
  }
}
