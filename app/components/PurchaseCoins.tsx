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
    const generatedTxidRef = useRef<string | null>(null);

    useEffect(() => {
        setLocalCharacterName(propCharacterName);
    }, [propCharacterName]);

    useEffect(() => {
        generatedTxidRef.current = generatedTxid;
    }, [generatedTxid]);

    useEffect(() => {
        if (!generatedTxid) return;

        const interval = setInterval(async () => {
            try {
                const response = await axios.get(`/api/pix/status/${generatedTxid}`);
                
                if (response.data.status === 'confirmed') {
                    setPaymentStatus('verified');
                    setVerifiedPaymentData({ 
                        txid: generatedTxid,
                        characterName: localCharacterName
                    });
                    setQrCode(null);
                    clearInterval(interval);
                }
            } catch (error) {
                console.error('Erro ao verificar status:', error);
            }
        }, 5000);

        return () => clearInterval(interval);
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

    const handleCheckStatus = async () => {
        try {
            const response = await axios.get(`/api/pix/status/${generatedTxid}`);
            if (response.data.status === 'COMPLETED') {
                setPaymentStatus('completed');
            }
        } catch (error) {
            console.error('Erro ao verificar status:', error);
            setError('Falha ao verificar status do pagamento');
        }
    };

    // Adicione este bloco de JSX antes do botão "Gerar QR Code PIX"
    {paymentStatus === 'completed' && (
        <div className="mt-4 p-4 bg-green-800 rounded-lg">
            <p className="text-green-400">✅ Pagamento completo!</p>
            <button
                onClick={handleConfirmCoins}
                className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
                Enviar 100 Coins para {localCharacterName}
            </button>
        </div>
    )}

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

            {paymentStatus === 'COMPLETED' && (
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
            
            <div className="mt-6 space-y-4">
                <button
                    onClick={handleCheckStatus}
                    disabled={!generatedTxid}
                    className={`w-full px-6 py-3 rounded font-medium ${
                        !generatedTxid 
                        ? 'bg-gray-500 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    } transition-colors`}
                >
                    Verificar Status
                </button>
                
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