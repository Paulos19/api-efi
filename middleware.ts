import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Adicionando os cabeçalhos CORS
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Verificar se a requisição é do tipo OPTIONS (preflight)
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: res.headers });
  }

  // Se a requisição for para a API interna (webhook)
  if (req.nextUrl.pathname.startsWith("/api/webhook")) {
    console.log("🔒 [Middleware] Validando requisição para o Webhook...");

    // Simulação de autenticação: pode validar um token no cabeçalho Authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
      console.log("❌ [Middleware] Acesso negado ao Webhook.");
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    console.log("✅ [Middleware] Requisição autorizada para Webhook.");
  }

  return res;
}

// Aplica o middleware para todas as requisições que começam com /api/webhook ou para a API externa de pagamento
export const config = {
  matcher: ["/webhook/:path*"],
};
