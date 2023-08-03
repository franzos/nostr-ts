import { bech32 } from "bech32";
import { BECH32_PREFIX } from "../types";

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array) {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
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
): Array<{ type: number; value: string | number }> {
  let position = 0;
  const items = [];

  while (position < data.length) {
    const type = data[position++];
    const length = data[position++];
    let value;

    if (type === 1) {
      value = new TextDecoder().decode(data.slice(position, position + length));
    } else if (type === 3) {
      value = new DataView(data.buffer).getUint32(position);
    } else {
      value = bytesToHex(data.slice(position, position + length));
    }

    items.push({ type, value });
    position += length;
  }

  return items;
}

export function encodeBech32(
  prefix: BECH32_PREFIX,
  tlvItems: Array<{ type: number; value: string | number }>
) {
  let tlvData;

  if (
    prefix === BECH32_PREFIX.PublicKeys ||
    prefix === BECH32_PREFIX.PrivateKeys ||
    prefix === BECH32_PREFIX.NoteIDs
  ) {
    tlvData = hexToBytes(tlvItems[0].value as string);
  } else {
    tlvData = generateTLV(tlvItems);
  }

  const words = bech32.toWords(new Uint8Array(tlvData.buffer));

  const encoded = bech32.encode(prefix, words);

  return encoded;
}

export function decodeBech32(bech32Str: string) {
  const { prefix, words } = bech32.decode(bech32Str);
  const tlvData = new Uint8Array(bech32.fromWords(words));
  let tlvItems;

  if (
    prefix === BECH32_PREFIX.PublicKeys ||
    prefix === BECH32_PREFIX.PrivateKeys ||
    prefix === BECH32_PREFIX.NoteIDs
  ) {
    tlvItems = [{ type: 0, value: bytesToHex(tlvData) }];
  } else {
    tlvItems = parseTLV(tlvData);
  }

  return { prefix, tlvItems };
}
