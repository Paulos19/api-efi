import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run as runSqliteQuery } from '@/lib/sqlite'; // Importa funções do SQLite
// IMPORTANTE: Instale e importe bcrypt para hashing de senhas em produção!
// import bcrypt from 'bcrypt';

interface Account {
  id: number;
  name: string;
}

export async function POST(req: NextRequest) {
  try {
    const { name, password } = await req.json();

    if (!name || !password) {
      return NextResponse.json({ message: 'Nome de usuário e senha são obrigatórios' }, { status: 400 });
    }

    // Validações adicionais (comprimento mínimo, caracteres, etc.) podem ser adicionadas aqui

    // Verifica se a conta já existe
    const existingAccount = await queryOne<Account>(
      'SELECT id, name FROM Account WHERE name = ?',
      [name]
    );

    if (existingAccount) {
      console.log(`Tentativa de cadastro falhou: Usuário ${name} já existe.`);
      return NextResponse.json({ message: 'Nome de usuário já está em uso' }, { status: 409 }); // Conflict
    }

    // --- Hashing de Senha ---
    // **MUITO IMPORTANTE:** A senha deve ser hasheada antes de salvar.
    // Em produção, use bcrypt:
    // const saltRounds = 10;
    // const hashedPassword = await bcrypt.hash(password, saltRounds);
    // Substitua 'password' por 'hashedPassword' na query abaixo.

    const hashedPassword = password; // !! INSEGURO !! Apenas para exemplo. Use bcrypt.

    // Insere a nova conta no SQLite
    const result = await runSqliteQuery(
      'INSERT INTO Account (name, password) VALUES (?, ?)',
      [name, hashedPassword] // Salva a senha (hasheada em produção)
    );

    if (result.changes > 0) {
      console.log(`Usuário ${name} cadastrado com sucesso. ID: ${result.lastID}`);
      return NextResponse.json({ message: 'Cadastro realizado com sucesso!', userId: result.lastID }, { status: 201 }); // Created
    } else {
      console.error(`Falha ao inserir usuário ${name} no banco de dados.`);
      return NextResponse.json({ message: 'Erro ao realizar o cadastro' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Erro na API de cadastro:', error.message);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}