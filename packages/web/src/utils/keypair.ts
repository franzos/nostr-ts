import { generateClientKeys } from "@nostr-ts/common";

export function loadKeyFromLocalStorage(key: string): string | null {
  return localStorage.getItem(key);
}

/**
 * IMPORTANT: DO NOT USE THIS
 *
 * Well, of course you can use it. It'll work just fine ...
 * but if you care about your users, find another approach!
 * @param keypair
 */
export function saveKeyPairToLocalStorage(keypair: {
  privateKey: string;
  publicKey: string;
}) {
  localStorage.setItem("private-key", keypair.privateKey);
  localStorage.setItem("public-key", keypair.publicKey);
}

export async function loadOrCreateKeypair() {
  let privateKey = loadKeyFromLocalStorage("private-key");
  let publicKey = loadKeyFromLocalStorage("public-key");

  if (privateKey && publicKey) {
    return { privateKey, publicKey };
  } else {
    const keypair = generateClientKeys();
    saveKeyPairToLocalStorage(keypair);
    return keypair;
  }
}
