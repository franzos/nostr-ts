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
    privateKey: string;
    publicKey: string;
  },
  privateKeyPath?: string
) {
  const keypath = privateKeyPath || "key";
  const { privateKey, publicKey } = keypair;
  await writeFile(keypath, privateKey);
  await writeFile(`${keypath}.pub`, publicKey);
}

export async function loadOrCreateKeypair(privateKeyPath?: string) {
  const keypath = privateKeyPath || "key";
  const privateKey = await loadKeyFromFile(keypath);
  if (privateKey) {
    let publicKey = await loadKeyFromFile(`${keypath}.pub`);
    if (!publicKey) {
      console.log(
        `Public key file ${keypath}.pub does not exist. Generating ...`
      );
      publicKey = bytesToHex(schnorr.getPublicKey(privateKey));
    }
    return { privateKey, publicKey };
  } else {
    const keypair = generateClientKeys();
    await saveKeyPair(keypair);
    return keypair;
  }
}
