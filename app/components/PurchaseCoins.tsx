"use client";

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Image from 'next/image';

interface PurchaseCoinsProps {
    characterName: string;
    onError: (message: string | null) => void;
    onPaymentSuccess: (txid: string) => void;
}

enum PaymentStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    ERROR = 'ERROR',
}

const PurchaseCoins: React.FC<PurchaseCoinsProps> = ({ characterName, onError, onPaymentSuccess }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [txid, setTxid] = useState<string | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(PaymentStatus.PENDING);
    const ws = useRef<WebSocket | null>(null);

    const purchaseValue = "0.01";

    useEffect(() => {
        if (!txid || paymentStatus === PaymentStatus.COMPLETED) {
            ws.current?.close();
            ws.current = null;
            return;
        }

        const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8080';
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            console.log('WebSocket Conectado');
        };

        ws.current.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('Mensagem WebSocket recebida:', message);

                if (
                    message.type === 'payment_confirmed' &&
                    message.txid === txid &&
                    message.status === PaymentStatus.COMPLETED
                ) {
                    console.log(`Pagamento confirmado para TXID: ${txid}`);
                    setPaymentStatus(PaymentStatus.COMPLETED);
                    onPaymentSuccess(txid);
                    ws.current?.close();
                }
            } catch (error) {
                console.error('Erro ao processar mensagem WebSocket:', error);
            }
        };

        ws.current.onerror = (error) => {
            console.error('Erro no WebSocket:', error);
        };

        ws.current.onclose = () => {
            console.log('WebSocket Desconectado');
            if (!Object.is(paymentStatus, PaymentStatus.COMPLETED)) {
                ws.current = null;
              }
        };

        return () => {
            console.log('Limpando WebSocket...');
            ws.current?.close();
            ws.current = null;
        };
    }, [txid, paymentStatus, onPaymentSuccess]);

    const handlePurchase = async () => {
        setIsLoading(true);
        onError(null);
        setQrCode(null);
        setTxid(null);
        setPaymentStatus(PaymentStatus.PENDING);

        try {
            const response = await axios.post('/api/pix', {
                valor: purchaseValue,
                characterName,
            });
            setQrCode(response.data.qrcode);
            setTxid(response.data.txid);
        } catch (err: any) {
            console.error("Erro ao gerar QR Code:", err);
            onError(err.response?.data?.message || 'Falha ao iniciar o pagamento PIX.');
            setPaymentStatus(PaymentStatus.ERROR);
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

            {(!qrCode || paymentStatus !== PaymentStatus.COMPLETED) && (
                <button
                    onClick={handlePurchase}
                    disabled={isLoading}
                    className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 mb-4"
                >
                    {isLoading ? 'Gerando PIX...' : `Comprar Coins (R$ ${purchaseValue})`}
                </button>
            )}

            {qrCode && paymentStatus === PaymentStatus.PENDING && (
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
                    <div className="animate-pulse mt-2 text-gray-500 dark:text-gray-400">Esperando...</div>
                </div>
            )}

            {paymentStatus === PaymentStatus.COMPLETED && (
                <div className="mt-4 p-4 bg-green-100 dark:bg-green-800 border border-green-300 dark:border-green-600 rounded text-green-700 dark:text-green-200">
                    <h4 className="font-semibold text-lg">Pagamento Confirmado!</h4>
                    <p>As coins foram adicionadas para {characterName}.</p>
                    <p className="text-xs mt-1">TXID: {txid}</p>
                </div>
            )}

            {paymentStatus === PaymentStatus.ERROR && !isLoading && (
                <div className="mt-4 p-4 bg-red-100 dark:bg-red-800 border border-red-300 dark:border-red-600 rounded text-red-700 dark:text-red-200">
                    <h4 className="font-semibold text-lg">Erro no Pagamento</h4>
                    <p>Houve um problema ao processar seu pagamento. Tente novamente.</p>
                </div>
            )}
        </div>
    );
};

export default PurchaseCoins;
