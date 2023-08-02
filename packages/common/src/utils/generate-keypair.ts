import { schnorr } from "@noble/curves/secp256k1";
import { bytesToHex } from "@noble/curves/abstract/utils";

/**
 * Generate keypair
 * @returns {
 *  priv: hex string
 *  pub: hex string
 * }
 */
export function generateClientKeys(): { priv: string; pub: string } {
  const priv = schnorr.utils.randomPrivateKey();
  const pub = schnorr.getPublicKey(priv);
  return {
    priv: bytesToHex(priv),
    pub: bytesToHex(pub),
  };
}
