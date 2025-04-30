'use client';

import { configureAbly } from '@ably-labs/react-hooks';
import * as Ably from 'ably';
import { AblyProvider } from 'ably/react';

configureAbly({
  key: process.env.NEXT_PUBLIC_ABLY_API_KEY!,
  clientId: process.env.NEXT_PUBLIC_ABLY_CLIENT_ID!,
});

const client = new Ably.Realtime({
  key: process.env.NEXT_PUBLIC_ABLY_API_KEY!,
  clientId: process.env.NEXT_PUBLIC_ABLY_CLIENT_ID!,
});

export const AblyProviders = ({ children }: { children: React.ReactNode }) => (
  <AblyProvider client={client}>
    {children}
  </AblyProvider>
);
