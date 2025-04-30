import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPaymentStatus(txid: string): Promise<string> {
  try {
    const payment = await prisma.pixWebhook.findUnique({
      where: { txid },
      select: { status: true }
    });

    return payment?.status || 'pending';
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request: NextRequest, { params }: { params: { txid: string } }) {
  try {
    const paymentStatus = await checkPaymentStatus(params.txid);
    
    return NextResponse.json({
      status: paymentStatus === 'COMPLETED' ? 'COMPLETED' : 'pending',
      txid: params.txid
    });
    
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Erro ao verificar status' },
      { status: 500 }
    );
  }
}