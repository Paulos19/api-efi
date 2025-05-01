import { NextRequest, NextResponse } from 'next/server';
// Remova a importação do SQLite
// import { queryOne } from '@/lib/sqlite';
import { PrismaClient } from '@prisma/client'; // Importe o Prisma Client
// IMPORTANTE: Instale e importe bcrypt para hashing de senhas em produção!
import bcrypt from 'bcrypt'; // Descomente e instale: npm install bcrypt @types/bcrypt

const prisma = new PrismaClient(); // Instancie o Prisma Client

export async function POST(req: NextRequest) {
  try {
    const { name, password } = await req.json();

    if (!name || !password) {
      return NextResponse.json({ message: 'Nome de usuário e senha são obrigatórios' }, { status: 400 });
    }

    // Busca a conta no Prisma pelo nome
    const account = await prisma.account.findUnique({
      where: { name: name },
    });

    if (!account) {
      console.log(`Tentativa de login falhou: Usuário ${name} não encontrado.`);
      // Use uma mensagem genérica para não revelar se o usuário existe ou não
      return NextResponse.json({ message: 'Credenciais inválidas' }, { status: 401 });
    }

    // --- Comparação de Senha ---
    // **MUITO IMPORTANTE:** Use bcrypt.compare para comparar a senha fornecida com o hash armazenado.
    const isPasswordValid = await bcrypt.compare(password, account.password);
    // const isPasswordValid = (password === account.password); // !! REMOVA ESTA LINHA INSEGURA !!

    if (!isPasswordValid) {
      console.log(`Tentativa de login falhou: Senha incorreta para usuário ${name}.`);
      // Use uma mensagem genérica
      return NextResponse.json({ message: 'Credenciais inválidas' }, { status: 401 });
    }

    // Login bem-sucedido
    console.log(`Usuário ${name} logado com sucesso.`);

    // Aqui você implementaria a criação de sessão ou geração de token JWT
    // Exemplo simples: retornar dados do usuário (sem a senha!)
    const userSessionData = {
      id: account.id,
      name: account.name,
      // Não inclua a senha ou hash da senha aqui!
    };

    // Retorna sucesso e dados da sessão/usuário
    return NextResponse.json({ message: 'Login bem-sucedido', user: userSessionData }, { status: 200 });

  } catch (error: any) {
    console.error('Erro na API de login:', error.message);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  } finally {
    await prisma.$disconnect(); // Desconecta o Prisma Client
  }
}