// Importações padrão do Node.js
const WebSocket = require('ws'); // Usando require padrão do CommonJS
const http = require('http');
const url = require('url');

// Mapeia conexões WebSocket (usando um Set)
const clients = new Set();

// 1. Criar servidor HTTP
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url ?? '', true);

    // Endpoint para receber notificações do webhook
    if (req.method === 'POST' && parsedUrl.pathname === '/notify') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString(); // Converte buffer para string
        });
        req.on('end', () => {
            try {
                const notificationData = JSON.parse(body);
                console.log('[WebSocket Server] Notificação recebida via HTTP:', notificationData);

                // Verifica se a notificação é de pagamento confirmado e tem os dados necessários
                if (notificationData.type === 'payment_confirmed' && notificationData.txid && notificationData.characterName) {
                    const messageToSend = JSON.stringify({
                        type: 'payment_confirmed',
                        txid: notificationData.txid,
                        characterName: notificationData.characterName,
                        message: 'Pagamento recebido' // Mensagem incluída
                    });

                    console.log(`[WebSocket Server] Enviando mensagem para ${clients.size} clientes: ${messageToSend}`);
                    clients.forEach(client => {
                        // Verifica se o cliente está pronto para receber mensagens
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(messageToSend);
                        }
                    });

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Notificação recebida e encaminhada' }));
                } else {
                     console.warn('[WebSocket Server] Notificação recebida sem dados esperados:', notificationData);
                     res.writeHead(400, { 'Content-Type': 'application/json' });
                     res.end(JSON.stringify({ error: 'Dados inválidos na notificação' }));
                }

            } catch (error) {
                console.error('[WebSocket Server] Erro ao processar notificação HTTP:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Erro interno no servidor WebSocket' }));
            }
        });
    } else {
        // Rota não encontrada para outras requisições HTTP
        res.writeHead(404);
        res.end();
    }
});

// 2. Criar servidor WebSocket e anexá-lo ao servidor HTTP
// Note que WebSocketServer é uma propriedade do módulo 'ws' quando usado com require
const WebSocketServer = WebSocket.Server;
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    console.log('[WebSocket Server] Cliente conectado');
    clients.add(ws); // Adiciona o novo cliente ao conjunto

    ws.on('message', (message) => {
        // Lógica para lidar com mensagens recebidas do cliente (se necessário)
        console.log('[WebSocket Server] Mensagem recebida do cliente:', message.toString());
        try {
            const parsedMessage = JSON.parse(message.toString());
            // Exemplo: Processar mensagens do cliente aqui
        } catch (e) {
            console.error('[WebSocket Server] Erro ao processar mensagem do cliente:', e);
        }
    });

    ws.on('close', () => {
        console.log('[WebSocket Server] Cliente desconectado');
        clients.delete(ws); // Remove o cliente do conjunto ao desconectar
    });

    ws.on('error', (error) => {
        console.error('[WebSocket Server] Erro na conexão WebSocket:', error);
        clients.delete(ws); // Remove em caso de erro também
    });

    // Envia uma mensagem de boas-vindas ou confirmação de conexão (opcional)
    ws.send(JSON.stringify({ type: 'connection_ack', message: 'Conectado ao servidor WebSocket' }));
});

// 3. Iniciar o servidor HTTP (que também gerencia o WebSocket)
const port = process.env.WEBSOCKET_PORT || 8080;
server.listen(port, () => {
    console.log(`[WebSocket Server] Servidor HTTP e WebSocket ouvindo na porta ${port}`);
});