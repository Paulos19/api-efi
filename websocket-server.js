// Importe os módulos WebSocket e HTTP
const WebSocket = require('ws');
const http = require('http'); // Adicionado módulo HTTP

const port = process.env.PORT || 8080; // Usar variável de ambiente ou padrão 8080

// --- Servidor HTTP ---
// Cria o servidor HTTP que vai lidar com requisições normais E upgrades para WebSocket
const server = http.createServer((req, res) => {
    // Verifica se é a rota POST /notify
    if (req.method === 'POST' && req.url === '/notify') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString(); // Concatena os chunks do corpo da requisição
        });

        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                console.log('[HTTP Server] Recebido POST em /notify:', data);

                // Chama a função broadcast com os dados recebidos do webhook
                broadcast(data);

                // Responde ao webhook que a notificação foi recebida com sucesso
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Notification received and broadcasted' }));
            } catch (error) {
                console.error('[HTTP Server] Erro ao processar /notify:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' }); // Bad Request se JSON inválido
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
// Anexa o servidor WebSocket ao servidor HTTP existente
const wss = new WebSocket.Server({ server }); // Alterado: usa 'server' em vez de 'port'

console.log(`Servidor HTTP e WebSocket iniciado na porta ${port}...`);

// Armazena os clientes conectados
const clients = new Set();

wss.on('connection', (ws) => {
    console.log('Cliente WebSocket conectado');
    clients.add(ws); // Adiciona o cliente ao conjunto

    ws.on('message', (message) => {
        // Lógica para lidar com mensagens recebidas do cliente (se necessário)
        console.log('Mensagem recebida:', message.toString());

        // Exemplo: Reenviar a mensagem para todos os outros clientes (broadcast)
        // clients.forEach((client) => {
        //   if (client !== ws && client.readyState === WebSocket.OPEN) {
        //     client.send(message.toString());
        //   }
        // });
    });

    ws.on('close', () => {
        console.log('Cliente WebSocket desconectado');
        clients.delete(ws); // Remove o cliente ao desconectar
    });

    ws.on('error', (error) => {
        console.error('Erro no WebSocket do cliente:', error);
        clients.delete(ws); // Remove em caso de erro também
    });

    // Envia uma mensagem de boas-vindas (opcional)
    ws.send(JSON.stringify({ type: 'info', message: 'Conectado ao servidor WebSocket!' }));
});

// Função para enviar broadcast (agora pode ser chamada pelo HTTP handler)
function broadcast(data) {
    const message = JSON.stringify(data);
    console.log("[WebSocket Server] Broadcasting:", message);
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(message);
            } catch (error) {
                 console.error('[WebSocket Server] Erro ao enviar mensagem para cliente:', error);
                 // Remover cliente se houver erro ao enviar?
                 clients.delete(client);
            }
        }
    });
}

// --- Iniciar o Servidor ---
// Faz o servidor HTTP (que agora contém o WebSocket) escutar na porta definida
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


// --- Tratamento de Encerramento (sem alterações) ---
wss.on('listening', () => {
    console.log(`Servidor WebSocket escutando na porta ${port}`);
});

wss.on('error', (error) => {
    console.error('Erro ao iniciar servidor WebSocket:', error);
    // Trata erros comuns como porta já em uso
    if (error.code === 'EADDRINUSE') {
        console.error(`Erro: A porta ${port} já está em uso. Verifique se outro servidor WebSocket (ou este mesmo) já está rodando.`);
        process.exit(1); // Encerra se a porta estiver ocupada
    }
});

console.log('Servidor WebSocket configurado.');

// Mantenha o processo rodando
process.stdin.resume();

function exitHandler(options, exitCode) {
    console.log('Fechando servidor HTTP e WebSocket...');
    wss.close(() => {
         console.log('Servidor WebSocket fechado.');
         server.close(() => {
             console.log('Servidor HTTP fechado.');
             if (options.exit) process.exit(exitCode);
         });
    });
    // Força a saída após um tempo se o fechamento gracioso falhar
    setTimeout(() => {
        console.error("Fechamento gracioso falhou, forçando saída.");
        process.exit(1);
    }, 5000); // 5 segundos de timeout
}

// Limpeza ao sair
process.on('exit', exitHandler.bind(null,{cleanup:true}));
process.on('SIGINT', exitHandler.bind(null, {exit:true})); // ctrl+c
process.on('SIGUSR1', exitHandler.bind(null, {exit:true})); // kill -USR1
process.on('SIGUSR2', exitHandler.bind(null, {exit:true})); // kill -USR2
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    exitHandler(null, {exit:true});
});