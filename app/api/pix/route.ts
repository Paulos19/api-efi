import { GNRequest } from "@/app/utils/gnRequest";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  console.log("📢 [GET] /api/pix - Iniciando criação do Pix");

  try {
    const reqGN = await GNRequest();
    console.log("✅ [API] Cliente autenticado!");

    const dataCob = {
      calendario: { expiracao: 3600 },
      valor: { original: "0.10" },
      chave: process.env.GN_PIX_KEY,
      solicitacaoPagador: "Cobrança dos serviços prestados.",
    };

    const cobResponse = await reqGN.post("/v2/cob", dataCob);
    console.log("✅ [API] Cobrança criada:", cobResponse.data);

    const qrcodeResponse = await reqGN.get(
      `/v2/loc/${cobResponse.data.loc.id}/qrcode`
    );
    console.log("✅ [API] QR Code gerado!");

    return NextResponse.json({
      qrcodeImage: qrcodeResponse.data.imagemQrcode,
    });
  } catch (error) {
    console.error("❌ [Erro API] Falha ao gerar Pix:", error);
    return NextResponse.json({ error: "Erro ao gerar o Pix" }, { status: 500 });
  }
}
