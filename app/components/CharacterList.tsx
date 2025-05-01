"use client";

import React from 'react';
// Importe o tipo Character gerado pelo Prisma se disponível
// import { Character as PrismaCharacter } from '@prisma/client';

// Ou defina uma interface que corresponda à estrutura esperada dos dados da API
interface Character {
    name: string;
    classname: string | null; // Ajuste os tipos conforme seu schema Prisma
    level: number | null;     // Ajuste os tipos conforme seu schema Prisma
    // Presumindo que 'coins' venha da conta relacionada
    accountRel?: {             // Use o nome da relação correta do seu schema
        coins: number | null; // Ajuste o tipo conforme seu schema Prisma
    } | null;
    // Ou se 'coins' for diretamente no Character
    // coins: number | null;
}

interface CharacterListProps {
    characters: Character[];
    selectedCharacterName: string | null;
    onSelectCharacter: (character: Character) => void;
}

const CharacterList: React.FC<CharacterListProps> = ({ characters, selectedCharacterName, onSelectCharacter }) => {
    return (
        <ul className="space-y-3">
            {characters.map((char) => (
                <li
                    key={char.name}
                    onClick={() => onSelectCharacter(char)}
                    className={`p-4 border rounded cursor-pointer transition-colors duration-150 ${
                        selectedCharacterName === char.name
                            ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 ring-2 ring-blue-500'
                            : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                >
                    <p className="font-semibold text-lg">{char.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Classe: {char.classname || 'N/A'} - Level: {char.level ?? 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {/* Ajuste para acessar coins da conta relacionada, se necessário */}
                        Coins: {char.accountRel?.coins ?? 0}
                        {/* Ou se 'coins' for direto no Character: */}
                        {/* Coins: {char.coins ?? 0} */}
                    </p>
                </li>
            ))}
        </ul>
    );
};

export default CharacterList;