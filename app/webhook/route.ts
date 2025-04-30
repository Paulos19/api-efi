import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { run as runSqliteQuery } from '@/lib/sqlite';
import axios from 'axios'; // Importar axios para fazer a chamada HTTP

const prisma = new PrismaClient();

// URL do endpoint de notificação no seu servidor WebSocket (ajuste se necessário)
const WEBSOCKET_NOTIFY_URL = process.env.WEBSOCKET_NOTIFY_URL || 'http://localhost:8080/notify'; // Exemplo

async function notifyWebSocketServer(data: any) {
  try {
    // Envia uma requisição POST para o servidor WebSocket notificá-lo
    await axios.post(WEBSOCKET_NOTIFY_URL, data);
    console.log(`[Webhook] Notificação enviada para WebSocket Server:`, data);
  } catch (error: any) {
    console.error(`[Webhook] Erro ao notificar WebSocket Server:`, error.message);
    // Decida como lidar com falhas na notificação (ex: log, retry)
  }
}


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
      // O status real de conclusão vem da Gerencianet, assumindo 'CONCLUIDO' aqui
      const status = 'CONCLUIDO'; // Use o status real se disponível no payload

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
        // Tentativa de buscar characterName no banco se não veio no webhook
        try {
            const paymentRecord = await prisma.pixWebhook.findUnique({
                where: { txid: txid },
                // Inclua o campo characterName se ele existir no seu modelo Prisma
                // select: { characterName: true } // Descomente e ajuste se necessário
            });
            // characterName = paymentRecord?.characterName; // Descomente e ajuste
            if (!characterName) {
                 console.warn(`Webhook para txid ${txid} sem characterName e não encontrado no DB.`);
                 // Você pode querer registrar o pagamento mesmo sem characterName aqui
                 // ou pular se o characterName for essencial para a lógica de negócio.
                 // Por ora, vamos pular se não achar o characterName.
                 continue;
            }
        } catch (findError: any) {
             console.error(`Erro ao buscar characterName para txid ${txid}:`, findError.message);
             continue; // Pula este PIX se não conseguir buscar info
        }
      }


      console.log(`Processando pagamento concluído para txid: ${txid}, characterName: ${characterName}, Valor: ${valorPago}`);

      try {
        // Atualiza o registro no PostgreSQL para COMPLETED
        const updatedPayment = await prisma.pixWebhook.updateMany({
          where: { txid: txid, status: { not: 'COMPLETED' } }, // Evita atualizações repetidas
          data: {
            status: 'COMPLETED', // Status final
            payload: JSON.stringify(pix), // Salva o payload completo recebido
            endToEndId: pix.endToEndId || '', // Garante que o endToEndId seja salvo
            horario: pix.horario ? new Date(pix.horario) : new Date(), // Usa o horário do PIX ou atual
          },
        });

        if (updatedPayment.count > 0) {
          console.log(`Status atualizado para COMPLETED no PostgreSQL para txid: ${txid}`);
          const coinsToAdd = 100; // Ou calcule baseado no valorPago

          try {
            // Atualiza as coins no SQLite
            const sqliteResult = await runSqliteQuery(
              'UPDATE characters SET coins = coins + ? WHERE name = ?',
              [coinsToAdd, characterName]
            );

            if (sqliteResult.changes > 0) {
              console.log(`${coinsToAdd} coins adicionadas ao characterName ${characterName} no SQLite.`);
              // Notifica o servidor WebSocket APÓS sucesso em AMBOS os bancos
              await notifyWebSocketServer({
                type: 'payment_confirmed',
                txid: txid,
                characterName: characterName,
                status: 'COMPLETED'
              });

            } else {
              console.warn(`Nenhuma linha atualizada no SQLite para characterName ${characterName}. O personagem existe?`);
              // Considerar se deve notificar o WebSocket mesmo assim ou tratar como erro parcial
            }
          } catch (sqliteError: any) {
            console.error(`Erro ao atualizar coins no SQLite para characterName ${characterName}:`, sqliteError.message);
            // Considerar o que fazer em caso de falha no SQLite (rollback? log?)
          }

        } else {
          console.log(`Nenhum registro pendente encontrado ou já atualizado no PostgreSQL para txid: ${txid}`);
          // Se já estava COMPLETED, talvez reenviar notificação? Ou ignorar.
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
