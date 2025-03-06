import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/api/webhook")) {
    return NextResponse.next();
  }

  console.log("🔒 [Middleware] Validando requisição para o Webhook...");

  // Definir cabeçalhos CORS para permitir requisições externas
  const res = NextResponse.next();
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Verificar se é uma requisição OPTIONS (preflight)
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: res.headers });
  }

  // Simulação de autenticação: pode validar um token no cabeçalho Authorization
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
    console.log("❌ [Middleware] Acesso negado ao Webhook.");
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  console.log("✅ [Middleware] Requisição autorizada.");
  return res;
}

// Aplica o middleware para todas as requisições no webhook
export const config = {
  matcher: "/api/webhook/:path*",
};
