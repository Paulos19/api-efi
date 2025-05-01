import { NextRequest, NextResponse } from "next/server"; // Importar NextRequest
import { GNRequest } from "@/app/utils/gnRequest";
import { PrismaClient } from '@prisma/client'; // Importar Prisma Client

const prisma = new PrismaClient(); // Instanciar Prisma Client

// Alterar de GET para POST e adicionar 'req' como parâmetro
export async function POST(req: NextRequest) {
  try {
    // Ler o corpo da requisição
    const body = await req.json();
    const { valor, characterName } = body;

    // Validar se os dados necessários foram recebidos
    if (!valor || !characterName) {
      return NextResponse.json({ error: "Valor e characterName são obrigatórios" }, { status: 400 });
    }

    // --- Added Check for PIX Key ---
    const pixKey = process.env.GN_PIX_KEY;
    if (!pixKey) {
        console.error("❌ [Erro Configuração] Variável de ambiente GN_PIX_KEY não definida.");
        return NextResponse.json({ error: "Erro interno de configuração do servidor (PIX Key ausente)" }, { status: 500 });
    }
    // --- End Added Check ---

    const reqGN = await GNRequest();

    const dataCob = {
      calendario: { expiracao: 3600 },
      valor: { original: valor }, // Usar o valor recebido
      chave: pixKey, // Use the validated pixKey variable
      solicitacaoPagador: `Compra de coins para ${characterName}`, // Mensagem personalizada
      infoAdicionais: [ // Adicionar informações extras para o webhook
        { nome: "characterName", valor: characterName }
      ]
    };

    const cobResponse = await reqGN.post("/v2/cob", dataCob);
    const locId = cobResponse.data.loc.id;
    const txid = cobResponse.data.txid; // Obter o txid da resposta

    // Salvar o txid e characterName no banco de dados (PostgreSQL via Prisma)
    try {
      await prisma.pixWebhook.create({
        data: {
          txid: txid,
          // endToEndId: '', // This field is missing, causing the error
          valor: parseFloat(valor),
          chave: pixKey,
          horario: new Date(),
          status: 'PENDING',
          characterName: characterName,
        }
      });
      console.log(`[API Pix] Cobrança criada e registrada no DB para txid: ${txid}, character: ${characterName}`);
    } catch (dbError: any) {
      // Logar o erro mas continuar, pois o QR code ainda pode ser gerado
      // IMPORTANTE: Considerar se deve retornar erro aqui caso a persistência inicial seja crítica
      console.error(`[API Pix] Erro CRÍTICO ao salvar cobrança inicial no DB para txid ${txid}:`, dbError.message);
      // return NextResponse.json({ error: "Erro interno ao registrar cobrança" }, { status: 500 }); // Descomentar se preferir falhar
    }

    const qrcodeResponse = await reqGN.get(`/v2/loc/${locId}/qrcode`);

    // Criar resposta com CORS habilitado e retornar qrcode e txid
    const res = NextResponse.json({
      qrcode: qrcodeResponse.data.imagemQrcode, // Manter 'qrcode' como chave para compatibilidade com o frontend
      txid: txid // Retornar o txid
    });
    res.headers.set("Access-Control-Allow-Origin", "*"); // Manter CORS se necessário
    return res;

  } catch (error: any) { // Capturar erro como 'any' para acessar 'response'
    console.error("❌ [Erro API] Falha ao gerar Pix:", error.response?.data || error.message || error);
    // Retornar uma mensagem de erro mais detalhada se disponível
    const errorMessage = error.response?.data?.mensagem || error.response?.data?.title || "Erro ao gerar o Pix";
    const errorStatus = error.response?.status || 500;
    return NextResponse.json({ error: errorMessage }, { status: errorStatus });
  } finally {
    await prisma.$disconnect(); // Boa prática desconectar o Prisma
  }
}
