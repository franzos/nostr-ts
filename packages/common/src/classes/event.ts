import { Event, EVENT_KIND } from '../types';
import { hash, sign, serializeEvent } from '../utils';

export class NewEvent implements Event {
    /**
     * Hex string of event hash
     */
    id: string;
    pubkey: string;
    /**
     * Unix timestamp in seconds
     */
    created_at: number;
    kind: EVENT_KIND | number;
    tags: string[][] | undefined;
    content: string;
    sig: string;

    constructor(
        data: {
            content: string,
            kind?: EVENT_KIND | number,
            tags?: string[][],
            /**
             * Unix timestamp in seconds
             */
            created_at?: number,
        }
    ) {
        this.id = '';
        this.pubkey = '';
        this.created_at = data.created_at || Math.round(Date.now() / 1000);
        this.kind = data.kind || EVENT_KIND.SHORT_TEXT_NOTE;
        this.tags = data.tags && data.tags.length > 0 ? data.tags : [];
        this.content = data.content;
        this.sig = '';
    }
    
    /**
     * 1. Sign the event (event.sig)
     * 2. Generate the event ID (event.id)
     * @param privateKey 
     */
    public signAndGenerateId(keyPair: { priv: string, pub: string }) {
        this.pubkey = keyPair.pub;
        const serial = serializeEvent(this.toJson())
        this.id = hash(serial)
        this.sig = sign(this.id, keyPair.priv)
    }

    public toJson() {
        return JSON.parse(JSON.stringify(this))
    }
}

export function NewShortTextNote(text: string) {
    return new NewEvent({
        content: text,
        kind: EVENT_KIND.SHORT_TEXT_NOTE
    })
}

/**
 * Reaction
 * @param reaction 
 * @param event event to react to
 * @returns 
 */
export function NewReaction(
    reaction: string,
    event: {
        id: string,
        pubkey: string
    },
) {
    return new NewEvent({
        content: reaction,
        kind: EVENT_KIND.REACTION,
        tags: [
            ['e', event.id],
            ['p', event.pubkey]
        ]
    })
}

/**
 * Repost of notes (1)
 * @param relay relay URL where to find the event
 * @param event event to repost
 * @returns 
 */
export function NewQuoteRepost(
    relay: string,
    event: Event
) {
    return new NewEvent({
        content: JSON.stringify({
            ...event,
            relay: relay
        }),
        kind: EVENT_KIND.REPOST,
        tags: [
            ['e', event.id],
            ['p', event.pubkey]
        ]
    })
}

/**
 * Repost of any event except notes (1)
 * @param relay relay URL where to find the event
 * @param event event to repost
 * @returns 
 */
export function NewGenericRepost(
    relay: string,
    event: Event
) {
    return new NewEvent({
        content: JSON.stringify({
            ...event,
            relay
        }),
        kind: EVENT_KIND.GENERIC_REPOST,
        tags: [
            ['e', event.id],
            ['p', event.pubkey],
            ['k', event.kind.toString()]
        ]
    })
}