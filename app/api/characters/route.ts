import { NextRequest, NextResponse } from 'next/server';
// Ajuste as importações conforme a sua estrutura em lib/sqlite
import { run as runSqliteQuery, queryOne, queryAll } from '@/lib/sqlite';
import { PrismaClient } from '@prisma/client'; // Prisma ainda pode ser usado em outros lugares

const prisma = new PrismaClient(); // Mantenha se Prisma for usado em outros lugares ou futuramente

// Interface para o tipo de retorno da query GET
interface Character {
  name: string;
  classname: string | null;
  level: number | null;
  coins: number | null;
}

// Interface para a conta (do SQLite)
interface Account {
    name: string;
    // Adicione outros campos se necessário para a lógica
}

// --- GET Handler (Busca Personagens) ---
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const accountName = searchParams.get('accountName');

    if (!accountName) {
        return NextResponse.json({ message: 'Nome da conta (accountName) é obrigatório' }, { status: 400 });
    }

    try {
        // Verifica se a conta existe no SQLite
        const account = await queryOne<Account>(
            'SELECT name FROM Account WHERE name = ?', // Corrigido: 'accounts' para 'Account'
            [accountName]
        );

        if (!account) {
            console.log(`Conta ${accountName} não encontrada no SQLite.`);
            // Decide se retorna erro 404 ou vazio 200. Vazio 200 parece mais apropriado se a conta não ter personagens é esperado.
            return NextResponse.json([], { status: 200 }); // Retorna vazio se conta não existe no SQLite
        }

        // Busca personagens no SQLite associados à conta
        const characters = await queryAll<Character>(
            'SELECT name, classname, level, coins FROM characters WHERE account = ? AND deleted = 0',
            [accountName]
        );

        console.log(`Buscando personagens para a conta: ${accountName}. Encontrados: ${characters.length}`);
        return NextResponse.json(characters, { status: 200 });

    } catch (error: any) {
        console.error('Erro ao buscar personagens:', error);
        return NextResponse.json({ message: 'Erro interno ao buscar personagens', error: error.message }, { status: 500 });
    } finally {
         // Desconecta o Prisma se ele foi usado ou pode ser usado.
         // Se Prisma não for mais usado neste arquivo, pode remover a instância e o disconnect.
        await prisma.$disconnect();
    }
}

// --- POST Handler (Cria Personagem) ---
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { accountName, characterName, className } = body;

        if (!accountName || !characterName) {
            return NextResponse.json({ message: 'Nome da conta (accountName) e nome do personagem (characterName) são obrigatórios' }, { status: 400 });
        }

        // 1. Verificar se a conta existe no SQLite
        const account = await queryOne<Account>(
            'SELECT name FROM Account WHERE name = ?', // Corrigido: 'accounts' para 'Account'
            [accountName]
        );

        if (!account) {
            // Mensagem de erro se a conta não for encontrada no SQLite
            return NextResponse.json({ message: `Conta '${accountName}' não encontrada.` }, { status: 404 });
        }

        // 2. Verificar se já existe um personagem com esse nome nesta conta (já usa SQLite)
        const existingCharacter = await queryOne(
            'SELECT name FROM characters WHERE name = ? AND account = ?',
            [characterName, accountName]
        );

        if (existingCharacter) {
            return NextResponse.json({ message: `Personagem '${characterName}' já existe nesta conta.` }, { status: 409 }); // 409 Conflict
        }

        // 3. Inserir o novo personagem no SQLite com valores padrão/iniciais (já usa SQLite)
        const initialLevel = 1;
        const initialCoins = 0;
        const defaultClassName = className || 'Aventureiro';

        const result = await runSqliteQuery(
            'INSERT INTO characters (name, account, classname, level, coins, deleted) VALUES (?, ?, ?, ?, ?, 0)',
            [characterName, accountName, defaultClassName, initialLevel, initialCoins]
        );

        if (result.lastID) {
            console.log(`Personagem '${characterName}' criado com sucesso para a conta '${accountName}' com ID: ${result.lastID}`);
            const newCharacter = {
                name: characterName,
                account: accountName,
                classname: defaultClassName,
                level: initialLevel,
                coins: initialCoins
            };
            return NextResponse.json(newCharacter, { status: 201 }); // 201 Created
        } else {
            console.error('Falha ao inserir personagem no SQLite, resultado:', result);
            throw new Error('Falha ao inserir personagem no banco de dados SQLite.');
        }

    } catch (error: any) {
        console.error('Erro ao criar personagem:', error);
        if (error instanceof SyntaxError) {
            return NextResponse.json({ message: 'Corpo da requisição inválido (JSON mal formatado)' }, { status: 400 });
        }
        return NextResponse.json({ message: 'Erro interno ao criar personagem', error: error.message }, { status: 500 });
    } finally {
        // Desconecta o Prisma se ele foi usado ou pode ser usado.
        await prisma.$disconnect();
    }
}