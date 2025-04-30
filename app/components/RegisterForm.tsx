"use client";

import React, { useState } from 'react';
import axios from 'axios';

interface RegisterFormProps {
    onRegisterSuccess: () => void;
    onError: (message: string | null) => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onRegisterSuccess, onError }) => {
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            onError("As senhas não coincidem.");
            return;
        }
        setIsLoading(true);
        onError(null);

        try {
            await axios.post('/api/auth/register', { name, password });
            onRegisterSuccess();
        } catch (err: any) {
            console.error("Erro no registro:", err);
            onError(err.response?.data?.message || 'Falha no registro. Tente outro nome de usuário.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-semibold text-center mb-4">Cadastro</h2>
            <div>
                <label htmlFor="register-name" className="block text-sm font-medium mb-1">Nome de Usuário:</label>
                <input
                    type="text"
                    id="register-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <div>
                <label htmlFor="register-password" className="block text-sm font-medium mb-1">Senha:</label>
                <input
                    type="password"
                    id="register-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6} // Exemplo de validação
                    className="w-full px-3 py-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium mb-1">Confirmar Senha:</label>
                <input
                    type="password"
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
                {isLoading ? 'Cadastrando...' : 'Cadastrar'}
            </button>
        </form>
    );
};

export default RegisterForm;