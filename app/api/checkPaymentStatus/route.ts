import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import Cors from "cors";

// Inicializando o Prisma Client
const prisma = new PrismaClient();

// Inicializando o middleware CORS
const cors = Cors({
  methods: ["GET", "POST"],
  origin: "http://localhost:3000", // Altere para o domínio de onde sua aplicação frontend será executada
});

function runMiddleware(req: NextRequest, res: any, fn: Function) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    const res = NextResponse.next();  // Cria uma instância do NextResponse

    // Executar o middleware CORS antes de processar a requisição
    await runMiddleware(req, res, cors);

    const body = await req.json();
    const { txid } = body;

    // Buscar o pagamento na tabela pixWebhook pelo txid
    const pixWebhook = await prisma.pixWebhook.findUnique({
      where: { txid },
    });

    if (pixWebhook && pixWebhook.status === "CONFIRMED") {
      // Se o pagamento estiver confirmado, retornar o valor do pagamento
      return NextResponse.json({
        status: "CONFIRMED",
        coins: pixWebhook.valor,
      });
    } else {
      return NextResponse.json({
        status: "PENDING",
      });
    }
  } catch (error) {
    console.error("❌ Erro ao verificar o status do pagamento:", error);
    return NextResponse.json({ error: "Erro ao verificar o pagamento" }, { status: 500 });
  }
}
