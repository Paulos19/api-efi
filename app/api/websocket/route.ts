import { NextResponse } from "next/server";
import { initializeWebSocket } from "@/app/utils/websocket";

export async function GET() {
  initializeWebSocket(null); // Inicializa o WebSocket se ainda não estiver iniciado
  return NextResponse.json({ message: "WebSocket está rodando." });
}
