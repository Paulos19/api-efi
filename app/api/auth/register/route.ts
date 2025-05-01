import { NextRequest, NextResponse } from 'next/server';
// Remova as importações do SQLite
// import { queryOne, run as runSqliteQuery } from '@/lib/sqlite';
import { PrismaClient } from '@prisma/client'; // Importe o Prisma Client
// IMPORTANTE: Instale e importe bcrypt para hashing de senhas em produção!
import bcrypt from 'bcrypt'; // Descomente e instale: npm install bcrypt @types/bcrypt

const prisma = new PrismaClient(); // Instancie o Prisma Client

// Remova a interface Account, o Prisma gerencia os tipos
// interface Account {
//   id: number;
//   name: string;
// }

export async function POST(req: NextRequest) {
  try {
    const { name, password } = await req.json();

    if (!name || !password) {
      return NextResponse.json({ message: 'Nome de usuário e senha são obrigatórios' }, { status: 400 });
    }

    // Validações adicionais (comprimento mínimo, caracteres, etc.) podem ser adicionadas aqui

    // Verifica se a conta já existe usando Prisma
    const existingAccount = await prisma.account.findUnique({
      where: { name: name }, // Assumindo que 'name' é único no seu schema.prisma
    });

    if (existingAccount) {
      console.log(`Tentativa de cadastro falhou: Usuário ${name} já existe.`);
      return NextResponse.json({ message: 'Nome de usuário já está em uso' }, { status: 409 }); // Conflict
    }

    // --- Hashing de Senha ---
    // **MUITO IMPORTANTE:** Use bcrypt em produção.
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    // const hashedPassword = password; // !! REMOVA ESTA LINHA INSEGURA !!

    // Insere a nova conta usando Prisma
    const newAccount = await prisma.account.create({
      data: {
        name: name,
        password: hashedPassword, // Salva a senha hasheada
        lastlogin: new Date(), // Added: Set initial last login time
        banned: false,         // Added: Set initial banned status
        // 'created' and 'coins' have default values in the schema
      },
    });

    console.log(`Usuário ${name} cadastrado com sucesso. ID: ${newAccount.id}`);
    // Retorna o ID do usuário criado
    return NextResponse.json({ message: 'Cadastro realizado com sucesso!', userId: newAccount.id }, { status: 201 }); // Created

  } catch (error: any) {
    console.error('Erro na API de cadastro:', error.message);
    // Verifica se o erro é de violação de constraint única (ex: email já existe, se aplicável)
    if (error.code === 'P2002') { // Código de erro do Prisma para unique constraint violation
        return NextResponse.json({ message: 'Nome de usuário já está em uso' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  } finally {
    await prisma.$disconnect(); // Desconecta o Prisma Client
  }
}