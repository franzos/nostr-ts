import { decode } from "light-bolt11-decoder";

export interface DecodedInvoice {
  paymentRequest: string;
  sections: {
    name: string;
    letters: string;
    value?: any;
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
