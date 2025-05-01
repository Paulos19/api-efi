import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
// Remova a importação do sqlite
// import { run as runSqliteQuery } from '@/lib/sqlite';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  let txidToLog = 'N/A';
  try {
    const notification = await req.json();
    console.log('Webhook recebido:', JSON.stringify(notification, null, 2));

    if (!notification?.pix?.length) {
      return NextResponse.json({ message: 'Webhook recebido, formato inválido ou vazio.' }, { status: 200 });
    }

    for (const pix of notification.pix) {
      const txid = pix.txid;
      txidToLog = txid || 'N/A';
      const valorPago = parseFloat(pix.valor);
      const endToEndId = pix.endToEndId;
      const horarioPix = pix.horario ? new Date(pix.horario) : new Date();
      const status = 'COMPLETED';

      if (!txid) {
        console.warn('Webhook Pix sem txid:', pix);
        continue;
      }

      let characterName = pix.infoAdicionais?.find((item: any) => item.nome === 'characterName')?.valor;
      const paymentRecord = await prisma.pixWebhook.findUnique({ where: { txid } });

      if (!paymentRecord) {
        console.warn(`[Webhook] Registro não encontrado para txid: ${txid}`);
        continue;
      }

      characterName = characterName || paymentRecord.characterName;
      
      if (!characterName) {
        console.warn(`[Webhook] characterName não encontrado para txid: ${txid}`);
        await prisma.pixWebhook.update({
          where: { txid },
          data: { status, payload: pix, endToEndId, horario: horarioPix }
        });
        continue;
      }

      if (paymentRecord.status === 'COMPLETED') {
        console.log(`[Webhook] Pagamento ${txid} já concluído`);
        continue;
      }

      // Atualizar registro no PostgreSQL
      await prisma.pixWebhook.update({
        where: { txid },
        data: {
          status: 'COMPLETED',
          payload: pix,
          endToEndId,
          horario: horarioPix,
          characterName // Certifique-se que characterName está sendo populado corretamente
        }
      });

      // Substituir a lógica do SQLite pela lógica do Prisma
      try {
        // Encontrar o personagem pelo nome
        const character = await prisma.character.findUnique({
          where: { name: characterName },
          include: { accountRel: true } // Corrected: Use the relation field name 'accountRel'
        });

        if (character && character.accountRel) { // Corrected: Check 'accountRel'
          // Atualizar os coins na conta associada ao personagem
          // IMPORTANTE: Assumindo que o modelo 'Account' tem um campo 'coins' do tipo numérico.
          // Verifique seu schema.prisma e adicione `coins Float @default(0)` ou similar se necessário.
          await prisma.account.update({
            where: { id: character.accountRel.id }, // Corrected: Access account ID via 'accountRel'
            data: {
              // Substitua 'coins' pelo nome correto do campo se for diferente
              coins: {
                increment: 100 // Adiciona 100 coins
              }
            }
          });
          console.log(`[Webhook] ${characterName} (Conta: ${character.accountRel.name}) recebeu 100 coins via Prisma.`); // Corrected: Access account name via 'accountRel'
        } else if (character) {
           console.warn(`[Webhook] Personagem ${characterName} encontrado, mas sem conta associada (account field: ${character.account}). Coins não adicionados.`); // Adjusted log message
        }
         else {
          console.warn(`[Webhook] Personagem ${characterName} não encontrado no banco de dados Prisma. Coins não adicionados.`);
        }
      } catch (prismaError: any) {
        console.error(`[Webhook] Erro ao atualizar coins via Prisma para ${characterName}: ${prismaError.message}`);
      }
    }

    return NextResponse.json({ message: 'Webhook processado' }, { status: 200 });

  } catch (error: any) {
    console.error(`[Webhook] Erro fatal (Txid: ${txidToLog}):`, error.message);
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 });
  } finally {
     await prisma.$disconnect();
  }
}