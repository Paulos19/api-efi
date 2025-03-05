import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/api/webhook")) {
    return NextResponse.next();
  }

  console.log("🔒 [Middleware] Validando requisição para o Webhook...");

  // Simulação: Aqui você pode validar o certificado do cliente se necessário
  const isAuthorized = true;

  if (!isAuthorized) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/webhook/:path*",
};
