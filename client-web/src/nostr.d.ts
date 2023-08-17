interface Event {
  id?: string;
  pubkey?: string;
  sig?: string;
  // ... other properties
}

interface RelayPolicy {
  read: boolean;
  write: boolean;
}

interface Nip04 {
  encrypt(pubkey: string, plaintext: string): Promise<string>;
  decrypt(pubkey: string, ciphertext: string): Promise<string>;
}

interface Nostr {
  getPublicKey(): Promise<string>;
  signEvent(event: Event): Promise<Event>;
  getRelays?(): Promise<{ [url: string]: RelayPolicy }>;
  nip04?: Nip04;
}

// The 'export {}' makes this file a module
export {};

declare global {
  interface Window {
    nostr: Nostr;
  }
}
