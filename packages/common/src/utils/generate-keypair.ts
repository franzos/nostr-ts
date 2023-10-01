import { schnorr } from "@noble/curves/secp256k1";
import { bytesToHex } from "@noble/curves/abstract/utils";

function hexToUint8Array(hex: string): Uint8Array {
  const length = hex.length / 2;
  const result = new Uint8Array(length);
  for (let i = 0, j = 0; i < length; i++, j += 2) {
    result[i] = parseInt(hex.substr(j, 2), 16);
  }
  return result;
}

/**
 * Generate keypair
 * @returns {
 *  privateKey: hex string
 *  pub: hex string
 * }
 */
export function generateClientKeys(): {
  privateKey: string;
  publicKey: string;
} {
  const privateKey = schnorr.utils.randomPrivateKey();
  const publicKey = schnorr.getPublicKey(privateKey);
  return {
    privateKey: bytesToHex(privateKey),
    publicKey: bytesToHex(publicKey),
  };
}

export function publicKeyFromPrivateKey(privateKey: string): string {
  return bytesToHex(schnorr.getPublicKey(hexToUint8Array(privateKey)));
}
