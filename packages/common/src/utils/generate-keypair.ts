import { schnorr } from "@noble/curves/secp256k1";
import { bytesToHex } from "@noble/curves/abstract/utils";

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
