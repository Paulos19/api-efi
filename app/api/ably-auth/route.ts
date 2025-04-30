import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const tokenParams = {
    key: process.env.ABLY_API_KEY
  };
  
  return NextResponse.json(tokenParams);
}