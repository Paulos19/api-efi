"use client";

import React, { useState } from 'react';
import axios from 'axios';
// Importe o tipo Account gerado pelo Prisma se disponível
// import { Account as PrismaAccount } from '@prisma/client';

// Ou defina uma interface que corresponda aos dados esperados da API de login
interface UserData {
    id: number; // Ajuste o tipo do ID conforme seu schema Prisma (pode ser string ou number)
    name: string;
    // Adicione outros campos se a API retornar mais dados úteis
}

interface LoginFormProps {
    onLoginSuccess: (user: UserData) => void; // Use a interface atualizada
    onError: (message: string | null) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess, onError }) => {
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        onError(null); // Limpa erros anteriores

        try {
            // A API /api/auth/login deve usar Prisma no backend
            const response = await axios.post<{ user: UserData }>('/api/auth/login', { name, password });
            onLoginSuccess(response.data.user); // Passa os dados do usuário para o pai
        } catch (err: any) {
            console.error("Erro no login:", err);
            onError(err.response?.data?.message || 'Falha no login. Verifique suas credenciais.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-semibold text-center mb-4">Login</h2>
            <div>
                <label htmlFor="login-name" className="block text-sm font-medium mb-1">Nome de Usuário:</label>
                <input
                    type="text"
                    id="login-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <div>
                <label htmlFor="login-password" className="block text-sm font-medium mb-1">Senha:</label>
                <input
                    type="password"
                    id="login-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
                {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
        </form>
    );
};

export default LoginForm;