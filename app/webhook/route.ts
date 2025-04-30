import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { run as runSqliteQuery } from '@/lib/sqlite';

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
          characterName
        }
      });

      // Atualizar coins no SQLite
      try {
        const sqliteResult = await runSqliteQuery(
          'UPDATE characters SET coins = coins + ? WHERE name = ?',
          [100, characterName]
        );

        if (sqliteResult.changes > 0) {
          console.log(`[Webhook] ${characterName} recebeu 100 coins`);
        } else {
          console.warn(`[Webhook] Falha na atualização de coins para ${characterName}`);
        }
      } catch (sqliteError: any) {
        console.error(`[Webhook] Erro no SQLite: ${sqliteError.message}`);
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