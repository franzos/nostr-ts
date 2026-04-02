import { schnorr } from "@noble/curves/secp256k1.js";
import { bytesToHex, hexToBytes } from "@noble/curves/utils.js";

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
  const privateKey = schnorr.utils.randomSecretKey();
  const publicKey = schnorr.getPublicKey(privateKey);
  return {
    privateKey: bytesToHex(privateKey),
    publicKey: bytesToHex(publicKey),
  };
}

export function publicKeyFromPrivateKey(privateKey: string): string {
  return bytesToHex(schnorr.getPublicKey(hexToBytes(privateKey)));
}
