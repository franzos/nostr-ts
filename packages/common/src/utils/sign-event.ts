import { schnorr } from '@noble/curves/secp256k1';
import { bytesToHex } from '@noble/curves/abstract/utils';
import { Event } from "../types";
import { hashEvent } from './hash-event';

export function sign(eventHash: string, privateKey: string) {
    const sig = schnorr.sign(eventHash, privateKey)
    return bytesToHex(sig)
}

/**
 * Sign event and return signature as hex string
 * @param event 
 * @param privateKey 
 * @returns 
 */
export function signEvent(event: Event, privateKey: string) {
    const serial = hashEvent(event)
    return sign(serial, privateKey)
}
