import { schnorr } from '@noble/curves/secp256k1';
import { Event } from "../types";
import { hashEvent } from './hash-event';

export function verifyEvent(event: Event): boolean {
    const content = hashEvent(event)
    const valid = schnorr.verify(event.sig, content, event.pubkey)
    return valid;
}