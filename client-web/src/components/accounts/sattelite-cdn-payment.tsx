import {
  InputGroup,
  InputLeftAddon,
  Input,
  Button,
  Box,
  useToast,
  Text,
  ButtonGroup,
  InputRightAddon,
} from "@chakra-ui/react";
import { NEvent } from "@nostr-ts/common";
import {
  SCDNTerms,
  SCDNInvoice,
  sCDNCreditRequest,
  sCDNGetTerms,
  sCDNGetInvoice,
} from "@nostr-ts/web";
import { useState } from "react";
import { useNClient } from "../../state/client";
import { toastErrorContent, toastSuccessContent } from "../../lib/toast";
import { QRCodeSVG } from "qrcode.react";

export interface SatteliteCDNAddCreditProps {
  onCancel: () => void;
  onComplete: () => void;
}

export function SatteliteCDNAddCredit({
  onCancel,
  onComplete,
}: SatteliteCDNAddCreditProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  /**
   * The following 4 are for credit purchases
   * Amount of credits to buy
   */
  const [amountToBuy, setAmountToBuy] = useState<number>(5);
  /**
   * Terms for the amount of credits
   */
  const [terms, setTerms] = useState<SCDNTerms>();
  /**
   * Invoice to pay with LN wallet
   */
  const [invoice, setInvoice] = useState<SCDNInvoice>();
  /**
   * Step
   */
  const [step, setStep] = useState<"req" | "terms" | "invoice">("req");

  const toast = useToast();

  /**
   * Get terms for the amount of credits
   */
  const getTerms = async () => {
    if (amountToBuy < 0.1) {
      toast(toastErrorContent(new Error("Cannot buy a negative amount.")));
      return;
    }
    setIsLoading(true);
    const req = sCDNCreditRequest(amountToBuy);
    try {
      const signedReq = await useNClient.getState().signEvent(req);
      const terms = await sCDNGetTerms(signedReq);
      setTerms(terms);
      setStep("terms");
    } catch (err) {
      toast(toastErrorContent(err as Error, `Couldn't get terms.`));
    }
    setIsLoading(false);
  };

  /**
   * Accept the terms and get the invoice to pay with LN wallet
   */
  const acceptTerms = async () => {
    if (!terms?.payment) return;
    setIsLoading(true);
    const req = new NEvent(terms?.payment);

    try {
      const signedReq = await useNClient.getState().signEvent(req);
      const invoice = await sCDNGetInvoice(terms, signedReq);
      setInvoice(invoice);
      setStep("invoice");
      toast(
        toastSuccessContent("Scan the invoice with your LN wallet to pay.")
      );
    } catch (err) {
      toast(toastErrorContent(err as Error, `Couldn't get invoice.`));
    }
    setIsLoading(false);
  };

  const paymentDone = () => {
    toast(
      toastSuccessContent(
        "It may take a minute or so, for the payment to be reflected."
      )
    );
    onComplete();
  };

  return (
    <>
      {step === "req" && (
        <Box>
          <InputGroup>
            <InputLeftAddon children="GB" />
            <Input
              placeholder="Enter amount to buy"
              type="number"
              value={amountToBuy}
              onChange={(e) => setAmountToBuy(Number(e.target.value))}
            />
            <InputRightAddon
              children={`~ $${(
                Math.round(amountToBuy * 0.05 * 100) / 100
              ).toFixed(2)}`}
            />
          </InputGroup>
          <Text fontSize={12} mb={1} mt={1}>
            Storage space on the CDN is pre-paid at a flat rate of $0.05 USD per
            gigabyte per month. Data transfer (aka "bandwidth") is free and
            unlimited.
          </Text>
          <ButtonGroup>
            <Button onClick={onCancel} variant="outline" isLoading={isLoading}>
              Cancel
            </Button>
            <Button onClick={getTerms} variant="solid" isLoading={isLoading}>
              Proceed
            </Button>
          </ButtonGroup>
        </Box>
      )}
      {step === "terms" && terms && (
        <Box>
          <Text>{terms.payment.content}</Text>
          <Text>${terms.rateFiat.usd} / GB / Month</Text>
          <Text>
            Total: {terms.amount / 1000} sats ( $
            {terms.rateFiat.usd * amountToBuy})
          </Text>
          <Button mt={3} onClick={acceptTerms} colorScheme="green">
            Accept Terms & Get Invoice
          </Button>
        </Box>
      )}
      {step === "invoice" && invoice && (
        <Box>
          <Text>Invoice</Text>
          <Text>Scan and pay with your Lightning Wallet</Text>
          <Box p={4} background="#fff" width={330} mt={2} mb={2}>
            <QRCodeSVG value={invoice.pr} size={300} />
          </Box>
          <Input value={invoice.pr} />
          <Text>Status: {invoice.status}</Text>
          <Button onClick={paymentDone}>Payment done</Button>
        </Box>
      )}
    </>
  );
}
