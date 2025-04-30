"use client";

import React from 'react';

interface NotificationModalProps {
    type: 'success' | 'error'; // Adicione mais tipos se necessário
    message: string;
    onClose: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ type, message, onClose }) => {
    const bgColor = type === 'success' ? 'bg-green-100 dark:bg-green-900 border-green-500' : 'bg-red-100 dark:bg-red-900 border-red-500';
    const textColor = type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`p-6 rounded shadow-lg border ${bgColor} ${textColor} max-w-sm w-full mx-4`}>
                <h4 className="font-semibold mb-2">{type === 'success' ? 'Sucesso!' : 'Erro!'}</h4>
                <p className="mb-4">{message}</p>
                <button
                    onClick={onClose}
                    className={`px-4 py-1 rounded text-white ${type === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                    Fechar
                </button>
            </div>
        </div>
    );
};

export default NotificationModal;