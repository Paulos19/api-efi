// Importe os módulos WebSocket e HTTP
const WebSocket = require('ws');
const http = require('http');
const { PrismaClient } = require('@prisma/client'); // Importar Prisma Client
const { run: runSqliteQuery } = require('./lib/sqlite'); // Importar helper SQLite (ajuste o caminho se necessário)

const prisma = new PrismaClient(); // Instanciar Prisma Client
const port = process.env.PORT || 8080;

// --- Servidor HTTP ---
const server = http.createServer(async (req, res) => { // Tornar async para usar await com Prisma
    if (req.method === 'POST' && req.url === '/notify') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });

        req.on('end', async () => { // Tornar async para usar await com Prisma
            try {
                const notificationData = JSON.parse(body);
                console.log('[HTTP Server] Recebido POST em /notify:', notificationData);

                // Verificar se temos o txid na notificação
                const txid = notificationData?.txid;
                if (!txid) {
                    console.warn('[HTTP Server] Notificação recebida sem txid em /notify. Ignorando consulta ao DB.');
                     // Responde sucesso mesmo sem txid para evitar retentativas do webhook
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Notification received but missing txid' }));
                    return;
                }

                // Consultar o status do pagamento no PostgreSQL via Prisma
                try {
                    const paymentRecord = await prisma.pixWebhook.findUnique({
                        where: { txid: txid },
                    });

                    if (paymentRecord && paymentRecord.status === 'COMPLETED') {
                        console.log(`[HTTP Server] Pagamento ${txid} confirmado no DB. Notificando clientes.`);
                        // Enviar mensagem específica para o frontend habilitar o botão
                        broadcast({
                            type: 'payment_verified', // Novo tipo de mensagem
                            txid: paymentRecord.txid,
                            characterName: paymentRecord.characterName // Enviar characterName
                        });
                    } else {
                        console.log(`[HTTP Server] Pagamento ${txid} não encontrado ou não está COMPLETED no DB (Status: ${paymentRecord?.status}). Não notificando.`);
                    }

                } catch (dbError) {
                    console.error(`[HTTP Server] Erro ao consultar PixWebhook para txid ${txid}:`, dbError);
                    // Considerar como lidar com erro de DB (talvez responder 500?)
                }

                // Responde ao webhook que a notificação foi recebida (mesmo que não COMPLETED)
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Notification received and processed' }));

            } catch (error) {
                console.error('[HTTP Server] Erro ao processar /notify:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
            }
        });

        req.on('error', (error) => {
             console.error('[HTTP Server] Erro na requisição /notify:', error);
             res.writeHead(500, { 'Content-Type': 'application/json' });
             res.end(JSON.stringify({ error: 'Internal server error reading request' }));
        });

    } else {
        // Para qualquer outra rota/método, retorna 404
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
    }
});

// --- Servidor WebSocket ---
const wss = new WebSocket.Server({ server });
console.log(`Servidor HTTP e WebSocket iniciado na porta ${port}...`);
const clients = new Set();

