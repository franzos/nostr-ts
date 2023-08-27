import { bech32 } from "bech32";
import { BECH32_PREFIX } from "../types";

type ParsedTLVItem = {
  type: number;
  length: number;
  value: Uint8Array | number;
};

type ConvertedTLVItem = {
  /**
   * 0: special
   * 1: relay
   * 2: author
   * 3: kind
   */
  type: number;
  value: string | number;
};

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function generateTLV(
  items: Array<{ type: number; value: string | number }>
): Uint8Array {
  const parts: Uint8Array[] = [];

  for (const item of items) {
    const typePart = new Uint8Array([item.type]);
    let valuePart;

    if (item.type === 1) {
      valuePart = new TextEncoder().encode(item.value as string);
    } else if (item.type === 3) {
      valuePart = new Uint32Array([item.value as number]);
    } else {
      valuePart = hexToBytes(item.value as string);
    }

    const lengthPart = new Uint8Array([valuePart.length]);

    parts.push(typePart);
    parts.push(lengthPart);
    parts.push(valuePart);
  }

  let totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);

  let position = 0;
  for (const part of parts) {
    result.set(part, position);
    position += part.length;
  }

  return result;
}

function parseTLV(
  data: Uint8Array
): Array<{ type: number; length: number; value: Uint8Array | number }> {
  let position = 0;
  const items = [];

  while (position < data.length) {
    const type = data[position++];
    const length = data[position++];
    let value: Uint8Array | number;

    if (type === 3) {
      // If type is 3, parse the value as a 32-bit unsigned integer in big-endian format.
      const valueArray = data.slice(position, position + length);
      value = new DataView(valueArray.buffer).getUint32(0, false); // Big-endian
    } else {
      // Otherwise, keep the value as a Uint8Array.
      value = data.slice(position, position + length);
    }

    items.push({ type, length, value });
    position += length;
  }

  return items;
}

function convertTLV(tlvItems: ParsedTLVItem[]): ConvertedTLVItem[] {
  return tlvItems.map((item) => {
    let value;

    if (item.type === 3) {
      // The value is already a number for type 3
      value = item.value;
    } else if (item.type === 1) {
      // Convert Uint8Array to Text String for type 1
      value = new TextDecoder().decode(item.value as Uint8Array);
    } else {
      // Convert Uint8Array to Hex String for other types
      value = bytesToHex(item.value as Uint8Array);
    }

    return { type: item.type, value };
  });
}

/**
 * Encode TLV data into a Bech32 string
 * Spec: https://github.com/nostr-protocol/nips/blob/master/19.md
 * @param prefix
 * @param tlvItems
 * @returns
 */
export function encodeBech32(
  prefix: BECH32_PREFIX,
  tlvItems: Array<{ type: number; value: string | number }>
) {
  let tlvData;

  if (
    prefix === BECH32_PREFIX.PublicKeys ||
    prefix === BECH32_PREFIX.PrivateKeys ||
    prefix === BECH32_PREFIX.NoteIDs ||
    prefix === BECH32_PREFIX.LNURL
  ) {
    tlvData = hexToBytes(tlvItems[0].value as string);
  } else {
    tlvData = generateTLV(tlvItems);
  }

  const words = bech32.toWords(new Uint8Array(tlvData.buffer));

  const encoded = bech32.encode(prefix, words, 1023);

  return encoded;
}

/**
 * Decode a Bech32 string into TLV data
 * Spec: https://github.com/nostr-protocol/nips/blob/master/19.md
 * @param bech32Str
 * @returns
 */
export function decodeBech32(bech32Str: string) {
  const { prefix, words } = bech32.decode(bech32Str, 1023);
  const tlvData = new Uint8Array(bech32.fromWords(words));
  let tlvItems: ConvertedTLVItem[];

  // Check if the prefix matches one of the specified values
  if (
    prefix === BECH32_PREFIX.PublicKeys ||
    prefix === BECH32_PREFIX.PrivateKeys ||
    prefix === BECH32_PREFIX.NoteIDs ||
    // not sure:
    prefix === BECH32_PREFIX.LNURL
  ) {
    tlvItems = [{ type: 0, value: bytesToHex(tlvData) }];
  } else if (
    prefix === BECH32_PREFIX.Profile ||
    prefix === BECH32_PREFIX.Event ||
    prefix === BECH32_PREFIX.Relay ||
    prefix === BECH32_PREFIX.EventCoordinate
  ) {
    const parsedTLVItems: ParsedTLVItem[] = parseTLV(tlvData);
    tlvItems = convertTLV(parsedTLVItems);
  } else {
    throw new Error("Unknown prefix: " + prefix);
  }

  return { prefix, tlvItems: tlvItems };
}
