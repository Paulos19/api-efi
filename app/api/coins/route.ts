import { NextResponse } from 'next/server';
import { run as runSqliteQuery } from '@/lib/sqlite';

export async function POST(request: Request) {
  try {
    const { characterName, coins } = await request.json();
    
    await runSqliteQuery(
      'UPDATE characters SET coins = coins + ? WHERE name = ?',
      [coins, characterName]
    );
    
    return NextResponse.json({ 
      success: true,
      message: `${coins} coins adicionadas com sucesso para ${characterName}`
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar coins' },
      { status: 500 }
    );
  }
}