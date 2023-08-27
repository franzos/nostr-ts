import { decode } from "light-bolt11-decoder";

export interface DecodedInvoice {
  paymentRequest: string;
  sections: {
    name: string;
    tag?: string;
    letters: string;
    value?: object | string | number;
  }[];
}

/**
 * Decodes a lightning pay request (BOLT11)
 * @param req
 * @returns
 */
export function decodeLightnightPayRequest(req: string): DecodedInvoice {
  return decode(req);
}
