import { NEvent, generateClientKeys } from "@nostr-ts/common";
import {
  sCDNCreditRequest,
  sCDNGetInvoice,
  sCDNGetTerms,
} from "./sattelite-cdn";

describe("Satellite CDN", () => {
  test("Get invoice", async () => {
    const keypair = generateClientKeys();

    const request = sCDNCreditRequest(1);
    request.signAndGenerateId(keypair);

    const terms = await sCDNGetTerms(request);

    expect(terms.payment.kind).toBe(9734);
    const payment = new NEvent(terms.payment);
    payment.signAndGenerateId(keypair);

    const invoice = await sCDNGetInvoice(terms, payment);

    expect(invoice.status).toBe("OK");
  });
});
