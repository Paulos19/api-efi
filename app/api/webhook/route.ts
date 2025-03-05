import { NextRequest, NextResponse } from "next/server";

interface PixTransaction {
  txid: string;
  valor: string;
}

interface WebhookBody {
  pix?: PixTransaction[];
}

export async function POST(req: NextRequest) {
  try {
    const body: WebhookBody = await req.json();
    console.log("📥 [Webhook Recebido] Dados:", body);

    if (body.pix) {
      body.pix.forEach((pix: PixTransaction) => {
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
