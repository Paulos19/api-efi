"use client";

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import LoginForm from '../components/LoginForm'; // Opcional
import RegisterForm from '../components/RegisterForm';
import CharacterList from '../components/CharacterList';
import PurchaseCoins from '../components/PurchaseCoins';
import NotificationModal from '../components/NotificationModal';

// Interfaces para tipagem
interface User {
    id: number;
    name: string;
}

interface Character {
    name: string;
    classname: string | null;
    level: number | null;
    coins: number | null;
}

export default function DashboardPage() {
    const [user, setUser] = useState<User | null>(null);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
    const [showRegister, setShowRegister] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ type: string; message: string } | null>(null);

    // --- WebSocket Connection ---
    useEffect(() => {
        // A URL do WebSocket deve corresponder à porta definida no backend (webhook/route.ts)
        const wsUrl = 'ws://localhost:8080';
        let ws: WebSocket | null = null;
        let reconnectInterval: NodeJS.Timeout | null = null;

        const connectWebSocket = () => {
            console.log('Tentando conectar ao WebSocket...');
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('WebSocket conectado');
                setError(null); // Limpa erros de conexão anteriores
                if (reconnectInterval) {
                    clearInterval(reconnectInterval);
                    reconnectInterval = null;
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data as string);
                    console.log('Mensagem WebSocket recebida:', data);
                    // Altere 'payment_success' para 'payment_confirmed'
                    if (data.type === 'payment_confirmed') {
                        // Use a mensagem que vem do servidor WebSocket ou defina uma padrão
                        const message = data.message || `Pagamento para ${data.characterName} confirmado!`;
                        setNotification({ type: 'success', message: message });
                        // Opcional: Atualizar a lista de personagens para refletir as novas coins
                        if (user) {
                            fetchCharacters(user.name);
                        }
                    }
                    // Adicione outros tipos de mensagem se necessário
                } catch (e) {
                    console.error('Erro ao processar mensagem WebSocket:', e);
                }
            };

            ws.onerror = (event) => {
                console.error('Erro no WebSocket:', event);
                setError('Não foi possível conectar ao servidor de notificações.');
                // Tenta reconectar após um tempo
                if (!reconnectInterval) {
                    reconnectInterval = setInterval(connectWebSocket, 5000); // Tenta a cada 5 segundos
                }
            };

            ws.onclose = () => {
                console.log('WebSocket desconectado');
                // Tenta reconectar se não for uma desconexão intencional
                if (!reconnectInterval) {
                   reconnectInterval = setInterval(connectWebSocket, 5000);
                }
            };
        };

        connectWebSocket();

        // Limpeza ao desmontar o componente
        return () => {
            if (reconnectInterval) clearInterval(reconnectInterval);
            ws?.close();
            console.log('Conexão WebSocket fechada.');
        };
    }, [user]); // Reconecta se o usuário mudar (ou ao logar)

    // --- Funções de Autenticação e Dados ---
    const fetchCharacters = useCallback(async (accountName: string) => {
        setIsLoading(true);
        setError(null);
        try {
            // Passa o nome da conta como query parameter
            const response = await axios.get(`/api/characters?accountName=${encodeURIComponent(accountName)}`);
            setCharacters(response.data);
            setSelectedCharacter(null); // Reseta personagem selecionado ao buscar novos
        } catch (err: any) {
            console.error("Erro ao buscar personagens:", err);
            setError(err.response?.data?.message || 'Falha ao buscar personagens.');
            setCharacters([]); // Limpa personagens em caso de erro
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleLoginSuccess = (loggedInUser: User) => {
        setUser(loggedInUser);
        setShowRegister(false);
        setError(null);
        fetchCharacters(loggedInUser.name); // Busca personagens após login
    };

    const handleLogout = () => {
        setUser(null);
        setCharacters([]);
        setSelectedCharacter(null);
        setError(null);
        // Opcional: Desconectar WebSocket ou limpar estado relacionado
    };

    const handleRegisterSuccess = () => {
        setShowRegister(false); // Volta para a tela de login após registro
        setError(null);
        alert('Cadastro realizado com sucesso! Faça o login.');
    };

    const handleSelectCharacter = (character: Character) => {
        setSelectedCharacter(character);
    };

    // --- Renderização ---
    return (
        <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

            {error && <p className="text-red-500 mb-4">Erro: {error}</p>}

            {!user ? (
                // --- Tela de Login/Registro ---
                <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded shadow-md">
                    {showRegister ? (
                        <>
                            <RegisterForm onRegisterSuccess={handleRegisterSuccess} onError={setError} />
                            <button onClick={() => setShowRegister(false)} className="mt-4 text-sm text-blue-600 hover:underline">
                                Já tem uma conta? Faça login
                            </button>
                        </>
                    ) : (
                        <>
                            <LoginForm onLoginSuccess={handleLoginSuccess} onError={setError} />
                            <button onClick={() => setShowRegister(true)} className="mt-4 text-sm text-blue-600 hover:underline">
                                Não tem uma conta? Cadastre-se
                            </button>
                        </>
                    )}
                </div>
            ) : (
                // --- Tela do Dashboard Logado ---
                <div className="w-full max-w-4xl bg-white dark:bg-gray-800 p-8 rounded shadow-md">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold">Bem-vindo, {user.name}!</h2>
                        <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                            Logout
                        </button>
                    </div>

                    {isLoading ? (
                        <p>Carregando personagens...</p>
                    ) : characters.length > 0 ? (
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Coluna da Lista de Personagens */}
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Seus Personagens</h3>
                                <CharacterList
                                    characters={characters}
                                    // Use ?? null to convert undefined to null
                                    selectedCharacterName={selectedCharacter?.name ?? null}
                                    onSelectCharacter={handleSelectCharacter}
                                />
                            </div>

                            {/* Coluna de Compra */}
                            <div>
                                {selectedCharacter ? (
                                    <PurchaseCoins characterName={selectedCharacter.name} onError={setError} />
                                ) : (
                                    <p className="text-gray-500 mt-10 text-center">Selecione um personagem para comprar coins.</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p>Você ainda não tem personagens criados nesta conta.</p>
                    )}
                </div>
            )}

            {/* Modal de Notificação (Opcional) */}
            {notification && (
                <NotificationModal
                    type={notification.type as 'success' | 'error'} // Ajuste os tipos conforme necessário
                    message={notification.message}
                    onClose={() => setNotification(null)}
                />
            )}
        </div>
    );
}