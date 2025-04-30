"use client";

import React, { useState } from 'react';
import axios from 'axios';
import Image from 'next/image'; // Para exibir o QR Code

interface PurchaseCoinsProps {
    characterName: string;
    onError: (message: string | null) => void;
}

const PurchaseCoins: React.FC<PurchaseCoinsProps> = ({ characterName, onError }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [txid, setTxid] = useState<string | null>(null);

    // Valor fixo para a compra de 100 coins (ajuste se necessário)
    const purchaseValue = "1.00"; // Exemplo: R$ 1,00 para 100 coins

    const handlePurchase = async () => {
        setIsLoading(true);
        onError(null);
        setQrCode(null);
        setTxid(null);

        try {
            const response = await axios.post('/api/pix', {
                valor: purchaseValue,
                characterName: characterName, // Envia o nome do personagem selecionado
            });
            setQrCode(response.data.qrcode);
            setTxid(response.data.txid);
        } catch (err: any) {
            console.error("Erro ao gerar QR Code:", err);
            onError(err.response?.data?.message || 'Falha ao iniciar o pagamento PIX.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 border rounded bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-center">
            <h3 className="text-lg font-semibold mb-4">Comprar 100 Coins para {characterName}</h3>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Clique no botão abaixo para gerar um QR Code PIX no valor de R$ {purchaseValue}.
            </p>
            <button
                onClick={handlePurchase}
                disabled={isLoading}
                className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 mb-4"
            >
                {isLoading ? 'Gerando PIX...' : 'Comprar Coins (R$ 1,00)'}
            </button>

            {qrCode && (
                <div className="mt-4 flex flex-col items-center">
                    <h4 className="font-medium mb-2">Pague com PIX:</h4>
                    <Image
                        src={qrCode}
                        alt="QR Code PIX"
                        width={200}
                        height={200}
                        className="border rounded"
                    />
                    <p className="text-xs mt-2 text-gray-500 dark:text-gray-400">TXID: {txid}</p>
                    <p className="mt-2 text-sm font-medium">Aguardando confirmação do pagamento...</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">(Você receberá uma notificação aqui quando o pagamento for confirmado)</p>
                </div>
            )}
        </div>
    );
};

export default PurchaseCoins;