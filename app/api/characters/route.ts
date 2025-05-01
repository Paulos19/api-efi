import { NextRequest, NextResponse } from 'next/server';
// Remova as importações do SQLite
// import { run as runSqliteQuery, queryOne, queryAll } from '@/lib/sqlite';
import { PrismaClient } from '@prisma/client'; // Mantenha a importação do Prisma

const prisma = new PrismaClient();

// Remova as interfaces Character e Account, pois o Prisma gerencia os tipos
// interface Character { ... }
// interface Account { ... }

// --- GET Handler (Busca Personagens com Prisma) ---
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const accountName = searchParams.get('accountName');

    if (!accountName) {
        return NextResponse.json({ message: 'Nome da conta (accountName) é obrigatório' }, { status: 400 });
    }

    try {
        // Verifica se a conta existe usando Prisma
        const account = await prisma.account.findUnique({
            where: { name: accountName },
            select: { id: true } // Seleciona apenas o ID para verificar a existência
        });

        if (!account) {
            console.log(`Conta ${accountName} não encontrada no Prisma.`);
            // Retorna um array vazio se a conta não existe
            return NextResponse.json([], { status: 200 });
        }

        // Busca personagens no Prisma associados à conta
        // Certifique-se que seu schema.prisma define a relação corretamente
        // e que o modelo Character tem um campo 'account' ou 'accountId'
        const characters = await prisma.character.findMany({
            where: {
                account: accountName, // Filtra pelo nome da conta (ou accountId se for o caso)
                deleted: 0 // Assumindo que 'deleted' é um campo numérico (0 ou 1)
                // Se 'deleted' for booleano, use: deleted: false
            },
            select: { // Seleciona apenas os campos necessários
                name: true,
                classname: true,
                level: true,
                coins: true
            }
        });

        console.log(`Buscando personagens para a conta: ${accountName}. Encontrados: ${characters.length}`);
        return NextResponse.json(characters, { status: 200 });

    } catch (error: any) {
        console.error('Erro ao buscar personagens:', error);
        return NextResponse.json({ message: 'Erro interno ao buscar personagens', error: error.message }, { status: 500 });
    } finally {
        await prisma.$disconnect(); // Desconecta o Prisma
    }
}

// --- POST Handler (Cria Personagem com Prisma) ---
export async function POST(req: NextRequest) {
    let characterName: string | null = null; // Declare characterName outside try block

    try {
        const body = await req.json();
        // Assign value inside try block
        const { accountName, className } = body;
        characterName = body.characterName; // Assign here

        if (!accountName || !characterName) {
            return NextResponse.json({ message: 'Nome da conta (accountName) e nome do personagem (characterName) são obrigatórios' }, { status: 400 });
        }

        // 1. Verificar se a conta existe no Prisma
        const account = await prisma.account.findUnique({
            where: { name: accountName },
            select: { id: true } // Seleciona apenas o ID
        });

        if (!account) {
            // Mensagem de erro se a conta não for encontrada no Prisma
            return NextResponse.json({ message: `Conta '${accountName}' não encontrada.` }, { status: 404 });
        }

        // 2. Verificar se já existe um personagem com esse nome nesta conta usando Prisma
        const existingCharacter = await prisma.character.findFirst({
            where: {
                name: characterName,
                account: accountName // Filtra pelo nome da conta
            }
        });

        if (existingCharacter) {
            return NextResponse.json({ message: `Personagem '${characterName}' já existe nesta conta.` }, { status: 409 }); // 409 Conflict
        }

        // 3. Inserir o novo personagem no Prisma com valores padrão/iniciais
        const initialLevel = 1;
        const initialCoins = 0;
        const defaultClassName = className || 'Aventureiro'; // Mantém a lógica do nome da classe padrão

        const newCharacter = await prisma.character.create({
            data: {
                name: characterName, // Use the validated characterName
                account: accountName,
                classname: defaultClassName,
                level: initialLevel,
                coins: initialCoins,
                deleted: 0,
                // Add other required fields from your schema if necessary
                // Example: Assuming x, y, health, mana etc. need defaults
                x: 0, // Example default
                y: 0, // Example default
                health: 100, // Example default
                mana: 50, // Example default
                strength: 10, // Example default
                intelligence: 10, // Example default
                experience: 0, // Example default
                skillExperience: 0, // Example default
                gold: 0, // Example default
                online: 0, // Example default
                lastsaved: BigInt(Date.now()), // Example default
            }
        });

        console.log(`Personagem '${characterName}' criado com sucesso para a conta '${accountName}' com ID (nome): ${newCharacter.name}`); // Log using name

        // Retorna o objeto do personagem criado (sem campos sensíveis, se houver)
        const characterResponse = {
            // id: newCharacter.id, // Removed: 'id' doesn't exist, 'name' is the ID
            name: newCharacter.name, // Use name as the identifier
            account: newCharacter.account,
            classname: newCharacter.classname,
            level: newCharacter.level,
            coins: newCharacter.coins
        };

        return NextResponse.json(characterResponse, { status: 201 }); // 201 Created

    } catch (error: any) {
        console.error('Erro ao criar personagem:', error);
        if (error instanceof SyntaxError) {
            return NextResponse.json({ message: 'Corpo da requisição inválido (JSON mal formatado)' }, { status: 400 });
        }
        // Verifica erro de constraint única do Prisma (ex: se 'name' for unique)
        if (error.code === 'P2002') {
             // Now characterName is accessible here
             const message = characterName
                ? `Personagem '${characterName}' já existe.` // Adjusted message as 'name' is the primary key
                : 'Um personagem com este nome já existe.';
             return NextResponse.json({ message: message }, { status: 409 });
        }
        // Ensure characterName is checked before using in the generic error message if needed
        const errorMessage = characterName
            ? `Erro interno ao criar personagem '${characterName}'`
            : 'Erro interno ao criar personagem';
        return NextResponse.json({ message: errorMessage, error: error.message }, { status: 500 });
    } finally {
        await prisma.$disconnect(); // Desconecta o Prisma
    }
}