wss.on('connection', (ws) => {
    console.log('Cliente WebSocket conectado');
    clients.add(ws);

    ws.on('message', async (message) => { // Tornar async para usar await com SQLite
        try {
            const messageString = message.toString();
            console.log('[WebSocket Server] Mensagem recebida:', messageString);
            const data = JSON.parse(messageString);

            // Lógica para adicionar coins quando o frontend solicitar
            if (data.type === 'add_coins' && data.txid && data.characterName) {
                console.log(`[WebSocket Server] Recebida solicitação para adicionar coins para ${data.characterName} (Txid: ${data.txid})`);

                // Opcional: Revalidar no Prisma se o pagamento ainda está COMPLETED?
                // const paymentRecord = await prisma.pixWebhook.findUnique({ where: { txid: data.txid } });
                // if (!paymentRecord || paymentRecord.status !== 'COMPLETED') {
                //   console.warn(`[WebSocket Server] Pagamento ${data.txid} não está mais COMPLETED. Abortando adição de coins.`);
                //   ws.send(JSON.stringify({ type: 'add_coins_failed', txid: data.txid, reason: 'Payment not completed' }));
                //   return;
                // }

                const coinsToAdd = 100;
                try {
                    const sqliteResult = await runSqliteQuery(
                        'UPDATE characters SET coins = coins + ? WHERE name = ?',
                        [coinsToAdd, data.characterName]
                    );

                    if (sqliteResult.changes > 0) {
                        console.log(`[WebSocket Server] ${coinsToAdd} coins adicionadas para ${data.characterName} no SQLite.`);
                        // Enviar confirmação de volta para o cliente específico
                        ws.send(JSON.stringify({ type: 'coins_added_success', txid: data.txid, characterName: data.characterName, coinsAdded: coinsToAdd }));
                    } else {
                        console.warn(`[WebSocket Server] Nenhuma linha atualizada no SQLite para ${data.characterName}. Personagem existe?`);
                        ws.send(JSON.stringify({ type: 'add_coins_failed', txid: data.txid, characterName: data.characterName, reason: 'Character not found or no update needed' }));
                    }
                } catch (sqliteError) {
                    console.error(`[WebSocket Server] Erro ao adicionar coins no SQLite para ${data.characterName}:`, sqliteError);
                    ws.send(JSON.stringify({ type: 'add_coins_failed', txid: data.txid, characterName: data.characterName, reason: 'Database error' }));
                }
            } else {
                 console.log('[WebSocket Server] Mensagem recebida não é do tipo add_coins ou faltam dados.');
            }

        } catch (error) {
            console.error('[WebSocket Server] Erro ao processar mensagem do cliente:', error);
            // Enviar erro de volta para o cliente específico, se possível
             try {
                 ws.send(JSON.stringify({ type: 'error', message: 'Failed to process your request.' }));
             } catch (sendError) {
                 console.error('[WebSocket Server] Erro ao enviar mensagem de erro para o cliente:', sendError);
             }
        }
    });

    ws.on('close', () => {
        console.log('Cliente WebSocket desconectado');
        clients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error('Erro no WebSocket do cliente:', error);
        clients.delete(ws);
    });

    ws.send(JSON.stringify({ type: 'info', message: 'Conectado ao servidor WebSocket!' }));
});

// Função para enviar broadcast
function broadcast(data) {
    const message = JSON.stringify(data);
    console.log("[WebSocket Server] Broadcasting:", message);
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(message);
            } catch (error) {
                 console.error('[WebSocket Server] Erro ao enviar mensagem para cliente:', error);
                 clients.delete(client);
            }
        }
    });
}

// --- Iniciar o Servidor ---
server.listen(port, () => {
    console.log(`Servidor HTTP escutando na porta ${port}`);
});

server.on('error', (error) => {
    console.error('Erro ao iniciar servidor HTTP:', error);
    if (error.code === 'EADDRINUSE') {
        console.error(`Erro: A porta ${port} já está em uso.`);
        process.exit(1);
    }
});

wss.on('listening', () => {
    console.log(`Servidor WebSocket escutando na porta ${port}`);
});

wss.on('error', (error) => {
    console.error('Erro ao iniciar servidor WebSocket:', error);
    if (error.code === 'EADDRINUSE') {
        console.error(`Erro: A porta ${port} já está em uso.`);
        process.exit(1);
    }
});

console.log('Servidor WebSocket configurado.');

process.stdin.resume();

async function gracefulShutdown(signal) { // Tornar async para usar await
  console.log(`\nRecebido ${signal}. Fechando servidores...`);
  wss.close(() => {
    console.log('Servidor WebSocket fechado.');
    server.close(async () => { // Tornar async para usar await
      console.log('Servidor HTTP fechado.');
      try {
        await prisma.$disconnect(); // Desconectar Prisma
        console.log('Prisma desconectado.');
      } catch (e) {
        console.error('Erro ao desconectar Prisma:', e);
      }
      process.exit(0);
    });
  });

  // Força a saída após um tempo se o fechamento gracioso falhar
  setTimeout(async () => { // Tornar async para usar await
    console.error("Fechamento gracioso falhou, forçando saída.");
     try {
        await prisma.$disconnect(); // Tenta desconectar mesmo assim
     } catch (e) {
        console.error('Erro ao desconectar Prisma na saída forçada:', e);
     }
    process.exit(1);
  }, 5000); // 5 segundos de timeout
}

process.on('SIGINT', gracefulShutdown); // ctrl+c
process.on('SIGTERM', gracefulShutdown); // kill
process.on('uncaughtException', async (err, origin) => { // Tornar async para usar await
  console.error(`Uncaught Exception: ${err}`, `Origin: ${origin}`);
  try {
    await prisma.$disconnect(); // Tenta desconectar
  } catch (e) {
    console.error('Erro ao desconectar Prisma em uncaughtException:', e);
  }
  process.exit(1);
});