import { decode, DecodedInvoice } from "light-bolt11-decoder";

/**
 * Decodes a lightning pay request (BOLT11)
 * @param req
 * @returns
 */
export function decodeLightnightPayRequest(req: string): DecodedInvoice {
  return decode(req);
}

export interface SecionWithAmount {
  name: "amount";
  letters: string;
  value: string
}

// TODO: Matching wrong secion: Property 'value' does not exist on type 'Section'
export function findLightningPayRequestSectionWithAmount(invoice: DecodedInvoice): SecionWithAmount | undefined {
  const sMatch = invoice.sections.find((s) => s.name === "amount") as SecionWithAmount;
  if (sMatch && sMatch.value) {
    return sMatch;
  }
}