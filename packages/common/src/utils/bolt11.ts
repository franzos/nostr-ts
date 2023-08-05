import { decode } from "bolt11";

/**
 * Decodes a lightning pay request (BOLT11)
 * @param req
 * @returns
 */
export function decodeLightnightPayRequest(req: string) {
  return decode(req);
}
