import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
// Remova as importações de 'ws' se não forem mais usadas aqui
// import WebSocket, { WebSocketServer } from 'ws';
import { run as runSqliteQuery } from '@/lib/sqlite';

const prisma = new PrismaClient();


export async function POST(req: NextRequest) {
  try {
    const notification = await req.json();
    console.log('Webhook recebido:', JSON.stringify(notification, null, 2));

    if (!notification || !notification.pix || !Array.isArray(notification.pix)) {
      console.warn('Formato de webhook inválido recebido.');
      return NextResponse.json({ message: 'Webhook recebido, formato inválido.' }, { status: 200 });
    }

    for (const pix of notification.pix) {
      const txid = pix.txid;
      const valorPago = parseFloat(pix.valor);
      const status = 'CONCLUIDO';

      let characterName: string | undefined;
      if (pix.infoAdicionais && Array.isArray(pix.infoAdicionais)) {
        const info = pix.infoAdicionais.find((item: { nome: string; valor: string }) => item.nome === 'characterName');
        characterName = info?.valor;
      }

      if (!txid) {
        console.warn('Webhook sem txid:', pix);
        continue;
      }

      if (!characterName) {
        console.warn(`Webhook para txid ${txid} sem characterName em infoAdicionais.`);
        continue;
      }

      console.log(`Processando pagamento concluído para txid: ${txid}, characterName: ${characterName}, Valor: ${valorPago}`);

      try {
        const updatedPayment = await prisma.pixWebhook.updateMany({
          where: { txid: txid },
          data: {
            status: 'COMPLETED',
            payload: JSON.stringify(pix),
          },
        });

        if (updatedPayment.count > 0) {
          console.log(`Status atualizado para COMPLETED no PostgreSQL para txid: ${txid}`);
          const coinsToAdd = 100;

          try {
            const sqliteResult = await runSqliteQuery(
              'UPDATE characters SET coins = coins + ? WHERE name = ?',
              [coinsToAdd, characterName]
            );

            if (sqliteResult.changes > 0) {
              console.log(`${coinsToAdd} coins adicionadas ao characterName ${characterName} no SQLite. Linhas afetadas: ${sqliteResult.changes}`);

            } else {
              console.warn(`Nenhuma linha atualizada no SQLite para characterName ${characterName}. O personagem existe?`);
            }
          } catch (sqliteError: any) {
            console.error(`Erro ao atualizar coins no SQLite para characterName ${characterName}:`, sqliteError.message);
          }

        } else {
          console.log(`Nenhum registro encontrado ou já atualizado no PostgreSQL para txid: ${txid}`);
        }

      } catch (dbError: any) {
        console.error(`Erro ao processar o txid ${txid} no banco de dados:`, dbError.message);
      }
    }

    return NextResponse.json({ message: 'Webhook processado' }, { status: 200 });

  } catch (error: any) {
    console.error('Erro fatal ao processar corpo do webhook:', error.message);
    return NextResponse.json({ message: 'Erro interno ao processar webhook' }, { status: 500 });
  }
}
