'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Image from 'next/image'; // Mantido, assumindo que o problema anterior foi resolvido ou outra abordagem será usada se persistir

// Interface para os dados do pagamento verificado
interface VerifiedPaymentData {
  txid: string;
  characterName: string;
}

const PurchaseCoins: React.FC = () => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [characterName, setCharacterName] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<string>('idle'); // idle, waiting, verified, adding, success, failed
  const [verifiedPaymentData, setVerifiedPaymentData] = useState<VerifiedPaymentData | null>(null);
  const [generatedTxid, setGeneratedTxid] = useState<string | null>(null); // Estado para armazenar o TXID gerado

  const ws = useRef<WebSocket | null>(null);

  // Efeito para conectar/desconectar WebSocket
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8080';
    // Previne múltiplas conexões em Strict Mode (React 18+)
    if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
        console.log('Tentando conectar ao WebSocket:', wsUrl);
        ws.current = new WebSocket(wsUrl);
        const currentWs = ws.current; // Captura a referência atual para usar nos callbacks

        currentWs.onopen = () => {
          console.log('WebSocket Conectado');
          setError(null); // Limpa erros de conexão anteriores
          // Não resetar status aqui para não interferir com estados existentes (ex: waiting)
        };

        currentWs.onclose = (event) => {
          console.log('WebSocket Desconectado:', event.reason, event.code);
          // Limpa a referência para permitir reconexão se necessário
          // ws.current = null; // Cuidado com StrictMode, pode causar reconexão dupla
          if (!event.wasClean) {
             // Poderia tentar reconectar aqui ou mostrar um erro persistente
             // setError('Conexão WebSocket perdida.');
          }
        };

        currentWs.onerror = (event) => {
          console.error('WebSocket Erro:', event);
          setError('Erro na conexão com o servidor de notificações em tempo real.');
          ws.current = null; // Limpa em caso de erro para possível reconexão
        };

        currentWs.onmessage = (event) => {
          console.log('Mensagem recebida do WebSocket:', event.data); // Log da mensagem bruta
          try {
            const message = JSON.parse(event.data);
            console.log('Mensagem parseada:', message); // Log da mensagem parseada

            // Verifica se é a confirmação de pagamento E se o txid corresponde ao gerado
            if (message.type === 'payment_confirmed' && message.txid && message.characterName && message.txid === generatedTxid) {
              console.log(`Confirmação de pagamento recebida para txid: ${message.txid}, character: ${message.characterName}`);
              setPaymentStatus('verified'); // <<< Define o status para verificado
              setVerifiedPaymentData({ txid: message.txid, characterName: message.characterName });
              setQrCode(null); // Limpa o QR Code
              setError(null);
            } else if (message.type === 'coins_added_success' && message.txid === verifiedPaymentData?.txid) {
              console.log('Confirmação de adição de coins recebida:', message);
              setPaymentStatus('success');
              setVerifiedPaymentData(null); // Limpa dados após sucesso
            } else if (message.type === 'add_coins_failed' && message.txid === verifiedPaymentData?.txid) {
              console.log('Falha na adição de coins recebida:', message);
              setPaymentStatus('failed');
              setError(`Falha ao adicionar coins: ${message.reason || 'Erro desconhecido'}`);
            } else if (message.type === 'error') {
               console.error('Erro recebido do WebSocket:', message.message);
               setError(`Erro do servidor: ${message.message || 'Erro desconhecido'}`);
               // Decide se o erro deve mudar o status geral ou apenas mostrar a mensagem
               // setPaymentStatus('failed');
            } else {
                console.log('Tipo de mensagem desconhecida ou txid não corresponde:', message);
            }
          } catch (e) {
            console.error('Erro ao processar mensagem WebSocket:', e);
            console.error('Mensagem bruta que causou o erro:', event.data);
          }
        };
    }

    // Função de limpeza
    return () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          console.log('Fechando WebSocket na desmontagem...');
          ws.current.close();
      }
      // Não definir ws.current como null aqui para evitar problemas com StrictMode
    };
  // Adiciona generatedTxid e verifiedPaymentData?.txid às dependências
  // para que a lógica dentro de onmessage use os valores mais recentes
  }, [generatedTxid, verifiedPaymentData?.txid]);

  const handleGeneratePix = async () => {
    if (!characterName) {
      setError('Por favor, digite o nome do personagem.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setQrCode(null);
    setPaymentStatus('waiting');
    setVerifiedPaymentData(null);
    setGeneratedTxid(null); // Limpa txid anterior

    try {
      const response = await axios.post('/api/pix', {
        valor: '0.01',
        characterName: characterName,
      });

      console.log('API Response Data:', response.data);

      if (response.data && response.data.qrcode && response.data.txid) {
        // Verifica se o QR Code é uma string base64 válida (opcional mas recomendado)
        if (typeof response.data.qrcode === 'string' && response.data.qrcode.startsWith('data:image/png;base64,')) {
            setQrCode(response.data.qrcode);
            setGeneratedTxid(response.data.txid); // <<< Armazena o TXID gerado
            setError(null); // Limpa erros anteriores
        } else {
            console.error('QR Code recebido não é uma string Base64 válida:', response.data.qrcode);
            setError('Formato inválido de QR Code recebido da API.');
            setPaymentStatus('idle');
        }
      } else {
        console.error('Campos qrcode ou txid não encontrados na resposta da API:', response.data);
        setError('A resposta da API não incluiu dados válidos.');
        setPaymentStatus('idle');
      }

    } catch (err: any) {
      console.error("Erro ao gerar PIX:", err);
      console.error("API Error Response:", err.response?.data);
      setError(err.response?.data?.error || 'Falha ao gerar o QR Code PIX. Tente novamente.');
      setPaymentStatus('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCoins = () => {
    if (!verifiedPaymentData || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
      setError('Não foi possível solicitar a adição de coins. Verifique a conexão.');
      setPaymentStatus('failed'); // Ou talvez voltar para 'verified'?
      return;
    }

    setPaymentStatus('adding');
    setError(null);

    const message = JSON.stringify({
      type: 'add_coins',
      txid: verifiedPaymentData.txid,
      characterName: verifiedPaymentData.characterName,
    });

    console.log('Enviando mensagem add_coins:', message);
    ws.current.send(message);
  };

  // Função para resetar o estado para uma nova compra
  const handleNewPurchase = () => {
    setQrCode(null);
    setIsLoading(false);
    setError(null);
    setCharacterName(''); // Limpa o nome do personagem
    setPaymentStatus('idle');
    setVerifiedPaymentData(null);
    setGeneratedTxid(null);
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-gray-800 text-white rounded-lg shadow-xl border border-gray-700">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-400">Comprar 100 Coins (R$ 0,01)</h2>

      {/* Input para nome do personagem */}
      <div className="mb-5">
        <label htmlFor="characterName" className="block mb-2 text-sm font-medium text-gray-300">Nome do Personagem:</label>
        <input
          type="text"
          id="characterName"
          value={characterName}
          onChange={(e) => setCharacterName(e.target.value)}
          className="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
          placeholder="Digite o nome exato do seu personagem"
          disabled={isLoading || paymentStatus === 'waiting' || paymentStatus === 'verified' || paymentStatus === 'adding' || paymentStatus === 'success'}
        />
      </div>

      {/* Botão Gerar PIX */}
      {paymentStatus === 'idle' && (
        <button
          onClick={handleGeneratePix}
          disabled={isLoading || !characterName}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 ease-in-out"
        >
          {isLoading ? 'Gerando PIX...' : 'Gerar QR Code PIX'}
        </button>
      )}

      {/* Exibição do QR Code e Status */}
      {isLoading && <p className="mt-4 text-center text-gray-400">Carregando...</p>}

      {qrCode && paymentStatus === 'waiting' && (
        <div className="mt-6 p-4 bg-gray-700 rounded-md border border-gray-600 text-center">
          <p className="mb-3 font-semibold">Escaneie o QR Code abaixo para pagar:</p>
          <div className="flex justify-center mb-3">
             {/* Usando Image do Next.js - certifique-se que o base64 está correto */}
             <Image
                src={qrCode}
                alt="QR Code PIX"
                width={220}
                height={220}
                className="bg-white p-1 rounded" // Fundo branco para contraste
                priority // Carregar imagem com prioridade
             />
          </div>
          <p className="mt-3 text-yellow-400 animate-pulse">Aguardando confirmação do pagamento...</p>
          <p className="text-xs text-gray-400 mt-1">(TXID: {generatedTxid})</p>
        </div>
      )}

      {/* Botão Adicionar Coins (habilitado após verificação) */}
      {paymentStatus === 'verified' && verifiedPaymentData && (
        <div className="mt-6 p-4 bg-gray-700 rounded-md border border-green-500 text-center">
          <p className="mb-3 text-green-400 font-bold text-lg">Pagamento confirmado para {verifiedPaymentData.characterName}!</p>
          <button
            onClick={handleAddCoins}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded transition duration-200 ease-in-out"
          >
            Adicionar 100 Coins à Conta
          </button>
        </div>
      )}

      {/* Mensagens de Status Finais */}
       {paymentStatus === 'adding' && (
         <p className="mt-6 text-center text-blue-400 font-semibold">Adicionando coins...</p>
       )}
       {paymentStatus === 'success' && (
         <div className="mt-6 p-4 bg-green-900 border border-green-700 rounded-md text-center">
             <p className="text-green-300 font-bold text-lg">Coins adicionadas com sucesso!</p>
             <button onClick={handleNewPurchase} className="mt-3 text-sm text-blue-400 hover:underline">
                Realizar Nova Compra
             </button>
         </div>
       )}
       {/* Exibe erro geral ou erro específico de falha ao adicionar coins */}
       {(error && (paymentStatus === 'idle' || paymentStatus === 'failed')) && (
         <div className="mt-6 p-4 bg-red-900 border border-red-700 rounded-md text-center">
             <p className="text-red-400 font-semibold">{error}</p>
             {/* Botão para tentar novamente (resetando o estado) */}
             <button onClick={handleNewPurchase} className="mt-3 text-sm text-blue-400 hover:underline">
                Tentar Novamente
             </button>
         </div>
       )}
       {/* Exibe erro de conexão WS separadamente se não houver outro erro */}
       {!error && paymentStatus === 'failed' && (
          <div className="mt-6 p-4 bg-yellow-900 border border-yellow-700 rounded-md text-center">
             <p className="text-yellow-400 font-semibold">Ocorreu um problema. Verifique sua conexão.</p>
             <button onClick={handleNewPurchase} className="mt-3 text-sm text-blue-400 hover:underline">
                Tentar Novamente
             </button>
         </div>
       )}

    </div>
  );
};

export default PurchaseCoins;