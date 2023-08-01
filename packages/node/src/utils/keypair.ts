import { generateClientKeys } from "@nostr-ts/common";
import { schnorr } from "@noble/curves/secp256k1";
import { bytesToHex } from "@noble/curves/abstract/utils";

import { readFile, statfs, writeFile } from "fs/promises";

export async function loadKeyFromFile(path: string) {
  let exists = false;
  try {
    await statfs(path);
    exists = true;
  } catch (e) {
    exists = false;
    console.log(`Private key file ${path} does not exist`);
  }

  if (exists) {
    const privateKey = await readFile(path);
    return privateKey.toString();
  }
}

export async function saveKeyPair(
  keypair: {
    priv: string;
    pub: string;
  },
  privateKeyPath?: string
) {
  const keypath = privateKeyPath || "key";
  const { priv, pub } = keypair;
  await writeFile(keypath, priv);
  await writeFile(`${keypath}.pub`, pub);
}

export async function loadOrCreateKeypair(privateKeyPath?: string) {
  const keypath = privateKeyPath || "key";
  const priv = await loadKeyFromFile(keypath);
  if (priv) {
    let pub = await loadKeyFromFile(`${keypath}.pub`);
    if (!pub) {
      console.log(
        `Public key file ${keypath}.pub does not exist. Generating ...`
      );
      pub = bytesToHex(schnorr.getPublicKey(priv));
    }
    return { priv, pub };
  } else {
    const keypair = generateClientKeys();
    await saveKeyPair(keypair);
    return keypair;
  }
}
