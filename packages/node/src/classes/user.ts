import {
  NUserBase,
  UserBase,
  NewSignedZapRequest,
  UserZapRequestResponse,
  LnurlEndpointResponse,
  LnurlInvoiceResponse,
  isValidLnurlInvoiceResponse,
  isValidLnurlEndpointResponse,
  iNewUserZapRequest,
  iNewZAPRequest,
  encodeLnurl,
} from "@nostr-ts/common";
import { makeRequest } from "../utils/make-request";

export class NUser extends NUserBase {
  constructor(data?: UserBase) {
    super(data);
  }

  /**
   * Make a zap request to get lightning invoice
   * 1. Fetch callback url and spec
   * 2. Create new, signed ZAP request
   * 3. Fetch invoice from ZAP request
   * @param opts
   * @param keypair
   * @returns
   */
  public async makeZapRequest(
    opts: iNewUserZapRequest,
    keypair
  ): Promise<UserZapRequestResponse> {
    const lud = this.getLud16Or06Url();

    if (lud) {
      try {
        if (!this.hasZapInfo()) {
          const info = (await makeRequest(lud.url)) as LnurlEndpointResponse;
          if (!isValidLnurlEndpointResponse(info)) {
            throw new Error(
              `Lnurl endpoint does not allow Nostr payments. Expected to find 'allowsNostr' in response.`
            );
          }
          this.lightningZapInfo = info;
        }
        console.log("LnurlEndpointResponse", this.lightningZapInfo);

        const reqSigned: iNewZAPRequest = {
          ...opts,
          recipientPubkey: this.pubkey,
          lnurl:
            lud.type === "lud16"
              ? encodeLnurl(this.getLud16())
              : this.getLud06(),
        };

        // Make the zap request
        const req = NewSignedZapRequest(
          reqSigned,
          this.lightningZapInfo.callback,
          keypair
        );

        // Fetch the invoice
        const inv = (await makeRequest(req.invoiceUrl)) as LnurlInvoiceResponse;
        if (!isValidLnurlInvoiceResponse(reqSigned, inv)) {
          throw new Error(
            `Lnurl invoice response is invalid or does not match your request.`
          );
        }

        console.log("LnurlInvoiceResponse", inv);

        return {
          ...inv,
          event: req.event,
        };
      } catch (error) {
        throw new Error(`Error making zap request: ${error}`);
      }
    } else {
      throw new Error("No lud16 or lud06 url found");
    }
  }

  public async makeNIP05Request() {
    const nip05Url = this.getNip05Url();

    if (nip05Url) {
      try {
        const res = await makeRequest(nip05Url);
        return res;
      } catch (error) {
        throw new Error(`Error making NIP05 request: ${error}`);
      }
    } else {
      throw new Error("No nip05 url found");
    }
  }
}
