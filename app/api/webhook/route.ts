import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("📥 [Webhook Recebido] Dados:", body);

    // Simulação de processamento do Pix recebido
    if (body.pix) {
      body.pix.forEach((pix: any) => {
        console.log(`✅ [Pix Recebido] ID: ${pix.txid}, Valor: R$${pix.valor}`);
      });
    }

    return NextResponse.json({ message: "Webhook recebido com sucesso" });
  } catch (error) {
    console.error("❌ [Erro Webhook] Falha ao processar:", error);
    return NextResponse.json(
      { error: "Erro ao processar o webhook" },
      { status: 500 }
    );
  }
}
