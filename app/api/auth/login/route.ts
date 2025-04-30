import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/sqlite'; // Importa a função de busca do SQLite
// IMPORTANTE: Instale e importe bcrypt para hashing de senhas em produção!
// import bcrypt from 'bcrypt';

// Defina uma interface para o tipo de retorno da query do Account
interface Account {
  id: number;
  name: string;
  password: string; // Em produção, este seria o hash da senha
  // outros campos se necessário...
}

export async function POST(req: NextRequest) {
  try {
    const { name, password } = await req.json();

    if (!name || !password) {
      return NextResponse.json({ message: 'Nome de usuário e senha são obrigatórios' }, { status: 400 });
    }

    // Busca a conta no SQLite pelo nome (case-sensitive por padrão no SQLite)
    const account = await queryOne<Account>(
      'SELECT id, name, password FROM Account WHERE name = ?',
      [name]
    );

    if (!account) {
      console.log(`Tentativa de login falhou: Usuário ${name} não encontrado.`);
      return NextResponse.json({ message: 'Usuário ou senha inválidos' }, { status: 401 }); // Mensagem genérica
    }

    // --- Comparação de Senha ---
    // **MUITO IMPORTANTE:** A comparação abaixo é insegura (texto plano).
    // Em produção, use bcrypt:
    // const isPasswordValid = await bcrypt.compare(password, account.password);
    // if (!isPasswordValid) { ... }

    const isPasswordValid = (password === account.password); // Comparação insegura! Apenas para exemplo.

    if (!isPasswordValid) {
      console.log(`Tentativa de login falhou: Senha incorreta para usuário ${name}.`);
      return NextResponse.json({ message: 'Usuário ou senha inválidos' }, { status: 401 }); // Mensagem genérica
    }

    // Login bem-sucedido
    console.log(`Usuário ${name} logado com sucesso.`);

    // Aqui você implementaria a criação de sessão ou geração de token JWT
    // Exemplo simples: retornar dados do usuário (sem a senha!)
    const userSessionData = {
      id: account.id,
      name: account.name,
    };

    // Retorna sucesso e dados da sessão/usuário
    return NextResponse.json({ message: 'Login bem-sucedido', user: userSessionData }, { status: 200 });

  } catch (error: any) {
    console.error('Erro na API de login:', error.message);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}