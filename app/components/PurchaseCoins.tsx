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
    // Status: idle, generating, awaiting_payment, COMPLETED, delivering_coins, coins_delivered, error
    const [paymentStatus, setPaymentStatus] = useState<string>('idle');
    const [verifiedPaymentData, setVerifiedPaymentData] = useState<VerifiedPaymentData | null>(null);
    const [generatedTxid, setGeneratedTxid] = useState<string | null>(null);
    // const generatedTxidRef = useRef<string | null>(null); // Ref não parece mais necessária com o polling atualizado

    useEffect(() => {
        setLocalCharacterName(propCharacterName);
        // Reset state if character changes
        setQrCode(null);
        setGeneratedTxid(null);
        setPaymentStatus('idle');
        setError(null);
        setVerifiedPaymentData(null);
    }, [propCharacterName]);

    // useEffect(() => { // Ref não parece mais necessária
    //     generatedTxidRef.current = generatedTxid;
    // }, [generatedTxid]);

    // Polling para verificar o status do pagamento automaticamente
    useEffect(() => {
        if (!generatedTxid || paymentStatus !== 'awaiting_payment') return;

        console.log(`Iniciando polling para TXID: ${generatedTxid}`);
        const interval = setInterval(async () => {
            // Evita chamadas múltiplas se o status já mudou
            if (paymentStatus !== 'awaiting_payment') {
                 clearInterval(interval);
                 return;
            }
            try {
                console.log(`Verificando status para TXID: ${generatedTxid}...`);
                const response = await axios.get(`/api/pix/status/${generatedTxid}`);
                console.log(`Resposta do status:`, response.data);

                if (response.data.status === 'COMPLETED') {
                    console.log(`Pagamento COMPLETED para TXID: ${generatedTxid}`);
                    setPaymentStatus('COMPLETED');
                    setVerifiedPaymentData({
                        txid: generatedTxid,
                        characterName: localCharacterName // Usa o nome do estado local atual
                    });
                    setQrCode(null); // Esconde o QR Code após confirmação
                    setError(null);
                    clearInterval(interval); // Para o polling
                }
                // Se não estiver COMPLETED, continua aguardando (nenhuma ação necessária aqui)
            } catch (error) {
                console.error('Erro ao verificar status no polling:', error);
                // Decide se quer parar o polling em caso de erro ou apenas logar
                // setError('Erro ao verificar status do pagamento. Tente manualmente.');
                // clearInterval(interval);
            }
        }, 5000); // Verifica a cada 5 segundos

        // Função de limpeza para parar o intervalo quando o componente desmontar ou o txid mudar
        return () => {
            console.log(`Limpando intervalo para TXID: ${generatedTxid}`);
            clearInterval(interval);
        }
    // Depende apenas do generatedTxid e do status para iniciar/parar o polling
    }, [generatedTxid, paymentStatus, localCharacterName]);

    const handleGeneratePix = async () => {
        if (!localCharacterName) {
            setError('Digite o nome do personagem');
            onError('Digite o nome do personagem'); // Notifica o pai também
            return;
        }

        setIsLoading(true);
        setPaymentStatus('generating');
        setError(null);
        onError(null); // Limpa erro no pai
        setQrCode(null); // Limpa QR code antigo
        setGeneratedTxid(null); // Limpa TXID antigo

        try {
            const response = await axios.post('/api/pix', {
                valor: '0.01', // Mantenha o valor de teste ou torne-o dinâmico
                characterName: localCharacterName,
            });

            if (response.data?.qrcode && response.data?.txid) {
                setQrCode(response.data.qrcode);
                setGeneratedTxid(response.data.txid);
                setPaymentStatus('awaiting_payment'); // Muda o status para iniciar o polling
                console.log(`QR Code gerado. TXID: ${response.data.txid}. Aguardando pagamento.`);
            } else {
                 throw new Error("Resposta da API PIX inválida.");
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || 'Erro ao gerar PIX';
            setError(errorMessage);
            onError(errorMessage); // Notifica o pai
            setPaymentStatus('error');
            console.error("Erro ao gerar PIX:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // Função para adicionar coins após confirmação do pagamento
    const handleConfirmCoins = async () => {
        if (!verifiedPaymentData) {
            const msg = 'Dados de pagamento verificado não encontrados.';
            setError(msg);
            onError(msg);
            return;
        }
        setPaymentStatus('delivering_coins'); // Indica que está tentando adicionar os coins
        setIsLoading(true); // Reutiliza isLoading para o botão de confirmação
        setError(null);
        onError(null);

        try {
            const response = await axios.post('/api/coins', {
                characterName: verifiedPaymentData.characterName, // Usa o nome armazenado
                coins: 100 // Ou a quantidade correta
            });

            if (response.status === 200 && response.data?.success) {
                setPaymentStatus('coins_delivered'); // Estado final de sucesso
                setError(null);
                console.log(`Coins adicionados com sucesso para ${verifiedPaymentData.characterName}`);
                // Talvez limpar verifiedPaymentData aqui?
            } else {
                throw new Error(response.data?.error || 'Falha ao adicionar coins no servidor');
            }
        } catch (err: any) {
            const errorMessage = 'Erro ao confirmar coins: ' + (err.response?.data?.error || err.message);
            setError(errorMessage);
            onError(errorMessage);
            setPaymentStatus('COMPLETED'); // Volta para o estado anterior para permitir nova tentativa? Ou um estado de erro específico?
            console.error("Erro ao confirmar coins:", err);
        } finally {
             setIsLoading(false);
        }
    };

    // Verificação manual (opcional, já que temos polling)
    const handleCheckStatus = async () => {
        if (!generatedTxid) return;
        setIsLoading(true); // Usa isLoading para o botão de verificar status
        setError(null);
        onError(null);
        try {
            const response = await axios.get(`/api/pix/status/${generatedTxid}`);
            if (response.data.status === 'COMPLETED') {
                setPaymentStatus('COMPLETED');
                setVerifiedPaymentData({
                    txid: generatedTxid,
                    characterName: localCharacterName
                });
                setQrCode(null); // Esconde QR Code
                setError(null);
            } else {
                setError('Pagamento ainda não confirmado. Aguarde ou tente novamente em alguns instantes.');
                // Não notifica o pai sobre "aguardando"
            }
        } catch (error) {
            console.error('Erro ao verificar status manualmente:', error);
            const errorMessage = 'Falha ao verificar status do pagamento.';
            setError(errorMessage);
            onError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Bloco JSX movido para dentro do return principal
    // {paymentStatus === 'completed' && ( ... )} // Bloco removido daqui

    return (
        <div className="p-6 max-w-lg mx-auto bg-gray-800 text-white rounded-lg shadow-xl border border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-center text-blue-400">Comprar 100 Coins (R$ 0,01)</h2>

            {/* Input Nome do Personagem */}
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
                    // Desabilita se estiver carregando ou se o pagamento já foi iniciado/concluído
                    disabled={isLoading || (paymentStatus !== 'idle' && paymentStatus !== 'error')}
                />
            </div>

            {/* Mensagem de Erro */}
            {error && (
                <div className="my-4 p-3 bg-red-800 border border-red-600 rounded-lg text-red-300 text-sm">
                    <p>Erro: {error}</p>
                </div>
            )}

            {/* Status: Pagamento Confirmado, Aguardando Envio de Coins */}
            {paymentStatus === 'COMPLETED' && (
                <div className="mt-4 p-4 bg-yellow-800 rounded-lg text-center">
                    <p className="text-yellow-300 font-semibold">✅ Pagamento confirmado para {verifiedPaymentData?.characterName}!</p>
                    <button
                        onClick={handleConfirmCoins}
                        disabled={isLoading} // Changed: Rely only on isLoading
                        className={`mt-3 px-4 py-2 rounded text-white font-medium transition-colors ${
                            isLoading // Changed: Rely only on isLoading
                            ? 'bg-green-800 cursor-not-allowed opacity-70'
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                    >
                        {isLoading ? 'Enviando Coins...' : `Adicionar 100 Coins`} {/* Changed: Rely only on isLoading */}
                    </button>
                </div>
            )}

             {/* Status: Coins Entregues */}
            {paymentStatus === 'coins_delivered' && (
                <div className="mt-4 p-4 bg-green-800 rounded-lg text-center">
                    <p className="text-green-300 font-semibold">🎉 100 Coins adicionados com sucesso para {verifiedPaymentData?.characterName}!</p>
                     {/* Opcional: Botão para nova compra */}
                     <button
                        onClick={() => {
                            setPaymentStatus('idle');
                            setQrCode(null);
                            setGeneratedTxid(null);
                            setError(null);
                            setVerifiedPaymentData(null);
                        }}
                        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Comprar Novamente
                    </button>
                </div>
            )}

            {/* Botões de Ação - Visíveis apenas antes da confirmação final */}
            {(paymentStatus === 'idle' || paymentStatus === 'awaiting_payment' || paymentStatus === 'generating' || paymentStatus === 'error') && (
                <div className="mt-6 space-y-4">
                    {/* Botão Verificar Status Manual */}
                     <button
                        onClick={handleCheckStatus}
                        // Habilita apenas se um TXID foi gerado e não está carregando outra coisa
                        disabled={!generatedTxid || isLoading || paymentStatus === 'generating'}
                        className={`w-full px-6 py-3 rounded font-medium transition-colors ${
                            (!generatedTxid || isLoading || paymentStatus === 'generating')
                            ? 'bg-gray-600 cursor-not-allowed opacity-50'
                            : 'bg-yellow-600 hover:bg-yellow-700'
                        }`}
                    >
                        {isLoading && paymentStatus !== 'generating' ? 'Verificando...' : 'Verificar Status do Pagamento'}
                    </button>

                    {/* Botão Gerar QR Code */}
                    <button
                        onClick={handleGeneratePix}
                        // Desabilita se estiver carregando ou se já estiver aguardando pagamento
                        disabled={isLoading || paymentStatus === 'awaiting_payment' || paymentStatus === 'generating'}
                        className={`w-full px-6 py-3 rounded font-medium transition-colors ${
                            (isLoading || paymentStatus === 'awaiting_payment' || paymentStatus === 'generating')
                            ? 'bg-blue-800 cursor-not-allowed opacity-70'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {paymentStatus === 'generating' ? 'Gerando QR Code...' : (paymentStatus === 'awaiting_payment' ? 'Aguardando Pagamento...' : 'Gerar Novo QR Code PIX')}
                    </button>
                </div>
            )}

            {/* Exibição do QR Code */}
            {qrCode && paymentStatus === 'awaiting_payment' && (
                <div className="mt-6 p-4 bg-gray-700 rounded text-center">
                     <p className="mb-3 text-sm text-gray-300">Escaneie o QR Code abaixo para pagar:</p>
                    <Image
                        src={qrCode}
                        alt="QR Code PIX"
                        width={250} // Ajuste o tamanho conforme necessário
                        height={250}
                        className="mx-auto rounded"
                        priority // Carrega a imagem com prioridade
                    />
                    <p className="mt-4 text-sm text-gray-400">
                        Valor: R$ 0,01 (Valor teste)
                    </p>
                     <p className="mt-1 text-xs text-gray-500">
                        TXID: {generatedTxid}
                    </p>
                </div>
            )}
        </div>
    );
};

export default PurchaseCoins;