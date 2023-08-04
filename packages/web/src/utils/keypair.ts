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
  priv: string;
  pub: string;
}) {
  localStorage.setItem("priv", keypair.priv);
  localStorage.setItem("pub", keypair.pub);
}

export async function loadOrCreateKeypair() {
  let priv = loadKeyFromLocalStorage("priv");
  let pub = loadKeyFromLocalStorage("pub");

  if (priv && pub) {
    return { priv, pub };
  } else {
    const keypair = generateClientKeys();
    saveKeyPairToLocalStorage(keypair);
    return keypair;
  }
}
