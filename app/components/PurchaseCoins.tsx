'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Image from 'next/image';

// Interface para os dados do pagamento verificado
interface VerifiedPaymentData {
  txid: string;
  characterName: string;
}

const PurchaseCoins: React.FC = () => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [characterName, setCharacterName] = useState(''); // Estado para o nome do personagem
  const [paymentStatus, setPaymentStatus] = useState<string>('idle'); // idle, waiting, verified, adding, success, failed
  const [verifiedPaymentData, setVerifiedPaymentData] = useState<VerifiedPaymentData | null>(null); // Armazena dados para adicionar coins

  const ws = useRef<WebSocket | null>(null); // Referência para o WebSocket

  // Efeito para conectar/desconectar WebSocket
  useEffect(() => {
    // Conecta ao servidor WebSocket
    // Certifique-se que a URL está correta (ws:// ou wss:// para produção com HTTPS)
    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8080';
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket Conectado');
      setPaymentStatus('idle'); // Reset status on connect
    };

    ws.current.onclose = () => {
      console.log('WebSocket Desconectado');
      // Opcional: tentar reconectar ou mostrar mensagem
    };

    ws.current.onerror = (event) => {
      console.error('WebSocket Erro:', event);
      setError('Erro na conexão com o servidor de notificações.');
    };

    // Listener para mensagens recebidas do servidor WebSocket
    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Mensagem recebida do WebSocket:', message);

        // Verifica se o pagamento foi confirmado pelo servidor
        if (message.type === 'payment_verified' && message.txid && message.characterName) {
          setPaymentStatus('verified');
          setVerifiedPaymentData({ txid: message.txid, characterName: message.characterName });
          setQrCode(null); // Limpa o QR Code após confirmação
          setError(null);
        } else if (message.type === 'coins_added_success') {
          setPaymentStatus('success');
          setVerifiedPaymentData(null); // Limpa dados após sucesso
          // Opcional: Atualizar saldo de coins na UI se necessário
        } else if (message.type === 'add_coins_failed') {
          setPaymentStatus('failed');
          setError(`Falha ao adicionar coins: ${message.reason || 'Erro desconhecido'}`);
        } else if (message.type === 'error') {
           setError(`Erro do servidor: ${message.message || 'Erro desconhecido'}`);
           setPaymentStatus('failed'); // Considerar como falha
        }
      } catch (e) {
        console.error('Erro ao processar mensagem WebSocket:', e);
      }
    };

    // Função de limpeza para fechar a conexão ao desmontar o componente
    return () => {
      ws.current?.close();
    };
  }, []); // Executa apenas uma vez na montagem

  const handleGeneratePix = async () => {
    if (!characterName) {
      setError('Por favor, digite o nome do personagem.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setQrCode(null);
    setPaymentStatus('waiting'); // Define o status como esperando pagamento
    setVerifiedPaymentData(null); // Limpa dados anteriores

    try {
      // Chama a API para gerar o PIX, passando nome e valor
      const response = await axios.post('/api/pix', {
        valor: '0.01', // Valor fixo ou dinâmico
        characterName: characterName,
      });

      // Adicione este log para verificar a resposta da API
      console.log('API Response Data:', response.data);

      // Verifica se qrCode existe na resposta antes de definir
      if (response.data && response.data.qrcode) {
        setQrCode(response.data.qrcode);
      } else {
        console.error('Campo qrCode não encontrado na resposta da API:', response.data);
        setError('A resposta da API não incluiu um QR Code válido.');
        setPaymentStatus('idle'); // Volta ao estado inicial
      }

    } catch (err: any) {
      console.error("Erro ao gerar PIX:", err);
      // Adicione log do erro específico da API se disponível
      console.error("API Error Response:", err.response?.data);
      setError(err.response?.data?.error || 'Falha ao gerar o QR Code PIX. Tente novamente.');
      setPaymentStatus('idle'); // Volta ao estado inicial em caso de erro
    } finally {
      setIsLoading(false);
    }
  };

  // Função para enviar a solicitação de adicionar coins via WebSocket
  const handleAddCoins = () => {
    if (!verifiedPaymentData || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
      setError('Não foi possível solicitar a adição de coins. Verifique a conexão.');
      setPaymentStatus('failed');
      return;
    }

    setPaymentStatus('adding'); // Define o status como adicionando
    setError(null);

    const message = JSON.stringify({
      type: 'add_coins',
      txid: verifiedPaymentData.txid,
      characterName: verifiedPaymentData.characterName,
    });

    console.log('Enviando mensagem add_coins:', message);
    ws.current.send(message);
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-gray-800 text-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Comprar 100 Coins (R$ 0,01)</h2>

      {/* Input para nome do personagem */}
      <div className="mb-4">
        <label htmlFor="characterName" className="block mb-1">Nome do Personagem:</label>
        <input
          type="text"
          id="characterName"
          value={characterName}
          onChange={(e) => setCharacterName(e.target.value)}
          className="w-full p-2 rounded bg-gray-700 border border-gray-600"
          placeholder="Digite o nome do seu personagem"
          disabled={isLoading || paymentStatus === 'waiting' || paymentStatus === 'verified' || paymentStatus === 'adding'}
        />
      </div>

      {/* Botão Gerar PIX */}
      {!qrCode && paymentStatus !== 'verified' && paymentStatus !== 'adding' && paymentStatus !== 'success' && (
        <button
          onClick={handleGeneratePix}
          disabled={isLoading || !characterName}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {isLoading ? 'Gerando PIX...' : 'Gerar QR Code PIX'}
        </button>
      )}

      {/* Exibição do QR Code e Status */}
      {isLoading && <p className="mt-4 text-center">Carregando...</p>}
      {error && <p className="mt-4 text-red-500 text-center">{error}</p>}
      {qrCode && paymentStatus === 'waiting' && (
        <div className="mt-4 text-center">
          <p className="mb-2">Escaneie o QR Code abaixo para pagar:</p>
          <Image src={qrCode} alt="QR Code PIX" width={200} height={200} className="mx-auto" />
          <p className="mt-2 text-yellow-400">Aguardando confirmação do pagamento...</p>
        </div>
      )}

      {/* Botão Adicionar Coins (habilitado após verificação) */}
      {paymentStatus === 'verified' && verifiedPaymentData && (
        <div className="mt-4 text-center">
          <p className="mb-2 text-green-500 font-bold">Pagamento confirmado para {verifiedPaymentData.characterName}!</p>
          <button
            onClick={handleAddCoins}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Adicionar 100 Coins
          </button>
        </div>
      )}

      {/* Mensagens de Status */}
       {paymentStatus === 'adding' && (
         <p className="mt-4 text-center text-blue-400">Adicionando coins...</p>
       )}
       {paymentStatus === 'success' && (
         <p className="mt-4 text-center text-green-500 font-bold">Coins adicionadas com sucesso!</p>
         // Opcional: Botão para nova compra
         // <button onClick={() => { setPaymentStatus('idle'); setCharacterName(''); }} className="mt-2 text-sm text-blue-400 underline">Nova Compra</button>
       )}
       {paymentStatus === 'failed' && error && (
         <p className="mt-4 text-center text-red-500">{error}</p>
         // Opcional: Botão para tentar novamente ou nova compra
       )}

    </div>
  );
};

export default PurchaseCoins;
