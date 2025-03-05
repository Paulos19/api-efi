// app/api/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Lê o corpo da requisição (os dados enviados pelo webhook)
    const body = await req.json();
    
    // Loga os dados recebidos no console para monitoramento
    console.log("📥 [Webhook Pix Recebido]:", JSON.stringify(body, null, 2));

    // Aqui você pode processar os dados, salvar no banco, enviar notificações, etc.
    // Exemplo de processamento adicional (opcional)
    // if (body.status === 'PAID') { 
    //   // Lógica de processamento de pagamento pago
    // }

    // Responde com sucesso
    return NextResponse.json({ message: "Webhook processado com sucesso" });

  } catch (error) {
    // Caso ocorra algum erro, loga o erro e responde com status 500
    console.error("❌ [Erro Webhook]:", error);
    return NextResponse.json({ error: "Erro ao processar o webhook" }, { status: 500 });
  }
}
