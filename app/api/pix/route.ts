import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { GNRequest } from '@/app/utils/gnRequest'; // Verifique se este import está correto

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  // Espera 'valor' e 'characterName'
  const { valor, characterName } = await req.json();

  // Validação básica
  if (!valor || typeof valor !== 'string' || parseFloat(valor) <= 0) {
    return NextResponse.json({ message: 'Valor inválido' }, { status: 400 });
  }
  // Valida characterName como string não vazia
  if (!characterName || typeof characterName !== 'string' || characterName.trim() === '') {
    return NextResponse.json({ message: 'Nome do personagem inválido' }, { status: 400 });
  }

  const reqGN = await GNRequest();

  const dataCob = {
    calendario: {
      expiracao: 3600,
    },
    valor: {
      original: valor,
    },
    chave: process.env.GN_CHAVE_PIX,
    // Atualiza solicitação do pagador
    solicitacaoPagador: `Pagamento para personagem: ${characterName}`,
    infoAdicionais: [
      {
        nome: 'Produto',
        valor: 'Coins Virtuais',
      },
      {
        // Usa 'characterName' como chave na informação adicional
        nome: 'characterName',
        valor: characterName, // Passa o nome diretamente
      },
    ],
  };

  try {
    const cobResponse = await reqGN.post('/v2/cob', dataCob);
    const cobrancaId = cobResponse.data.txid;

    const qrCodeResponse = await reqGN.get(`/v2/loc/${cobResponse.data.loc.id}/qrcode`);

    // Salva no Prisma (PostgreSQL) - Removido characterId, pode adicionar characterName se quiser
    await prisma.pixWebhook.create({
      data: {
        txid: cobrancaId,
        status: 'PENDING',
        valor: parseFloat(valor),
        payload: JSON.stringify(cobResponse.data),
        // characterId: characterId, // Removido - ou substitua por characterName se o schema permitir
      },
    });

    console.log('Cobrança PIX criada para:', characterName, 'TxID:', cobrancaId);

    return NextResponse.json({
      txid: cobrancaId,
      qrcode: qrCodeResponse.data.imagemQrcode,
    });

  } catch (error: any) {
    console.error('Erro ao criar cobrança PIX:', error.response?.data || error.message);
    return NextResponse.json(
      { message: 'Erro ao criar cobrança PIX', error: error.response?.data || error.message },
      { status: 500 }
    );
  }
}

// GET handler (se existir, mantenha como está ou remova se não for usado)
// export async function GET() {
//   // ... seu código GET existente ...
// }
