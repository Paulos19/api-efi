// Importe o módulo WebSocket
const WebSocket = require('ws'); // Use require em um arquivo .js padrão

const port = 8080;
// Crie o servidor WebSocket
const wss = new WebSocket.Server({ port });

console.log(`Servidor WebSocket iniciado na porta ${port}...`);

// Armazena os clientes conectados (opcional, mas útil)
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

// Função para enviar broadcast (pode ser chamada de outras partes se necessário,
// mas neste modelo simples, o broadcast pode ocorrer dentro do 'message' handler)
function broadcast(data) {
    const message = JSON.stringify(data);
    console.log("Broadcasting:", message);
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Exemplo de como usar o broadcast (você precisará de um gatilho real)
// setInterval(() => {
//   broadcast({ type: 'ping', timestamp: Date.now() });
// }, 10000); // Envia um ping a cada 10 segundos

console.log('Servidor WebSocket configurado.');

// Mantenha o processo rodando
process.stdin.resume();

function exitHandler(options, exitCode) {
    console.log('Fechando servidor WebSocket...');
    wss.close();
    if (options.exit) process.exit();
}

// Limpeza ao sair
process.on('exit', exitHandler.bind(null,{cleanup:true}));
process.on('SIGINT', exitHandler.bind(null, {exit:true})); // ctrl+c
process.on('SIGUSR1', exitHandler.bind(null, {exit:true})); // kill -USR1
process.on('SIGUSR2', exitHandler.bind(null, {exit:true})); // kill -USR2
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));