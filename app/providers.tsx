'use client';

import {  configureAbly } from '@ably-labs/react-hooks';
import * as Ably from 'ably';
import { AblyProvider } from 'ably/react';

const ablyKey = process.env.NEXT_PUBLIC_ABLY_API_KEY!;
const ablyClientId = process.env.NEXT_PUBLIC_ABLY_CLIENT_ID ?? null;

configureAbly({
  key: ablyKey,
  clientId: ablyClientId!,
});

const client = new Ably.Realtime({
  key: ablyKey,
  clientId: ablyClientId!,
});

export const AblyProviders = ({ children }: { children: React.ReactNode }) => (
  <AblyProvider client={client}>
    {children}
  </AblyProvider>
);
