import { NextResponse } from 'next/server';
// Remova a importação do SQLite
// import { run as runSqliteQuery } from '@/lib/sqlite';
import { PrismaClient } from '@prisma/client'; // Importe o Prisma Client

const prisma = new PrismaClient(); // Instancie o Prisma Client

export async function POST(request: Request) {
  const prisma = new PrismaClient(); // Instancie dentro da função ou use a instância global

  try {
    const { characterName, coins } = await request.json();

    if (!characterName || coins === undefined || coins === null) {
        return NextResponse.json(
            { success: false, error: 'Nome do personagem (characterName) e quantidade de coins são obrigatórios' },
            { status: 400 }
        );
    }

    const coinsToAdd = Number(coins);
    if (isNaN(coinsToAdd) || !Number.isInteger(coinsToAdd) || coinsToAdd <= 0) {
         return NextResponse.json(
            { success: false, error: 'A quantidade de coins deve ser um número inteiro positivo' },
            { status: 400 }
        );
    }

    // Use prisma.character.update para adicionar coins
    // A operação 'increment' garante atomicidade
    const updatedCharacter = await prisma.character.update({
      where: {
        name: characterName, // Encontra o personagem pelo nome (que é o @id)
      },
      data: {
        coins: {
          increment: coinsToAdd, // Incrementa o valor atual
        },
      },
      select: { // Seleciona apenas os campos necessários para a resposta
          name: true,
          coins: true
      }
    });

    // Se o personagem não for encontrado, o Prisma lançará um erro P2025 por padrão.
    // O bloco catch abaixo lidará com isso.

    console.log(`Coins atualizados para ${characterName}. Novo total: ${updatedCharacter.coins}`);

    return NextResponse.json({
      success: true,
      message: `${coinsToAdd} coins adicionadas com sucesso para ${characterName}. Novo total: ${updatedCharacter.coins}`
    });

  } catch (error: any) {
    console.error('Erro ao atualizar coins:', error);

    // Verifica se o erro é porque o personagem não foi encontrado
    if (error.code === 'P2025') { // Código de erro do Prisma para "Record to update not found."
        const { characterName } = await request.json().catch(() => ({ characterName: 'desconhecido' })); // Tenta obter o nome novamente para a msg de erro
        return NextResponse.json(
            { success: false, error: `Personagem '${characterName}' não encontrado.` },
            { status: 404 } // Not Found
        );
    }
     if (error instanceof SyntaxError) {
        return NextResponse.json({ message: 'Corpo da requisição inválido (JSON mal formatado)' }, { status: 400 });
    }

    // Erro genérico
    return NextResponse.json(
      { success: false, error: 'Erro interno ao atualizar coins' },
      { status: 500 }
    );
  } finally {
      await prisma.$disconnect(); // Garante a desconexão do Prisma
  }
}