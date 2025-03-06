import { NextResponse } from "next/server";
import { GNRequest } from "@/app/utils/gnRequest";

export async function GET() {
  try {
    const reqGN = await GNRequest();

    const dataCob = {
      calendario: { expiracao: 3600 },
      valor: { original: "0.10" },
      chave: process.env.GN_PIX_KEY,
      solicitacaoPagador: "Cobrança dos serviços prestados.",
    };

    const cobResponse = await reqGN.post("/v2/cob", dataCob);
    const qrcodeResponse = await reqGN.get(`/v2/loc/${cobResponse.data.loc.id}/qrcode`);

    // Criar resposta com CORS habilitado
    const res = NextResponse.json({ qrcodeImage: qrcodeResponse.data.imagemQrcode });
    res.headers.set("Access-Control-Allow-Origin", "*");
    return res;
  } catch (error) {
    console.error("❌ [Erro API] Falha ao gerar Pix:", error);
    return NextResponse.json({ error: "Erro ao gerar o Pix" }, { status: 500 });
  }
}
