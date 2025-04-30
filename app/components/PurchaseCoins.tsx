'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { useChannel } from "@ably-labs/react-hooks";

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

    const [channel] = useChannel(`pix-payments-${generatedTxid}`, (message) => {
        if (message.name === 'payment_confirmed' && message.data.txid === generatedTxid) {
            setPaymentStatus('verified');
            setVerifiedPaymentData({ 
                txid: message.data.txid, 
                characterName: localCharacterName 
            });
            setQrCode(null);
            setError(null);
        }
    });
    const generatedTxidRef = useRef<string | null>(null);

    // Atualiza o nome local quando a prop muda
    useEffect(() => {
        setLocalCharacterName(propCharacterName);
    }, [propCharacterName]);

    useEffect(() => {
        generatedTxidRef.current = generatedTxid;
    }, [generatedTxid]);

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

    const handleConfirmCoins = async () => {
        try {
            const response = await axios.post('/api/coins', {
                characterName: localCharacterName,
                coins: 100
            });
            if (response.data.success) {
                setPaymentStatus('completed');
                setError(null);
            }
        } catch (err: any) {
            setError('Erro ao confirmar coins');
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
            {paymentStatus === 'verified' && (
                <div className="mt-4 p-4 bg-green-800 rounded-lg">
                    <p className="text-green-400">✅ Pagamento confirmado para {verifiedPaymentData?.characterName}!</p>
                    <button
                        onClick={handleConfirmCoins}
                        className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                        Confirmar 100 Coins
                    </button>
                </div>
            )}
            {/* Remover todo o código relacionado ao WebSocket original
            {/* Restante do componente mantido com ajustes similares */}
            
            <div className="mt-6">
              <button
                onClick={handleGeneratePix}
                disabled={isLoading}
                className={`w-full px-6 py-3 rounded font-medium ${
                  isLoading 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                } transition-colors`}
              >
                {isLoading ? 'Gerando QR Code...' : 'Gerar QR Code PIX'}
              </button>
            </div>

            {qrCode && (
              <div className="mt-6 p-4 bg-gray-700 rounded">
                <Image
                  src={qrCode}
                  alt="QR Code PIX"
                  width={300}
                  height={300}
                  className="mx-auto"
                />
                <p className="mt-4 text-sm text-gray-400 text-center">
                  Valor: R$ 0,01 (Valor teste)
                </p>
              </div>
            )}
        </div>
    );
};

export default PurchaseCoins;

