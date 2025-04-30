'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Image from 'next/image';

interface VerifiedPaymentData {
  txid: string;
  characterName: string;
}

interface PurchaseCoinsProps {
    characterName: string;
    onError: (error: string | null) => void;
}

const PurchaseCoins: React.FC<PurchaseCoinsProps> = ({ characterName: propCharacterName, onError }) => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localCharacterName, setLocalCharacterName] = useState(propCharacterName);
  const [paymentStatus, setPaymentStatus] = useState<string>('idle');
  const [verifiedPaymentData, setVerifiedPaymentData] = useState<VerifiedPaymentData | null>(null);
  const [generatedTxid, setGeneratedTxid] = useState<string | null>(null);

  const ws = useRef<WebSocket | null>(null);

  // Atualiza o nome local quando a prop muda
  useEffect(() => {
    setLocalCharacterName(propCharacterName);
  }, [propCharacterName]);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8080';
    
    if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
        ws.current = new WebSocket(wsUrl);
        const currentWs = ws.current;

        currentWs.onopen = () => {
          setError(null);
        };

        currentWs.onclose = (event) => {
          if (!event.wasClean) {
             setError('Conexão com o servidor perdida');
          }
        };

        currentWs.onerror = () => {
          setError('Erro na conexão com o servidor');
        };

        currentWs.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            if (message.type === 'payment_confirmed' && message.txid === generatedTxid) {
              setPaymentStatus('verified');
              setVerifiedPaymentData({ 
                txid: message.txid, 
                characterName: localCharacterName 
              });
              setQrCode(null);
              setError(null);
            }
            // ... restante do código do WebSocket
          } catch (e) {
            console.error('Erro ao processar mensagem:', e);
          }
        };
    }

    return () => {
      ws.current?.close();
    };
  }, [generatedTxid, localCharacterName]);

  const handleGeneratePix = async () => {
    if (!localCharacterName) {
      setError('Digite o nome do personagem');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post('/api/pix', {
        valor: '0.01',
        characterName: localCharacterName,
      });

      if (response.data?.qrcode) {
        setQrCode(response.data.qrcode);
        setGeneratedTxid(response.data.txid);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao gerar PIX');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-gray-800 text-white rounded-lg shadow-xl border border-gray-700">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-400">Comprar 100 Coins (R$ 0,01)</h2>

      <div className="mb-5">
        <label htmlFor="characterName" className="block mb-2 text-sm font-medium text-gray-300">
          Nome do Personagem:
        </label>
        <input
          type="text"
          id="characterName"
          value={localCharacterName}
          onChange={(e) => setLocalCharacterName(e.target.value)}
          className="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
          placeholder="Digite o nome exato do seu personagem"
          disabled={isLoading}
        />
      </div>

      {/* Restante do componente mantido com ajustes similares */}
    </div>
  );
};

export default PurchaseCoins;