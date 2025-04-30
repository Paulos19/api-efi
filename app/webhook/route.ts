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
  let txidToLog = 'N/A'; // Para logs de erro antes de obter o txid
  try {
    const notification = await req.json();
    console.log('Webhook recebido:', JSON.stringify(notification, null, 2));

    if (!notification || !notification.pix || !Array.isArray(notification.pix) || notification.pix.length === 0) {
      console.warn('Formato de webhook inválido ou sem dados Pix recebido.');
      // Retornar 200 para a Gerencianet não reenviar indefinidamente
      return NextResponse.json({ message: 'Webhook recebido, formato inválido ou vazio.' }, { status: 200 });
    }

    // Processar cada PIX na notificação (geralmente vem um)
    for (const pix of notification.pix) {
      const txid = pix.txid;
      txidToLog = txid || 'N/A'; // Atualiza para log
      const valorPago = parseFloat(pix.valor);
      const endToEndId = pix.endToEndId;
      const horarioPix = pix.horario ? new Date(pix.horario) : new Date();
      // Assumir CONCLUIDO se o webhook foi chamado para este PIX
      const status = 'CONCLUIDO';

      if (!txid) {
        console.warn('Webhook Pix sem txid:', pix);
        continue; // Pula este PIX inválido
      }

      // Tentar obter characterName do payload do webhook primeiro
      let characterName: string | undefined;
      if (pix.infoAdicionais && Array.isArray(pix.infoAdicionais)) {
        const info = pix.infoAdicionais.find((item: { nome: string; valor: string }) => item.nome === 'characterName');
        characterName = info?.valor;
      }

      // Buscar o registro no banco para confirmar e obter characterName se não veio no webhook
      const paymentRecord = await prisma.pixWebhook.findUnique({
        where: { txid: txid },
      });

      if (!paymentRecord) {
        console.warn(`[Webhook] Registro não encontrado no DB para txid: ${txid}. O PIX foi iniciado pela nossa API?`);
        continue; // Pula se não achou o registro inicial
      }

      // Usar o characterName do banco se não veio no webhook
      if (!characterName) {
        characterName = paymentRecord.characterName ?? undefined;
      }

      if (!characterName) {
        console.warn(`[Webhook] Não foi possível determinar o characterName para txid: ${txid}. Pulando adição de coins.`);
        // Ainda assim, atualiza o status do pagamento no Postgres
        try {
           await prisma.pixWebhook.update({
             where: { txid: txid },
             data: {
               status: status,
               payload: pix, // Salva o payload completo
               endToEndId: endToEndId,
               horario: horarioPix,
             },
           });
           console.log(`[Webhook] Status atualizado para ${status} (sem characterName) no PostgreSQL para txid: ${txid}`);
        } catch (dbError: any) {
           console.error(`[Webhook] Erro ao atualizar status (sem characterName) para txid ${txid}:`, dbError.message);
        }
        continue; // Pula a parte de adicionar coins
      }

      // Se o pagamento já foi processado, evitar reprocessamento
      if (paymentRecord.status === 'COMPLETED') {
          console.log(`[Webhook] Pagamento para txid: ${txid} já estava como COMPLETED. Ignorando.`);
          continue;
      }

      console.log(`[Webhook] Processando pagamento ${status} para txid: ${txid}, characterName: ${characterName}, Valor: ${valorPago}`);

      // Atualiza o registro no PostgreSQL para COMPLETED
      const updatedPayment = await prisma.pixWebhook.update({
        where: { txid: txid },
        data: {
          status: 'COMPLETED', // Status final
          payload: pix, // Salva o payload completo recebido
          endToEndId: endToEndId,
          horario: horarioPix,
          characterName: characterName, // Garante que está salvo
        },
      });

      console.log(`[Webhook] Status atualizado para COMPLETED no PostgreSQL para txid: ${txid}`);
      const coinsToAdd = 100; // Ou calcule baseado no valorPago

      try {
        // Atualiza as coins no SQLite
        const sqliteResult = await runSqliteQuery(
          'UPDATE characters SET coins = coins + ? WHERE name = ?',
          [coinsToAdd, characterName]
        );

        if (sqliteResult.changes > 0) {
          console.log(`[Webhook] ${coinsToAdd} coins adicionadas ao characterName ${characterName} no SQLite.`);
          // Notifica o servidor WebSocket APÓS sucesso em AMBOS os bancos
          await notifyWebSocketServer({
            type: 'payment_confirmed',
            txid: txid,
            characterName: characterName,
            status: 'COMPLETED'
          });

        } else {
          console.warn(`[Webhook] Nenhuma linha atualizada no SQLite para characterName ${characterName}. O personagem existe? Txid: ${txid}`);
          // Considerar se deve notificar o WebSocket mesmo assim ou tratar como erro parcial
        }
      } catch (sqliteError: any) {
        console.error(`[Webhook] Erro ao atualizar coins no SQLite para characterName ${characterName} (Txid: ${txid}):`, sqliteError.message);
        // Considerar o que fazer em caso de falha no SQLite (rollback? log?)
      }

    } // Fim do loop for (const pix of notification.pix)

    // Retornar 200 OK para a Gerencianet após processar todos os PIX válidos
    return NextResponse.json({ message: 'Webhook processado' }, { status: 200 });

  } catch (error: any) {
    console.error(`[Webhook] Erro fatal ao processar webhook (Txid: ${txidToLog}):`, error.message, error.stack);
    // Retornar 500 em caso de erro inesperado no processamento geral
    return NextResponse.json({ message: 'Erro interno ao processar webhook' }, { status: 500 });
  } finally {
     await prisma.$disconnect(); // Boa prática desconectar o Prisma
  }
}
